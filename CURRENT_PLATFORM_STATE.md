# BeatMarketplace: Current Platform State

Reviewed 2026-11-18. Music-delivery security updated 2026-11-21; see [current delivery boundaries](docs/MEDIA_SECURITY.md). This document replaces the earlier shell-only snapshot.

## Working product flows

- Register/login -> buyer dashboard -> producer onboarding -> Producer Studio.
- Upload a private WAV and artwork -> choose a 30-second section -> draft/publish/archive.
- Publish -> create a versioned WAV license priced in integer toman -> discover/filter -> listen -> save -> select license -> cart.
- Configured Zarinpal request -> gateway callback -> server verification -> paid order -> buyer-only full WAV download.
- Admin creates/edits/deactivates genre, mood and instrument taxonomies.
- Producer schedules a per-track percentage discount -> public live-offers page and countdown -> server-repriced cart -> immutable discounted order.
- Admin selects an eligible beat -> records a scheduled sponsored booking and manual payment status -> homepage carousel displays current paid/complimentary placements.

The homepage includes a live catalog, a real listening room using the five supplied MP3 demos, a carousel currently showing the five local demos and a full-background Three.js ribbon scene. Pointer movement, touch and page scrolling control the background independently of audio. The global player shows a real audio spectrum in its compact dock and expanded sheet. Both use the shared graphite clay materials and controls; the play-button halo reacts to the shared audio analyser and stops when inactive or under reduced motion. Operational actions live in the marketplace and authenticated workspaces. No fake sales or populated marketplace records are introduced.

## Main routes

`DynamicFileInput` now supplies music/artwork/profile uploads throughout the workspaces, with native selection, drag/drop, local image previews, single-file/type/size validation and shared clay controls. `useFileUpload` measures multipart bytes through XHR, then displays an indeterminate preparation stage until the existing API finishes persistence and SWR invalidation. Failed attempts retain their file; avatars support retry. The beat editor shares one combined progress bar and preserves its local WAV audition/crop selection. Object URLs are released, progress updates are coalesced, animations honor reduced motion, and both document and modal content widths are checked on phones. Real configured-bucket QA exercised avatar persistence/retry and a throttled WAV upload with intermediate percentages and the selected 30-second preview.

Workspace tables use a document-lifetime SWR memory cache scoped by account, roles and canonical query URL. Revisits and cached pages/searches avoid another list query; Refresh and successful writes invalidate affected entries and fetch mounted tables immediately. Inactive pages stay invalidated until revisited. Failed writes preserve cached data, and SWR discards older in-flight responses after mutations. Related beat/license/offer/placement data is invalidated together. Cross-tab write notifications and authentication synchronization keep the same account's tabs aligned and retire previous account caches. No private table data is persisted to browser storage. See the shared UI documentation for `useWorkspaceData` and custom editor integration.

| Route | Behavior |
| --- | --- |
| `/` | Full-background interactive hero, sponsored carousel, listening room and live catalog |
| `/marketplace` | Search and filter published public tracks |
| `/discounts` | Currently active, purchasable discounted beats with live countdowns |
| `/tracks/[id]` | Real track details, 30-second preview and license options |
| `/cart` | Persistent device-local cart and configured gateway checkout |
| `/dashboard` | Buyer overview and producer onboarding |
| `/dashboard/favorites` | Account-based saved beats |
| `/dashboard/orders` | Payment status, immutable license terms and paid WAV downloads |
| `/studio` | Producer overview with live catalog counts |
| `/studio/tracks` | Upload/edit/select preview/publish/archive |
| `/studio/contracts` | License creation/editing/deactivation |
| `/studio/discounts` | Per-track percentage campaigns, scheduling, editing and cancellation |
| `/admin/genres`, `/admin/moods`, `/admin/instruments` | Taxonomy administration |
| `/admin/hero` | Sponsored booking schedule, ordering and manual fee/payment records |

