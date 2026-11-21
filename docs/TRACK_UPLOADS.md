# Track upload progress and retries

The shared producer/admin track editor reports browser-to-server upload bytes, then shows server stages: checking files, creating the cropped preview, storing assets and saving track details. Server work stays indeterminate; reaching 100% transferred does not mean the track is saved. Metadata-only updates skip media stages.

Failures retain selected files and form values in the open editor. Temporary server/network errors offer Retry upload; validation errors require reviewing the message. Keep the editor open until completion. There is no durable background queue, resumable byte transfer or restoration after a page reload.

## Response contract

The editor requests `Accept: application/x-ndjson`. Auth and role checks run before opening the response stream. The stream sends newline-delimited `progress` frames with a known stage, periodic `heartbeat` frames and one terminal `result` frame containing the operation's HTTP status and JSON body. The client uses the terminal status to handle errors, even though the stream itself has already started with HTTP 200. An interrupted stream without a terminal result is an error, never a successful save. Clients without this Accept header retain ordinary JSON responses and HTTP statuses.

Progress frames contain stage names, not media URLs or credentials. Streaming responses disable caching, transformation and proxy buffering where supported. Hosting must allow incremental responses; a buffering host can delay visible stages until completion. No hosting settings were changed for this feature.

## Recovering an interrupted save

The editor sends a UUID v4 `X-Upload-Request-Id`. Unchanged form values and the same selected file objects reuse that identity while the editor remains open. Changing details or selecting another file starts a new submission. Retry unchanged first if the response was lost after saving.

For creates, an actor-scoped hash produces the track's `_id`, using MongoDB's existing unique index to prevent duplicate unchanged submissions across instances. For updates, a hidden `lastUploadRequestId` marker allows a committed save to be recovered before an outdated version causes a conflict. Access checks still apply to every retry. Ordinary edits retain version conflict protection. No new database index or migration is required.

Cancellation stops browser transfer and progress display; server work already underway may finish. Retrying the unchanged submission recovers an already saved result. Retry re-sends the files when the save did not commit; it does not resume from the last uploaded byte.

## Local verification

- `npm run test:uploads`: split frames, stages before completion, terminal errors, incomplete responses, cancellation and submission identities using a fake transport.
- `npm run test:media`: actual local preview encoding, stage ordering, cleanup on encoding failure and original-byte preservation, plus media access/security checks.
- `npm run check` and `NEXT_DIST_DIR=.next-qa npm run build`: lint, types and production build.

These checks do not upload to the real bucket, write to the live database or verify deployment proxy behavior.
