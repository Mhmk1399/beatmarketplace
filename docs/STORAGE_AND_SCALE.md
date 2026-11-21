# Storage and catalog capacity

## Cover rendering

Beat covers and category/mood/instrument thumbnails share `components/ui/CoverImage.tsx`. Its Next Image always fills a positioned parent with `object-fit: cover` and a centered focal position. The parent owns responsive geometry and clipping; it must have a stable aspect ratio or explicit size. Portrait, landscape and square uploads fill the same frame without stretching or letterbox bands. Some edges are cropped according to the frame ratio; an explicit `position` prop can retain an intentional focal point. A missing/failed image keeps a theme-derived placeholder inside the same bounds.

The marketplace, producer beat catalog, home carousels, ordinary beat cards, search and mood/instrument directories use this primitive. Text overlays retain their existing bottom gradient. Animated genre artwork has a small clipped overscan so rotation and vertical movement never expose the card background. The marketplace uses one sharp cover image per card instead of a contained image plus a duplicated blurred background. This policy applies to existing stored images as well as new uploads; it requires no asset rewrite. Storage preparation below handles validation, orientation, WebP conversion and size limits. It preserves the full beat artwork so responsive frames can crop it at display time. Square artwork is recommended in the upload form, but other source proportions remain accepted.

## Implemented boundaries

The app supports a private S3-compatible object store and a development/local-volume adapter. Files are stored separately from MongoDB. Public APIs return allowlisted metadata; original masters remain accessible only through paid buyer entitlements.

Uploads stream through a multipart parser into randomly named private temporary files. Actual received bytes are checked independently of Content-Length: 70 MB total, 60 MB WAV master, 5 MB artwork, one 32 KB data field, at most two files, and a two-minute upload deadline. Failed/aborted requests remove temporary files. A per-process admission limit defaults to two in-flight uploads and returns HTTP 429 with Retry-After when full, rather than queuing arbitrary work in RAM.

WAV validation reads fixed-sized headers, validates the frame layout/duration and bounds the number of metadata chunks. Preview generation streams exactly the selected 30 seconds from the staged file. The entire original is never loaded into one Buffer in an upload or HTTP delivery path. The compatibility readStoredAsset helper is bounded and reserved for tooling; routes use streamed delivery.

All new images (beat covers, category thumbnails/banners and profile avatars) are WebP strictly below 800,000 bytes before entering storage. The browser accepts PNG/JPEG/WebP sources up to 20 MiB / 50 megapixels and prepares them immediately after selection with a lazy worker, a single active conversion and at most six quality/size passes. It preserves aspect ratio and transparency, applies orientation, and limits the longest edge to 2048px (1600px on constrained devices). No original image is sent on conversion failure. The server retains its 5 MiB request-image limit and independently decodes/validates images (16 megapixels maximum), strips metadata, and applies role-specific dimensions: covers 2048px maximum, avatars 512×512, category thumbnails 600×600 and banners 1920×720. Valid, metadata-free WebP files already within their bounds are reused without another lossy encoding; other files use bounded Sharp encoding before S3 upload. Existing stored assets are unaffected.

New local files and object-store keys use two levels of UUID-based prefixes. Existing flat local media stays readable. Stored asset references preserve provider/bucket/physical key; purchased orders retain the exact original reference when tracks are replaced. Changing the active object-store endpoint, bucket credentials or prefix is an explicit migration: retain old referenced objects and access until migration is verified. Do not change settings as a substitute for copying objects.

Producer studio banners use the same image optimizer and private storage adapter. They retain their aspect ratio within a 2048px longest edge and stay below 800,000 bytes so the selected focal point can be applied on the public page. Banner files and page settings commit in one version-checked profile update; failed/conflicting writes remove newly uploaded objects, while successful replacement/removal deletes the obsolete banner. Public producer avatar/banner delivery checks an active producer account and returns no physical bucket references in public profile JSON. Directory pagination bounds each response to at most 24 producers and batches public beat counts instead of querying per card.

## Configure object storage

Database connections are reused per server process with a bounded 20-connection pool, one warm connection, four concurrent handshakes, a 10-second queue deadline and a 20-second socket deadline. Panel navigation disables speculative route prefetching to avoid querying every authenticated section when a dashboard first opens. These bounds complement indexed cursor queries; additional application replicas each have their own pool and must fit the database's connection limit.

The selected deployment target is S3-compatible storage (AWS S3, MinIO or Liara). Set these environment variables outside source control, using the endpoint and region returned by your chosen provider:

```dotenv
MEDIA_STORAGE_DRIVER=s3
MEDIA_S3_PROVIDER=S3
MEDIA_S3_BUCKET=your-private-bucket
MEDIA_S3_REGION=us-east-1
MEDIA_S3_ENDPOINT=https://YOUR_PRIVATE_STORAGE_ENDPOINT
MEDIA_S3_ACCESS_KEY_ID=...
MEDIA_S3_SECRET_ACCESS_KEY=...
MEDIA_S3_PREFIX=beatmarket
MEDIA_S3_FORCE_PATH_STYLE=false
MEDIA_S3_DELIVERY_MODE=redirect
MEDIA_UPLOAD_CONCURRENCY=2
```

`MEDIA_S3_PREFIX=beatmarket` places every new project upload under `beatmarket/`, including masters, previews, covers, category images, avatars and infrastructure diagnostics. This is also the default when the variable is absent. `NEXT_PUBLIC_ASSET_BASE_URL` does not control upload locations. Existing database asset references retain their stored physical keys; changing the prefix alone does not relocate existing objects.