The three workspaces now use database-backed overviews, responsive shared CRUD tables, forms and modals. `/admin/users` manages roles and account status; `/admin/beats` manages uploads; `/admin/contact` supports message creation, status editing and confirmed deletion. `/admin/settings` stores public contact details and `/admin/system` verifies MongoDB and S3 read/write/delete access. Producer and customer profiles, private avatar upload, password rotation, storefront editing, private collections and role-scoped orders/downloads are implemented. Financial summaries exclude sandbox purchases, and the original platform owner's admin access is protected. Lists are bounded and paginated; license editors search for tracks instead of downloading the full catalog.

`DynamicSelect` supplies the site-wide clay listbox, keyboard navigation and native form values; `DynamicMultiSelect` supplies bounded mood/instrument selection. Mobile text inputs use 16px text. `GlobalLoadingProvider`, `startGlobalLoading()` and `useGlobalLoading()` expose a centered frequency loader with a blurred backdrop. Request failures release the loader and preserve form values; unavailable account data shows Retry rather than an empty editor. Shared table rows become labeled cards on narrow screens, with image identities and view/edit/delete actions.

## API surface

- Existing `/api/auth/{register,login,logout,me}` and `/api/producers`.
- `GET/POST /api/tracks`, `GET/PATCH/DELETE /api/tracks/[id]`.
- `GET/POST /api/contracts`, `PATCH/DELETE /api/contracts/[id]`.
- `GET/POST /api/discounts`, `PATCH/DELETE /api/discounts/[id]` (producer-owned campaigns).
- `GET/POST /api/taxonomy`, `PATCH /api/taxonomy/[id]`.
- `GET /api/favorites`, `PUT/DELETE /api/favorites/[id]`.
- `GET /api/media/[key]` for preview/artwork only, with range support and publication/ownership checks.
- `GET/POST /api/orders`, `GET /api/orders/[id]/download?item=0`.
- `GET /api/payments/status`, `GET /api/payments/zarinpal/callback`.
- `GET /api/hero` for the current public sponsored deck and server time.
- `GET/POST /api/admin/hero`, `PATCH/DELETE /api/admin/hero/[id]` for admin-only booking management; deletion deactivates the booking.
- `GET/PATCH /api/account`, `PATCH /api/account/password`, `GET/PATCH /api/account/producer`, `POST /api/account/avatar` and authorized avatar delivery.
- Admin-only `/api/admin/users`, `/api/admin/tracks`, `/api/admin/contact` and their item routes; contact settings at `/api/admin/settings` and diagnostics at `/api/admin/system`.
- Role-scoped `GET /api/workspace/overview` and `/api/workspace/orders`; owner-only collection CRUD at `/api/collections` and `/api/collections/[id]`.

Public list queries are bounded and validated. `mine=1` uses current database roles; Studio mutations enforce ownership. Track DTOs allowlist fields and exclude storage internals, private masters and collaborator records. Disabled producers are excluded from public discovery/media/favorites.

## Theme and usability

`app/theme.css` is the global source for the graphite/purple palette, clay/neumorphic materials, shadows, shapes, focus and motion. `app/globals.css` and existing/new components consume its semantic tokens. Shared buttons/inputs/surfaces/modals/toasts provide consistent feedback and keyboard accessibility. Interfaces include honest loading, empty, error and retry states.

The public music experience extends this system with centralized glass materials, ambient artwork lighting, music navigation and explicit playing states. Track details place album artwork, live frequency analysis and a preview timeline ahead of the license comparison. Frequency rendering reads the single global audio analyser only for the matching track, with motion and visibility controls; navigation continues to use the persistent bottom player.

