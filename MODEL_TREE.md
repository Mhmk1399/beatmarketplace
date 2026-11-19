# BeatMarketplace Model Tree

## Timed campaigns and storage additions (2026-11-17)

`TrackDiscount` has one versioned campaign per track (`trackId` unique), an owning `producerId`, percentage, UTC `startsAt`/`endsAt` and an active switch. `Order.items` snapshots original price, savings, campaign ID/version/window and the final charged price. Changing a campaign never rewrites an existing order.

Embedded storage assets now also retain an optional physical `storageKey` for sharded local/S3 objects. Public UUID media keys stay stable; purchased masters keep their exact provider/bucket/object reference. See [storage and scale](docs/STORAGE_AND_SCALE.md) for runtime adapters and deployment requirements.

`HeroPlacement` schedules an admin-selected sponsored beat. It stores display order/label, UTC start/end, an active switch, agreed whole-toman fee, manual `PENDING`/`PAID`/`COMPLIMENTARY` status and reference, version and creating/updating administrators. Fees are bookkeeping; no advertising charge or settlement runs. Its declared schedule/order/track indexes are included in `npm run db:indexes`.

## Current persisted models

```text
User
├── profile
│   ├── avatar / banner (object-storage metadata)
│   ├── username / display name / bio
│   ├── location / website
│   └── social links
└── ProducerProfile (one per producer user)
    └── genreIds ────────────────┐
                                  ▼
Genre ── parentGenreId ────────> Genre

Mood
Instrument

Track
├── producerId ────────────────> User
├── metadata.genreId ──────────> Genre
├── metadata.moodIds ──────────> Mood[]
├── metadata.instrumentIds ────> Instrument[]
├── collaborators.userId ──────> User[]
├── artwork / preview / master / stems
│   └── embedded object-storage metadata
└── status / visibility / release dates

Contract
├── producerId ────────────────> User
├── trackIds ──────────────────> Track[]
├── price / minimum offer / currency
├── files to deliver
├── territory
└── license terms / version / effective dates

HeroPlacement
├── trackId ──────────────────> Track
├── createdBy / updatedBy ────> User (administrator)
├── position / label / startsAt / endsAt / isActive
├── agreedFeeToman / paymentStatus / paymentReference
└── version / timestamps
```

`ObjectStorageAsset` is a reusable embedded schema, not its own MongoDB collection.

## Model responsibilities

### User

Owns identity, authentication state, roles, account status, verification state, and the user's general public profile. Avatar, banner, location, website, and social links live here so they are not duplicated across role-specific profiles.

### ProducerProfile

Adds producer-only public studio identity with a one-to-one relationship to `User`: stage/store names, tagline, biography, public studio location, website/social links, genre references, an optional private-storage banner, banner focal point, page layout, and up to six ordered featured beat references. Featured selections must belong to the producer and be published/public; public rendering rechecks publication and ownership. Updates use optimistic concurrency. Public avatar images come from the producer user's profile, while private account fields remain excluded.

### Genre

The music category model stores `name`, unique `slug`, `description`, optional `thumbnail` and `banner` object-storage assets, `isActive` and `sortOrder`. Admin manages these at `/admin/genres`; beats continue to reference `metadata.genreId`. Image metadata includes the storage key, provider, size and dimensions; public DTOs expose versioned application URLs instead of raw storage objects. Missing artwork on older genres uses a storefront fallback.

Represents genres and subgenres. `parentGenreId` provides hierarchy without a separate category model—for example, `Hip Hop → Trap`.

### Mood

Represents reusable emotional classifications such as dark, uplifting, aggressive, or relaxed. Moods are independent from genres.

### Instrument

Represents instruments and their families, such as drums, keys, strings, synths, vocals, and effects.

### Track

The only producer-published music model. It owns descriptive metadata, taxonomy references, release state, visibility, object-storage assets, and collaborator credits/revenue shares.

### Contract

Defines commercial terms that can govern one or more tracks. It owns pricing, offer rules, deliverables, territory, license rights, version, and effective dates.

### HeroPlacement

Owns a sponsored homepage booking, separate from a track's licenses, discounts and buyer orders. The public query returns at most ten distinct beats in explicit order, only within active paid/complimentary windows. The referenced beat must still have public publication, real artwork, a master, a cropped 30-second preview, an active producer and an available non-exclusive WAV-only license. Public serialization exposes the beat and display schedule while withholding fees, payment references and admin fields. Deactivation preserves the booking record.

## Intentionally removed

- `Beat` model
- `/api/beats` route and its create/update/list functions
- beat request-validation schemas and shared types
- beat publishing and marketplace UI
- `Category` model
- category relationship from `Genre`

Track, contract, and genre/mood/instrument CRUD APIs now exist. See CURRENT_PLATFORM_STATE.md for current routes.

## Additional models and future work

`TrackMetric` holds a separate counter document per beat (`views`, `uniqueVisitors`, `lastViewedAt`). `TrackVisitor` stores only a beat-specific HMAC and the last counted timestamp for each anonymous browser. Its unique `_id` supports exact lifetime browser deduplication and a 30-minute view window without keeping a per-view event log. A MongoDB transaction commits both documents together; analytics never changes the track's edit version. Owner-scoped reports query counters by the current page's track IDs rather than scanning visitors.

Implemented additions (2026-11-17): Favorite links a user and track with a compound unique index. Order owns buyer-scoped checkout idempotency, immutable track/contract/master snapshots, integer IRT amount, gateway authority/reference and conditional payment state. Order snapshots currently serve as purchased licenses and download entitlements; separate entities may become useful as fulfillment grows.

### Likely needed for the next product stages

1. **Offer** — records a buyer's negotiated amount and the producer's accept, reject, or counter-offer decision for an offerable contract.
2. **Order** — implemented with immutable item, contract and master snapshots, total toman amount, gateway reference and state.
3. **Payment** — payment-provider references, payment attempts, webhook state, refunds, and reconciliation data.
4. **Entitlement** — records which purchased track files and rights a user may access after payment.
5. **ExecutedContract** — immutable accepted contract snapshot. This prevents later edits to a reusable `Contract` template from changing a buyer's purchased rights.

### Likely needed for collaboration

6. **CollaborationInvitation** — invitation and acceptance workflow before a collaborator is attached to a track.
7. **SplitAgreement** — versioned, explicitly accepted revenue ownership percentages. The current embedded percentages are suitable for metadata but not strong enough for financial or legal settlement.

### Likely needed for production media processing

8. **MediaAsset** — separate asset lifecycle when uploads need processing state, ownership, retries, multiple renditions, waveform data, or reuse. Embedded storage metadata is sufficient until then.
9. **TrackRevision** — preserves uploaded versions, metadata changes, and rollback history when producers revise published tracks.

### Add only when product demand appears

10. **Playlist / Collection** — curated groups of tracks.
11. **Favorite / Follow** — Favorite is implemented; producer following remains future work.
12. **Review / Rating** — marketplace reputation after verified purchases exist.
13. **Notification** — durable in-app/email notification state.
14. **AuditLog** — security and administrative history for sensitive actions.
15. **Role / Permission** — database-managed RBAC when the current fixed roles and code-level checks are no longer enough.

`Contract` remains a reusable versioned template. `Order` now stores the immutable accepted terms and exact purchased master and provides the current download entitlement. Separate executed-contract/entitlement records can be introduced when refunds, revisions, richer fulfillment or legal document generation require independent lifecycles.