For AWS, use provider S3 and the actual AWS region; omit the endpoint to use AWS's standard endpoint. MinIO commonly needs `MEDIA_S3_FORCE_PATH_STYLE=true` and its configured region. For Liara, copy the private bucket's endpoint, access keys and region from your account; do not invent an endpoint or put credentials in the browser. R2 remains supported by setting provider R2, region auto and its account endpoint. Production custom endpoints must use HTTPS. Selecting S3 with incomplete configuration fails; it never silently writes production files to a local disk. Local development continues using local storage until the selected private bucket is configured.

Multipart object uploads use 5 MB parts with at most two parallel parts and abort unfinished uploads on failure. Preview/artwork delivery first checks publication/ownership and may issue a private signed GET URL valid for 60 seconds. Purchased masters always stream through the authenticated order route, even in redirect mode; their bucket URLs are never returned to clients. Treat these temporary URLs as bearer access until they expire. Local delivery uses 64 KB streamed chunks, supports HEAD/byte ranges, and tears down the stream when the request is cancelled.

`MEDIA_S3_DELIVERY_MODE=proxy` is an explicit compatibility option when a provider endpoint cannot serve browser requests. It preserves the same authorization, private storage, HEAD and validated byte ranges, streams S3 responses with backpressure and a byte ceiling, and cancels upstream reads when the client disconnects. It consumes application-server bandwidth; use `redirect` with a working browser/CDN endpoint and CORS to offload delivery at scale. Configured-bucket QA on 2026-11-18 found browser user agents receiving 404 while server requests returned the correct object, so this workspace currently enables `proxy`. Do not change a bucket's privacy to work around browser delivery failures.

The bucket must remain private. Configure browser CORS for your exact application origin:

```json
[
  {
    "AllowedOrigins": ["https://your-app.example"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Accept-Ranges", "Content-Range", "Content-Length", "ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Use a bucket lifecycle rule to abort incomplete multipart uploads after a day. Do not apply a blanket expiration rule to originals: archived/replaced masters can still belong to paid orders. Back up MongoDB and the bucket together, enable object versioning where supported, and test restores. Cleanup after failed remote deletion needs operational reconciliation; no automatic process deletes potentially purchased originals.

Temporary staging needs enough local disk for the configured concurrency, input, preview and retry overhead. Containers need writable temporary space. Local-media production deployments also need a durable shared volume; multiple replicas should normally use object storage.

The hosting/reverse-proxy request limit must allow the application's 70 MB request envelope, and its upload timeout must accommodate the two-minute intake deadline. Deploy on a Node host that supports streaming request bodies and writable temporary files; a platform with a smaller fixed request-body limit requires a separate direct-upload/worker intake path.

## Catalog and database

Newest catalog pages use range cursors on (createdAt, _id), fetch only pageSize + 1 rows and avoid an exact whole-catalog count. The public UI keeps cursor history for Previous/Next. Offset pages remain available for price sorting and older clients, capped at page 1,000. Price sorting evaluates the active discount so sorting agrees with the payable price.

Deals start from the active-discount collection, then join available tracks and licenses, rather than scanning every published track for a promotion. Active status uses server UTC instants: start inclusive, end exclusive; no scheduled job is needed to end a sale. A single frontend ticker displays seconds and restores the base price locally when the campaign ends. Checkout always recalculates and validates the price/version, while an already-created payment order keeps its quoted amount.

Media keys, public newest/genre catalog order, producer catalog order, discount windows and producer campaign order have indexes. Database connections use a shared pool (maximum 20), bounded waiting and a 10-second query execution limit. Automatic production index creation is disabled. Apply declared indexes as a deployment/admin step:

```bash
npm run db:indexes
```

This additive script uses MONGODB_URI, creates declared indexes and never drops existing indexes. Run it in an environment that includes the tsx development tool before serving production traffic. A unique-index build may fail if pre-existing duplicates need review; the script does not silently delete records.

## What these changes establish

The isolated local QA database was populated with 5,000 old synthetic tracks sharing existing test media. One hundred cursor pages returned 2,400 unique track IDs in the correct order. A bounded 100-request test at concurrency eight returned 100 successes and zero errors (local development p50/p95 approximately 253/286 ms). A covered deep-cursor query examined 25 index keys; an equivalent offset examined 2,401. These are metadata-only local measurements, not production targets.

The one-off catalog benchmark script has been removed. Repeat capacity measurements against a controlled staging environment with its actual database, storage and deployment configuration.

Streaming, bounded requests/concurrency, object-store delivery, cursor pagination and indexes remove the earlier whole-file-in-memory and deep-default-page bottlenecks. Functional verification should cover real file streams, malformed/oversized multipart bodies, byte-exact previews, protected downloads, range responses and S3-compatible operations.

Capacity still depends on the actual database, bucket, network, temporary disk and replica count. Per-process admission control is not a distributed rate limiter or durable processing queue. Substring searches and computed price sorts can still require substantial database work; very large catalogs should use a dedicated search index and a measured pricing/search strategy. Distributed per-account quotas, persistent processing/retry jobs, observability, backup restore drills and production load tests remain deployment work. No live cloud credentials were supplied, so remote acceptance, provider limits and real production throughput are not certified here.

Official protocol references: [AWS multipart stream uploader](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-storage/), [R2 signed URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [MongoDB range pagination](https://www.mongodb.com/docs/manual/reference/method/cursor.skip/).
