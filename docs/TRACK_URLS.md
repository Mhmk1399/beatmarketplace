# Beat URLs and metadata

Public beat pages use `/tracks/<slug>`; IDs continue to identify tracks in APIs, analytics, favorites, orders, licenses and SWR keys. `lib/marketplace/track-url.ts` owns slug normalization, route-segment parsing and `trackHref()`. Internal links, search, the global player, cart, sharing and workspace links use this helper.

English names become lowercase words separated by hyphens, for example `New Beat – A New Style Of Music (1988)` becomes `new-beat-a-new-style-of-music-1988`. Persian letters remain Persian. Arabic Yeh/Kaf variants and digit variants normalize consistently, vowel marks are removed, and punctuation/spaces/zero-width joiners become separators. For example `بیت بی‌کلام شب` becomes `بیت-بی-کلام-شب`. Empty/symbol-only names fall back to `beat`; ObjectId-looking names receive `-beat` to preserve legacy ID routing. Length is bounded without leaving a broken UTF-16 surrogate.

Links encode the segment exactly once. This installed Next version can supply an encoded `params.id` to page rendering, so `parseTrackReference` safely decodes once before validation, lookup and canonical comparison. Malformed escapes, encoded slashes, double encoding and control characters are rejected. Metadata and page rendering accept both the normal decoded form and the framework's encoded form. The existing `[id]` route folder accepts both slugs and old IDs; the parameter name does not dictate the public URL format.

## Ownership and name changes

`Track.slug` retains its existing unique index. `TrackRoute` reserves canonical names and former names under a unique string `_id`, referencing the immutable track ID. An indexed `trackId` supports maintenance. The first available name uses the bare normalized title. Duplicate titles receive a short random eight-character suffix, protected by database uniqueness and bounded retry. These suffixes are disambiguators, not track IDs.

`saveTrackWithSlug` commits a changed title, canonical slug and aliases in one Mongo transaction. A failed save rolls back URL reservations. Unchanged-title edits keep the existing address and ordinary save behavior. Both admin and producer create/edit flows use this owner. A name cannot be reassigned to another beat while it remains reserved as a former address. Archived/deleted/unavailable beats do not become public just because their route remains reserved.

Legacy ID URLs and former-name URLs redirect to the current canonical URL through Next's `permanentRedirect`; in a streaming response Next can express this as a refresh directive instead of an HTTP 308. An open detail page also replaces its URL and refreshes server metadata after its cached track data receives a new slug. Playback retains the same global track ID. Stored cart/player links from older versions continue to resolve through redirects.

## Metadata and visibility

`resolveTrackPage` performs an indexed lookup and a bounded active-producer lookup in the same Mongo aggregation. React `cache()` shares the result between `generateMetadata` and page rendering within a request. Former names require an additional indexed route lookup. This is not a shared private-data cache.

Page title uses the actual beat title and the global brand template. Description, canonical URL, Open Graph and Twitter metadata use allowlisted display fields and public artwork. `APP_URL` supplies the public metadata origin, matching the established payment-return configuration; configure the actual site origin before deployment. The page has no master/stem fields in its server projection. Only published/public tracks from active producer accounts are indexed. Private or archived previews retain the existing API rule: the authenticated active owner can view them with `noindex,nofollow`; other visitors receive 404 without the private title or artwork. Missing records also return 404. The existing exact first-screen skeleton is reused while server route resolution loads.

## Existing records and imports

Run the migration before deploying links to an existing catalog:

```powershell
npm run db:slugs
```

It first streams a snapshot of IDs, titles, old slugs, versions and timestamps to `.data/track-slugs/*-before.jsonl`. It reserves every previous name before assigning new names. Updates are transactional and guarded against concurrent edits. Only the `slug` field changes in existing tracks; IDs, versions, timestamps, media, prices, licenses and relationships remain intact. Batches and cursor reads bound memory use. It reports skipped concurrent edits; rerun if any are reported. Partial runs remain safe to resume because old names are reserved before changes and repeated runs preserve assigned suffixes.

`npm run db:indexes` includes the route index. Programmatic title changes should use `saveTrackWithSlug`; direct collection writes and bulk imports bypass that owner and must be followed by a reviewed `db:slugs` run before publishing. Keep migration snapshots in protected operational storage if they must survive workspace cleanup.
