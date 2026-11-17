# BeatMarketplace

A Next.js / React marketplace for original beats, backed by MongoDB. The existing graphite and purple clay/neumorphic interface is shared across the storefront, buyer dashboard, Producer Studio and Admin.

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env.local`, configure MongoDB and a random JWT secret.
3. Start MongoDB, then run `npm run dev`.
4. Open http://localhost:3000, create an account and open your dashboard.
5. Use **Open producer studio** to onboard, upload a WAV, choose a 30-second section, add artwork and publish. Add a license under **Contracts** to make it purchasable.

An administrator must create an active genre before publishing. There is no public admin-role assignment route. Assign `ADMIN` to the intended existing account through your trusted database administration process. Creating an admin account or promoting existing users is never done automatically.

## Implemented

- Account registration/login, HTTP-only cookie sessions, current database role checks.
- Producer onboarding and track upload/edit/draft/publish/archive.
- Server-created, independent **exactly 30-second WAV previews**, starting at the producer's chosen position. The original master is never served by the public media route.
- Real catalog at `/marketplace`, search by title/producer/tags, genre/BPM/key filters, price sorting and pagination.
- Track details and license comparison, persistent shared preview player, account-based saved beats.
- Global music dock with queue, seek, next/previous, skip, volume, shuffle/repeat and a complete mobile player. The homepage listening room uses the five supplied full-length MP3 demos and custom covers.
- Live frequency spectrum in the global player, plus one adaptive Three.js background shared by the full-viewport hero and horizontal listening carousel. Listening sessions show two cards on desktop and one on mobile, with native touch scrolling, seamless looping, soft edge masks and shared arrow controls. Demo favorites are stored in the browser and synchronized across hero/listening cards and tabs; marketplace favorites remain account-based.
- Admin-scheduled sponsored hero placements with real beat artwork, license prices and shared preview playback.
- License CRUD, versioning, usage limits and integer **toman (IRT)** prices.
- Device-local cart, server-side repricing/version checks, retry idempotency, immutable order/license/master snapshots.
- Configurable Zarinpal checkout, server verification and buyer-only complete WAV downloads after verified payment.
- Admin create/edit/activate/deactivate for genres, moods and instruments.
- Producer-owned, versioned per-track percentage discounts with UTC start/end, live countdowns, an active-offers page and server-checked order pricing.
- Streamed bounded media uploads/delivery, S3/R2-compatible private storage, cursor catalog pages and deployment-managed database indexes.

## Global theme

Change `app/theme.css` to change the entire design system: semantic colors, materials, shadows, radii, motion and focus. `app/globals.css` consumes these tokens. Reuse shared neumorphic controls and surfaces; feature components must not introduce local brand colors or incompatible materials. See [shared UI rules](components/ui/README.md).

## Audio and storage

The global player and Three.js integration are documented in [shared audio architecture](docs/AUDIO_PLAYER.md). Full-length public listening demos are separate from the protected marketplace previews.

The implemented uploader supports uncompressed PCM WAV (8/16/24/32-bit) and 32-bit IEEE float WAV, up to 60 MB, 30 seconds to 30 minutes. Artwork accepts PNG, JPEG or WebP up to 5 MB. A server parser validates the file and writes only the chosen audio frames into a separate 30-second preview, without copying ancillary source metadata.

Media lives under `.data/media` by default, outside `public/` and ignored by Git. Set `MEDIA_STORAGE_DIR` for a private durable local volume, or select the implemented S3-compatible adapter through `MEDIA_STORAGE_DRIVER=s3`. Uploads and local downloads stream with bounded memory; S3/R2 delivery uses authenticated short-lived signed URLs. Superseded masters remain available to purchased order snapshots. See [storage, deployment and capacity](docs/STORAGE_AND_SCALE.md) for credentials, CORS, indexes, limits and verification boundaries.

Run `npm run db:indexes` against the intended database during deployment to add the declared indexes, including `HeroPlacement`. This command creates indexes without dropping existing indexes or changing application records.

## Sponsored hero placements

The homepage currently uses the five local listening demos in `lib/audio/demo-tracks.ts` for visual and playback testing. They show full-length demo labels rather than sale prices. `Hero` passes them explicitly to `FeaturedBeats`; omitting the `demos` prop restores the administrator-selected sponsored deck. The hero fills one dynamic viewport behind the overlaid navigation, uses the same clay surfaces and shared buttons as the rest of the app, and centers its interactive ribbon on mobile.

Administrators manage bookings at `/admin/hero`: choose an eligible public beat, set its order, label and UTC schedule, and record an agreed whole-toman fee, manual payment status and reference. `PENDING` bookings stay private; active `PAID` or `COMPLIMENTARY` bookings appear within their scheduled window. These fields are bookkeeping only: the site does not charge for advertising or settle advertising fees.

`GET /api/hero` returns at most ten ordered, distinct eligible beats. Eligibility requires real artwork, a stored private master, an independently cropped 30-second preview, an active producer and a purchasable non-exclusive WAV-only license. The public response excludes master identifiers, fees and payment references. The carousel labels placements as sponsored, shows current license pricing, uses the persistent player and removes expired placements using the shared server-aligned clock. Automatic slides respect reduced motion and pause during focus, hover, hidden/offscreen states and playback of the selected beat. An empty schedule links to the catalog without inventing promotions or popularity metrics.

## Timed discounts

Producers manage individual track campaigns at `/studio/discounts`: percentage (1–90), start and end time, editing and cancellation. Campaigns can last up to 90 days. Local date inputs are converted to UTC instants. The same percentage applies to the track's eligible listed license prices, rounded half-up to whole toman.

Active campaigns appear on `/discounts` and ordinary beat cards with original/new price and a shared-timer countdown. Expiry restores the base price and removes the track from active offers. Cart terms must be reviewed again when a campaign starts/ends. Checkout independently validates effective price and campaign version; stored orders retain the exact quoted original price, saving and promotion snapshot even if payment completes later.

## Iranian payments

Configure these in `.env.local` (never commit real secrets):

```dotenv
APP_URL=http://localhost:3000
ZARINPAL_MERCHANT_ID=your-merchant-uuid
ZARINPAL_SANDBOX=true
```

Keep sandbox enabled while testing. Production needs a real merchant ID, public HTTPS `APP_URL`, and `ZARINPAL_SANDBOX=false`. Amounts are whole toman and requests explicitly use `currency: IRT`; the server verifies the stored order amount. Only verification codes 100/101 with a reference can transition the matched pending order to paid. Callback query strings never unlock downloads on their own. Sandbox orders are clearly marked as test orders.

If the merchant configuration is missing, checkout is disabled and the API returns 503 without creating a paid order. No real gateway transaction was performed during implementation. Settlement to producers, platform fees, refunds, financial reconciliation and exclusive-sale inventory require further implementation before operating a commercial marketplace.

## Verification

```bash
npm run check
npm test
npm run build
```

`npm test` compiles the relevant production TypeScript in memory and tests validation, exact WAV cropping and mocked gateway/checkout verification. It does not send money or need a database. Integration QA was separately performed against an isolated temporary MongoDB, never against the user's existing database. `NEXT_DIST_DIR=.next-qa` can isolate a QA build from a running development server.

## Scope and next stages

This is a working marketplace foundation, **not complete BeatStars feature parity**. Online checkout currently supports non-exclusive WAV licenses. Exclusive templates can be prepared but cannot be purchased online until exclusive inventory/reservations are implemented. MP3/stem delivery, playlists/follows, producer messaging, collaborator invitations/splits, coupons/bundles, seller subscriptions, offers, advanced analytics, notifications, scheduled publishing, profile/settings editors and user moderation remain future stages.

See [research and feature map](docs/BEATSTARS_RESEARCH.md), [current platform state](CURRENT_PLATFORM_STATE.md), and [model relationships](MODEL_TREE.md).
