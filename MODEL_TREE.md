# BeatMarketplace Model Tree

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
```

`ObjectStorageAsset` is a reusable embedded schema, not its own MongoDB collection.

## Model responsibilities

### User

Owns identity, authentication state, roles, account status, verification state, and the user's general public profile. Avatar, banner, location, website, and social links live here so they are not duplicated across role-specific profiles.

### ProducerProfile

Adds producer-only business identity: stage name, storefront name, producer biography, and the genres the producer works in. It has a one-to-one relationship with `User`.

### Genre

Represents genres and subgenres. `parentGenreId` provides hierarchy without a separate category model—for example, `Hip Hop → Trap`.

### Mood

Represents reusable emotional classifications such as dark, uplifting, aggressive, or relaxed. Moods are independent from genres.

### Instrument

Represents instruments and their families, such as drums, keys, strings, synths, vocals, and effects.

### Track

The only producer-published music model. It owns descriptive metadata, taxonomy references, release state, visibility, object-storage assets, and collaborator credits/revenue shares.

### Contract

Defines commercial terms that can govern one or more tracks. It owns pricing, offer rules, deliverables, territory, license rights, version, and effective dates.

## Intentionally removed

- `Beat` model
- `/api/beats` route and its create/update/list functions
- beat request-validation schemas and shared types
- beat publishing and marketplace UI
- `Category` model
- category relationship from `Genre`

No track, genre, mood, instrument, or contract CRUD routes have been created yet.

## Possible future models — not created

These should only be added when their workflows are approved.

### Likely needed for the next product stages

1. **Offer** — records a buyer's negotiated amount and the producer's accept, reject, or counter-offer decision for an offerable contract.
2. **Order** — immutable checkout snapshot containing buyer, track, contract version, final price, currency, and order state.
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
11. **Favorite / Follow** — buyer saves and producer-following relationships.
12. **Review / Rating** — marketplace reputation after verified purchases exist.
13. **Notification** — durable in-app/email notification state.
14. **AuditLog** — security and administrative history for sensitive actions.
15. **Role / Permission** — database-managed RBAC when the current fixed roles and code-level checks are no longer enough.

The recommended next modeling decision is whether `Contract` is only a reusable template. If it is, `ExecutedContract`, `Order`, and `Entitlement` should be approved before checkout is implemented.
