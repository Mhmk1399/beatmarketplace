# BeatStars research and implementation map

Reviewed 2026-11-17. Sources below are official BeatStars and Zarinpal documentation. The product retains BeatMarketplace's own graphite/purple clay and neumorphic design, rather than copying BeatStars branding.

## Core journeys

BeatStars separates discovery and purchasing from Studio content/business management. Its upload flow includes files, artwork, metadata, visibility and per-track license selection/prices. Discovery includes search/filtering and playlists. Licenses are producer-controlled; free downloads do not automatically permit commercial use. Its broader seller platform also includes stems, services, custom licenses, analytics, memberships and publishing-related tools.

The selected **30-second excerpt** is a BeatMarketplace requirement from this project, not a claim about BeatStars' preview duration. We interpreted the request as one complete 30-second excerpt whose start the producer chooses.

| Area | This implementation | Remaining work |
| --- | --- | --- |
| Design | Global theme, shared materials/controls across all workspaces | Further usability refinement as workflows expand |
| Discovery | Real catalog, title/producer/tag search, genre/BPM/key filters, price sort | Mood/instrument assignment/filtering, recommendations and charts |
| Listening | Persistent player, selected 30-second file generated on server | Compressed preview rendition, waveform rendering, processing queue |
| Studio tracks | WAV/artwork upload, metadata, preview selection, draft/publish/archive | MP3/stems, scheduling, unlisted links, bulk imports |
| Licensing | Versioned templates, whole toman prices, usage/custom terms, comparison | Rich contract editor, offers, PDF contracts, exclusive inventory |
| Buyer | Favorites, cart, purchases, immutable license snapshot, verified WAV download | Playlists, follows, receipt/export, download history |
| Payments | Zarinpal request/verification adapter, retry idempotency | Actual merchant activation, live transaction acceptance, refunds and reconciliation |
| Seller finances | Producer ownership retained in order snapshots | Seller ledger, platform commission, payouts, collaboration settlement |
| Admin | Genres/moods/instruments create/edit/deactivate | User moderation, reports, disputes, audit history, financial dashboard |
| Growth | Per-track percentage campaigns, scheduling and live countdowns; producer marketing sections | Coupons/bundles, subscriptions, email/notifications, custom stores |
| Collaboration | Existing domain schema only | Invitations, accepted splits, messaging, projects, statements |

## Decisions made for this project

- Currency is integer toman (`IRT`), selected by the user. Zarinpal is configured through environment variables and is disabled without merchant credentials.
- Store a separate cropped preview; do not send the full master to an unauthenticated client with only a player timer as protection.
- Preserve the master and contract version bought by the customer in the order snapshot so later producer edits do not change purchased files or terms.
- Require an active producer and a published/public track for marketplace access. Verify ownership for every Studio mutation.
- Provide honest loading, empty, validation and retry states. Never seed fake sales, fabricate payment success or present planned features as functioning workflows.
- Checkout currently allows non-exclusive WAV licenses. Exclusive purchases need an atomic reservation/sale workflow, which must also block competing non-exclusive checkout while exclusivity is resolved.
- Private S3-compatible storage, streamed bounded uploads/delivery, cursor catalog pages and timed discounts are now implemented. Production hosting still requires provider credentials, CORS, capacity planning and lifecycle/backup configuration; see [storage and scale](STORAGE_AND_SCALE.md).

## Official sources

- [BeatStars track upload](https://help.beatstars.com/hc/en-us/articles/1260802609630-How-Do-I-Upload-Tracks): files, artwork, visibility, metadata and license selection.
- [BeatStars discovery](https://help.beatstars.com/hc/en-us/sections/200992888-Discovering-Content): search, filters, playlists and contacting sellers.
- [BeatStars metadata defaults](https://help.beatstars.com/hc/en-us/articles/28453618643611-How-To-Pre-set-Your-Track-Metadata-For-Future-Uploads-Using-Track-Preferences): tags, genre, moods, instruments and release preferences.
- [BeatStars seller features](https://www.beatstars.com/pricing): plans, stems, licenses, services, analytics and store features. Prices are intentionally not copied into the product.
- [BeatStars memberships](https://help.beatstars.com/hc/en-us/articles/9051809325339-How-to-Create-a-Membership): recurring license-download plans.
- [BeatStars free-download limitations](https://help.beatstars.com/hc/en-us/articles/205669578-What-can-I-do-with-a-Free-download): personal versus commercially licensed use.
- [Zarinpal connection protocol](https://www.zarinpal.com/docs/paymentGateway/connectToGateway): request, callback, server verification and codes 100/101.
- [Zarinpal currency](https://www.zarinpal.com/docs/paymentGateway/moreFeatures/currency): explicit IRT/IRR distinction.
- [Zarinpal sandbox](https://www.zarinpal.com/docs/paymentGateway/sandBox): test endpoint and test authorities.

## Verification boundary

Production build and static checks are run locally. Automated unit tests mock gateway requests and exercise the payment protocol without a real merchant transaction. Separate API integration tests use an isolated MongoDB and synthetic audio. Live payment acceptance, producer settlement, legal contract adequacy and production deployment are outside what those checks establish.
