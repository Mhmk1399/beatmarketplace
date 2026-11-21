# Preview delivery setup and acceptance

This repository can prepare and validate delivery. It does not create a CDN, change DNS/bucket permissions, deploy hosting, or operate a physical phone.

## Keep the working default

Use `.env.example` as a reference; preserve real environment settings already present. `MEDIA_PREVIEW_DELIVERY=cache` keeps publication/ownership checks, a bounded server preview cache and browser ETag revalidation. It needs no external dashboard change. Purchased originals always stay on the paid buyer download route.

The server needs writable private temporary space and permission to run the bundled FFmpeg executable. Install dependencies with scripts enabled for the deployment operating system/architecture. The production trace includes FFmpeg for upload and low-data preview routes. A maintained executable can also be selected with `FFMPEG_PATH`.

## Optional CDN activation

Once the real audio host is available, set these in the hosting environment:

```dotenv
MEDIA_PREVIEW_DELIVERY=cdn
MEDIA_PREVIEW_CDN_BASE_URL=https://YOUR_AUDIO_HOST.example/
```

The base is the bucket root, not the project prefix. For a stored key `beatmarket/ab/cd/UUID.preview.mp3`, that root produces `https://YOUR_AUDIO_HOST.example/beatmarket/ab/cd/UUID.preview.mp3`. Never include credentials, a query, fragment or the repeated `beatmarket/` prefix in the base. Invalid modes/addresses fail validation instead of silently enabling another mode.

Only published public standard MP3 previews redirect. Data-saver copies and private/draft previews remain on application delivery. Masters are never built into CDN URLs by the app.

Use `config/preview-cors.example.json` as a provider-compatible CORS reference, replacing the application origin. The audio host must support browser GET/HEAD, byte ranges and the actual application's origin. If caching previews at the edge, configure a preview-only cache rule; start with a short lifetime such as 60 seconds and verify unpublishing/revocation behavior. Exclude masters from public CDN routes. Edge cache lifetime and bucket permissions are separate from CORS.

Do not switch the live environment to `cdn` until these provider-side settings are in place. Returning to `MEDIA_PREVIEW_DELIVERY=cache` restores the application delivery path. The repository-only work does not apply these settings externally.

## Read-only deployment preflight

```bash
npm run audio:verify -- --url https://YOUR_APPLICATION_ORIGIN.example --output .data/audio-delivery-report.json
```

The command reads one public catalog page, follows only unsigned preview redirects, and checks MP3 ranges, cross-origin browser access, 96 kbps delivery, conditional reuse and anonymous order-download denial. It performs no upload, purchase, database mutation or bucket administration. Reports omit file addresses and credentials. A local app or test fixture can use HTTP on localhost; external targets require HTTPS.

Failures return a nonzero exit code. A public audio host returning `private` or `no-store` produces a cache-policy warning rather than falsely claiming that edge caching works. This HTTP preflight does not prove browser decoding or physical-device performance. A published MP3 preview must exist for full acceptance.

`--output` creates a new report and refuses to overwrite an existing file. Choose a new report filename for each acceptance run.

## Real-device listening check

Open **Admin → System → Listening check on this device** on the intended device. The control uses the existing global player, never a second audio element. Select Data saver before starting, then tap **Test preview** or **Test demo**.

The check records tap-to-first-playing, buffering pause count/time, observation time and the audio position reached. Startup loading is counted separately from buffering after playback starts. It stops on track completion, manual interruption or after a 30-second observation; a startup that exceeds 25 seconds is reported as failed. If buffering occurs, a 30-second observation may contain less than 30 seconds of music; the position metric makes that visible.

Download results to save a JSON report on the device. Browser and reported network type are included; account data, cookies, file addresses and credentials are excluded. Nothing is uploaded automatically. Repeat listens can use warm browser/server caches, so record cold/repeat conditions separately.

Physical Android/Chrome and iPhone/Safari acceptance still needs the deployed URL and those devices. Follow `docs/MOBILE_AUDIO_ACCEPTANCE.md` for the full checklist; local emulation must not be described as a real-phone test.

## Repository verification

```bash
npm run test:audio-checks
npm run test:media
npm run check
npm run build
```

The delivery-check tests use local HTTP fixtures and fake audio bytes. They do not access the real bucket or a deployed site. They exercise CORS/range behavior, unsafe master redirects, anonymous download protection and measurement calculations. The media tests preserve the existing original/preview security checks with local media and mocked storage.