The full-viewport hero begins behind the overlaid navbar. One background canvas continues through the native listening carousel below it, with two desktop cards or one compact mobile card, seamless looping and shared arrow, keyboard, mouse-drag and touch navigation. Soft viewport masks fade edges. Demo favorite hearts synchronize between both sections and persist locally; real beat favorites retain their authenticated API. Its `--hero-*` materials alias the existing graphite clay theme; controls use the shared NeumorphicButton. The current homepage explicitly selects all five local demos, while the administrator-selected placement API remains available when the demos prop is omitted. `HeroBackdrop` covers the full section and loads `HeroBackdropScene` lazily, with low DPR and bounded 24/36 FPS tiers. The scene pauses offscreen, in hidden tabs, behind modal dialogs and under reduced motion; data saver and unavailable WebGL retain the SVG background. The compact mobile carousel supports native vertical scrolling, horizontal swiping, previous/next buttons and keyboard navigation. Its optional six-second rotation pauses on hover, focus, hidden/offscreen states and playback of its selected beat, and is disabled for reduced motion.

Public navigation uses a hamburger below 1100px, with cart access in the header and account/navigation links in a modal drawer. The drawer occupies the browser's top layer above the audio dock, contains keyboard focus and closes on links, history/hash changes or a desktop resize. Workspace drawers portal above the player and close on workspace changes and the 1024px desktop breakpoint. Closing either menu restores body scrolling and focus.

The fourth homepage section, `GenreExplorer`, shows eight style shortcuts in two rows: four columns on desktop, three on tablet and two on phones. Its bounded native carousel loops in both directions, advances one column automatically, supports touch/keyboard navigation and pauses during interaction. Motion stops for hover, focus, touch, hidden/offscreen states, open dialogs, reduced motion and data saver. Eight original SVG assets live in `public/assets/genres`. Materials remain global `--genre-*` theme aliases. Genre links open `/marketplace?genre=...`, retain their selection in catalog controls and filter the public API by active genre slugs (including common aliases). Unknown or inactive slugs return no beats. Cards show editorial descriptions instead of invented inventory totals.

The public `/about` page contains three independent server-rendered sections: `AboutHero`, `AboutWhatWeDo` and `AboutCommunity`. Their headphone, exploded vinyl and producer studio illustrations are original generated WebP assets in `public/assets/about`; generation prompts and asset provenance are recorded in `docs/assets/about-images.json`. Responsive layouts keep the reference section order, use shared clay controls and global `--about-*` material aliases, and draw decorative dotted ribbons in static SVG without an additional WebGL scene. Navigation and footer expose the page. Community highlights describe existing product capabilities instead of fabricated audience totals.

The public `/contact` page follows the responsive headphone, social and message-form layout. Public contact details are stored through Admin Settings in MongoDB and remain blank until official accounts are supplied; `lib/contact/settings.ts` is the fallback when no settings record is available. The original generated studio background is stored in `public/assets/contact/studio.webp`, with its prompt in `docs/assets/contact-images.json`; the headphone artwork is shared with About. `POST /api/contact` stores validated plain-text messages in MongoDB, returns a receipt only after persistence and uses UUID primary keys for safe retries. Requests have a 16 KiB streamed body limit, same-origin checks, a honeypot and an atomic MongoDB quota of five new submissions per email per UTC hour. Quota documents store hashed bucket keys and have a TTL cleanup index. `/admin/contact` and admin-only list/status APIs provide cursor pagination and version-checked NEW/READ/CLOSED status updates. No email notification is sent automatically. Deployment indexes include both new models through `npm run db:indexes`.

## Audio guarantee

`/marketplace` now uses `MarketplaceBrowser`: a compact vector ribbon header, desktop genre shelves with four playable beat cards per row, and mobile genre shortcuts plus a native looping discovery rail. Grid/list results, tempo bounds, exact musical key, mood, price ordering, favorites, license links and producer-selected previews remain functional. Filter state is bounded and shareable in the URL; searches debounce and abort obsolete requests. One bounded 32-track request supplies the shelves, rather than a request for every genre. Newest browsing uses cursor pagination; price ordering retains bounded offset pages. Taxonomy recovery is included in retry. Unavailable/empty unfiltered catalogs show explicitly labeled, non-sale listening demos; no inventory or popularity totals are invented. The live track API applies mood filtering to the indexed `metadata.moodIds` field alongside publication/visibility checks. Materials alias global `--market-*` tokens.

