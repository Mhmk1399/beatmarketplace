# Storage and catalog capacity

## Implemented boundaries

The app supports a private S3-compatible object store and a development/local-volume adapter. Files are stored separately from MongoDB. Public APIs return allowlisted metadata; original masters remain accessible only through paid buyer entitlements.

Uploads stream through a multipart parser into randomly named private temporary files. Actual received bytes are checked independently of Content-Length: 70 MB total, 60 MB WAV master, 5 MB artwork, one 32 KB data field, at most two files, and a two-minute upload deadline. Failed/aborted requests remove temporary files. A per-process admission limit defaults to two in-flight uploads and returns HTTP 429 with Retry-After when full, rather than queuing arbitrary work in RAM.

WAV validation reads fixed-sized headers, validates the frame layout/duration and bounds the number of metadata chunks. Preview generation streams exactly the selected 30 seconds from the staged file. The entire original is never loaded into one Buffer in an upload or HTTP delivery path. The compatibility readStoredAsset helper is bounded and reserved for tooling; routes use streamed delivery.

New local files and object-store keys use two levels of UUID-based prefixes. Existing flat local media stays readable. Stored asset references preserve provider/bucket/physical key; purchased orders retain the exact original reference when tracks are replaced. Changing the active object-store endpoint, bucket credentials or prefix is an explicit migration: retain old referenced objects and access until migration is verified. Do not change settings as a substitute for copying objects.

## Configure object storage

The selected deployment target is S3-compatible storage (AWS S3, MinIO or Liara). Set these environment variables outside source control, using the endpoint and region returned by your chosen provider:

```dotenv
MEDIA_STORAGE_DRIVER=s3
MEDIA_S3_PROVIDER=S3
MEDIA_S3_BUCKET=your-private-bucket
MEDIA_S3_REGION=us-east-1
MEDIA_S3_ENDPOINT=https://YOUR_PRIVATE_STORAGE_ENDPOINT
MEDIA_S3_ACCESS_KEY_ID=...
MEDIA_S3_SECRET_ACCESS_KEY=...
MEDIA_S3_PREFIX=media
MEDIA_S3_FORCE_PATH_STYLE=false
MEDIA_UPLOAD_CONCURRENCY=2
```

For AWS, use provider S3 and the actual AWS region; omit the endpoint to use AWS's standard endpoint. MinIO commonly needs `MEDIA_S3_FORCE_PATH_STYLE=true` and its configured region. For Liara, copy the private bucket's endpoint, access keys and region from your account; do not invent an endpoint or put credentials in the browser. R2 remains supported by setting provider R2, region auto and its account endpoint. Production custom endpoints must use HTTPS. Selecting S3 with incomplete configuration fails; it never silently writes production files to a local disk. Local development continues using local storage until the selected private bucket is configured.

Multipart object uploads use 5 MB parts with at most two parallel parts and abort unfinished uploads on failure. File delivery first checks publication/ownership or the paid order's buyer, then issues a private signed GET URL valid for 60 seconds. Downloads go directly to object storage, reducing application-server bandwidth. Treat these temporary URLs as bearer access until they expire. Local delivery uses 64 KB streamed chunks, supports HEAD/byte ranges, and tears down the stream when the request is cancelled.

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

A read-only benchmark is available as `npm run benchmark:catalog`. Configure `BENCHMARK_URL`, `BENCHMARK_REQUESTS` (default100, max1000), `BENCHMARK_CONCURRENCY` (default8, max16) and `BENCHMARK_PAGES` (default10, max100). Run it against a staging environment whose capacity you control. It never seeds records or uploads files.

Streaming, bounded requests/concurrency, object-store delivery, cursor pagination and indexes remove the earlier whole-file-in-memory and deep-default-page bottlenecks. Tests cover real file streams, malformed/oversized multipart bodies, byte-exact previews, protected downloads, range responses and mocked S3/R2 operations.

Capacity still depends on the actual database, bucket, network, temporary disk and replica count. Per-process admission control is not a distributed rate limiter or durable processing queue. Substring searches and computed price sorts can still require substantial database work; very large catalogs should use a dedicated search index and a measured pricing/search strategy. Distributed per-account quotas, persistent processing/retry jobs, observability, backup restore drills and production load tests remain deployment work. No live cloud credentials were supplied, so remote acceptance, provider limits and real production throughput are not certified here.

Official protocol references: [AWS multipart stream uploader](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-storage/), [R2 signed URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [MongoDB range pagination](https://www.mongodb.com/docs/manual/reference/method/cursor.skip/).
