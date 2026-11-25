# Preview and purchased music delivery

Updated 2026-11-21.

## Upload and playback

Producers upload the original uncompressed WAV (maximum 60 MB) and choose a 30-second section. The server validates the WAV structure, crops only that section into a private temporary file, removes source metadata, and encodes it as a 128 kbps stereo 44.1 kHz MP3. Only this already-cropped WAV is passed to FFmpeg. A preview is bounded to 600,000 bytes; the playable window remains 30 seconds (MP3 containers may report a small amount of encoder padding).

The original WAV is stored byte for byte, without conversion. Failed preparation or a failed database save cleans up newly created media. Purchased order snapshots retain their original master when the producer later replaces a track.

Every marketplace surface uses `marketplaceAudioTrack()` and the shared global audio player. Public URLs are derived from validated asset roles. The media route accepts independent previews and artwork. Requests for a `.master.wav` URL return 404, and private or draft previews require the producer or an administrator. Homepage previews use these same track media routes.

## Purchased originals

`GET` and `HEAD /api/orders/:id/download?item=N` resolve the active account from its current database session, require that account to own the paid order, and select the exact purchased master snapshot. Other buyers, producers, unauthenticated requests and unpaid orders cannot obtain that original. Callback parameters alone never unlock a download: the existing payment gateway verification still controls the paid state.

Originals always stream through the authenticated download route, including when preview delivery uses S3 redirects. The response has attachment disposition, private/no-store caching, same-origin resource policy and byte-range support. Preview caching never applies to purchased originals. No signed bucket URL, storage key, bucket name or master reference is included in catalog/order JSON. Streaming does not buffer a complete master into server memory.

Anything sent to an authorized browser, including a purchased original, is observable in its Network tab and can be saved. Preview audio can also be recorded. The boundary is that visitors only receive the separate compressed section; the original is never requested during ordinary catalog listening. This is access control, not DRM.

## Public bucket mode and its limits

The owner explicitly chose to keep the configured bucket public on 2026-11-21. The application therefore does not change bucket permissions or block uploads/checkout based on anonymous bucket access. Original keys use unpredictable UUIDs, and only server-side asset records and paid order snapshots retain their bucket locations. No full-file location is sent to catalog pages, players, order JSON, or upload/edit responses; purchased downloads stream through the app without a bucket redirect.

An acceptance check confirmed an unsigned request to a known original URL returns the actual WAV bytes. This is the expected behavior of a public bucket: a leaked full-file URL bypasses application authentication. Hiding the URL is not equivalent to private storage. Bucket listings, public CDN/search exposure, provider logs and third-party sharing must not reveal original keys. A private bucket remains the stronger option if the owner later needs storage-enforced access; the application's proxy delivery works with either setting. The connected object-storage credentials cannot administer bucket ACL/policy settings (403).

## API protections

- Authenticated mutations reject cross-site Fetch Metadata and mismatched Origin headers. Login, registration and logout apply the same policy independently. Preview requests and purchased downloads reject cross-site origins too. Non-browser clients without Origin remain supported; these checks supplement authentication.
- Login, registration and checkout parse bounded streamed JSON, including bodies without Content-Length. Existing multipart limits and upload admission control remain enforced.
- Shared MongoDB quotas limit login attempts to 10/email/15 minutes, registrations to 3/email/hour, producer upload/edit requests to 20/account/hour, checkout to 10/account/minute, and purchased downloads to 60/account/minute. Quota identities are HMAC hashes and atomic updates enforce limits across application instances. Rejected requests return 429 with Retry-After. Fixed windows permit a burst across a boundary; limits are not global bot protection.
- Malformed session-cookie encoding is treated as unauthenticated. Current roles/status and session version still come from MongoDB; clients cannot promote themselves or make an order paid.
- Configure additional network/WAF limits for broad anonymous traffic and account creation. These application quotas do not replace perimeter capacity protection.

Run `npm run db:indexes` during deployment to create the new `ApiRateLimit` expiry index. The `_id` uniqueness used by its atomic gate exists automatically; TTL cleanup needs the declared index.

## Encoder and existing catalog