A single global `AudioPlayerProvider` owns playback across routes. The bottom dock supplies transport, seek, volume/mute, shuffle/repeat and queue controls; mobile has a compact dock and a complete expanded player. The five public test songs play at full length with custom SVG covers. Marketplace tracks remain capped to their independently generated 30-second preview. See [audio architecture](docs/AUDIO_PLAYER.md).

The server inspects uncompressed WAV headers, crops exactly the selected 30 seconds without source LIST/ID3 metadata and encodes that independent section as a 128 kbps MP3. Originals are preserved without transcoding. Original uploads are spooled to bounded private temporary files; complete masters are never buffered for upload/HTTP delivery. Private sharded local storage and S3/R2-compatible storage are implemented. Local delivery streams byte ranges; preview object storage delivery can use authorized 60-second signed URLs. Purchased originals always stream through authenticated buyer-only requests without exposing bucket URLs. See [storage and scale](docs/STORAGE_AND_SCALE.md).

## Orders and payment boundary

Prices use MongoDB Decimal128 and validated whole toman amounts. Checkout reloads current tracks/licenses and rejects stale prices/versions, self-purchases, exclusive licenses and unavailable deliverables. Buyer-scoped idempotency prevents retrying one checkout from starting a second payment. Orders snapshot the price, contract version/terms and exact master file.

Per-track discounts use a dedicated versioned model, UTC start/end instants and 1–90 percent whole-number discounts. The backend recalculates effective prices and snapshots original price/savings/campaign version; an expired campaign cannot discount a new order or change an existing quoted order. Cards share one server-aligned countdown clock. Newest public/producer catalog pages use stable range cursors. Public per-track license payloads are bounded and detailed choices can be paged.

Sponsored `HeroPlacement` bookings have a UTC window, explicit order, label, active switch, version and admin audit references. Only current active `PAID`/`COMPLIMENTARY` bookings qualify, with at most ten distinct beats ordered by position. Each beat must remain published/public with real artwork, a stored master, a cropped 30-second preview, an active producer and an available non-exclusive WAV-only license. The public DTO excludes manual fees and payment references. Current discounted license prices are displayed and expired placements leave the deck through the shared server-aligned clock. The agreed fee is recorded in whole toman, but advertising collection and settlement are not implemented. Deployment index creation includes `HeroPlacement` through `npm run db:indexes`.

Zarinpal configuration is external. An unconfigured gateway is visibly disabled and returns 503, never fake success. Only server verification against the persisted authority and amount transitions PENDING -> PAID. Conditional updates make duplicate callbacks safe; code101 permits recovery after an interrupted database write. Downloads require the paid order's actual buyer and use the purchased master snapshot.

This establishes the implemented gateway protocol, not live merchant acceptance. Producer settlement, platform commissions, refunds, financial reconciliation and exclusive-sale inventory still need development.

## Verification

- `npm run check`: ESLint, route generation, strict TypeScript.
- `npm run test:media` verifies the independent MP3 crop, byte-identical masters, protected delivery, ranges and request protections; database index deployment tooling is retained.
- Optimized production build.
- Integration against configured MongoDB and S3 with disposable fixtures: roles, profile persistence/conflicts, session rotation, upload/publication, exact 30-second previews, private masters/avatars, licenses, favorites/collections, messages, buyer-only sandbox downloads and exclusion of test amounts from financial summaries. Diagnostic objects are deleted after readback; fixtures are cleaned up after QA.
- Browser inspection and interactions on the isolated production server, including mobile layouts, player, saved beats, cart persistence and producer editor.

## Remaining product scope

BeatStars parity is not complete. See [research and feature map](docs/BEATSTARS_RESEARCH.md) and [README](README.md) for the remaining feature list and setup. The next major work includes exclusive reservations, MP3/stems, seller payout accounting, collaboration, follows, messaging, coupons/bundles, subscriptions and advanced analytics. Distributed quotas/processing jobs and measured deployment capacity require load testing beyond the completed configured-bucket functional checks.