Install dependencies with scripts enabled on the target operating system/architecture. `ffmpeg-static` supplies the server encoder; optionally set `FFMPEG_PATH` to a maintained FFmpeg executable with `libmp3lame`. Production route traces include the encoder binary. The Node host must support child processes and writable private temporary storage. The encoder runs without a shell, without network input, with one thread, bounded stderr and a 60-second deadline. Upload concurrency remains bounded.

`npm run db:previews` lists existing WAV previews without writes. `npm run db:previews -- --apply` regenerates them as MP3 from their saved original and selected start point. It compares each document version before changing its preview, preserves master/order/artwork records and retains the previous cropped object for rollback. The old application preview URL stops resolving once its database reference changes. Legacy WAV previews remain role-separated and valid during rollout; editing one through Studio/Admin upgrades it automatically.

Run `npm run test:media`, `npm run check` and `npm run build`. Integration acceptance should also verify: the chosen bucket privacy behavior, untrusted application access failures, preview-only DTOs, paid buyer ownership, byte-identical downloads, range/HEAD behavior, private preview ownership, retained purchase snapshots after unpublishing and concurrent quota enforcement. No real payment should be invented to test these paths; use disposable sandbox fixtures and remove them afterward.

## Reference behavior

BeatStars documents separate master and preview files and automatic preview generation from an uploaded WAV: [Beat Uploads FAQ](https://help.beatstars.com/hc/en-us/articles/30898152472475-Beat-Uploads-FAQ). This implementation follows that separation, with this app's existing 30-second preview policy and a lower listening bitrate; it does not claim identical BeatStars infrastructure, DRM, watermarking or file specifications.


## Listening performance (2026-11-21)

MP3 previews use a per-process 32 MB LRU cache, capped at 128 entries, with bounded single-flight fills. Only independent MP3 previews of at most 600 KB are admitted; masters and artwork never enter it. New uploads warm the standard preview cache. A cache miss retrieves and validates the bounded preview before serving it; a warm request avoids another bucket transfer. Publication/producer/owner checks run before every cache access or conditional response, so hiding a track or switching accounts cannot bypass access with an old ETag.

Preview responses use `Cache-Control: private, no-cache`, representation-specific strong ETags and byte ranges. A browser may retain bytes but must revalidate access before reuse. Valid If-None-Match returns 304 only after authorization. A mismatched If-Range returns the complete current representation instead of combining bytes from different quality versions. Diagnostic response headers identify cache HIT/MISS and audio bitrate. This cache is an optimization, not a shared or durable store; each app process warms independently.

Data saver requests use `?quality=low`. A 96 kbps derivative is generated from the already-independent 30-second preview, never from a full master or a caller-supplied source. It is cached within the same memory bound. Standard 128 kbps remains the default, with explicit user switching and an initial preference for browsers requesting Save-Data. Preference persists locally; quality changes preserve the current position and paused/playing state. The smaller copy is lossy; no claim is made that 96 and 128 kbps sound identical.

`MEDIA_PREVIEW_DELIVERY=cdn` plus `MEDIA_PREVIEW_CDN_BASE_URL=https://your-audio-host/` enables optional direct edge delivery for published/public standard previews. The base is a bucket root; full stored preview keys are appended. Draft/private previews and data-saver derivatives stay on the authorized cache route. Masters are rejected by this URL builder and continue through paid download checks. Configure CORS for the actual application origin and verify byte ranges before enabling it. CDN caches need preview-only policies; their TTL affects how long a previously public preview remains available after unpublishing. No external CDN has been provisioned automatically.

The configured internal object-store URL failed browser fetch tests while the public asset domain worked. Small-range tests returned roughly 0.36 seconds from a warm authorized cache versus 0.45–0.67 seconds directly from the public storage domain, so cached delivery remains the default. Cold cache fills include bucket transfer time. These local diagnostic measurements are not deployment capacity guarantees.

The five public demo samples use independently cropped 30-second MP3 files at 128 and 96 kbps. The app serves their private bucket objects by named `HomeMedia` slots and checks the media role, duration and file size. `npm run audio:demos` writes replacement previews to private local storage. Demo metadata has no download URL for the original recording.

The dock and expanded player show loading, buffering, offline and retry states. After eight seconds of continuous waiting they suggest lower-data audio; after 25 seconds they stop showing an indefinite spinner and offer retry. Reconnection never silently starts playback. Physical-device and live-network acceptance remains separate from desktop mobile emulation.
