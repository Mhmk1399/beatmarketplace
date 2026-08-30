# BeatMarketplace: Current Platform State

> Repository snapshot reviewed on August 30, 2026.

## What exists today

BeatMarketplace is a Next.js modular monolith backed by MongoDB and Mongoose. The implemented product surface now includes a public marketing/discovery homepage, dedicated authentication pages, cookie-backed sessions, role and ownership authorization helpers, producer onboarding, and the first approved music-domain schemas.

Track discovery cards, player controls, mood filters, and the Producer Studio shown on the homepage are presentation-only previews. They are intentionally isolated from the API layer and do not claim that track publishing or discovery is already live.

## Public web experience

| Route | Current behavior |
| --- | --- |
| `/` | Responsive public homepage with hero/player concept, demo discovery, moods, producer value proposition, workflow, and calls to action. |
| `/login` | Accessible email/password login form connected to `POST /api/auth/login`. |
| `/signup` | Accessible account form connected to `POST /api/auth/register`. |

The shared navigation restores the current session through `GET /api/auth/me`. Anonymous visitors see login and account-creation actions. Authenticated visitors see their identity, role, and a real logout action. Session credentials remain in an HTTP-only cookie; the frontend does not store tokens in local or session storage.

The visual system is a dark graphite neumorphic interface with restrained purple accents, responsive layouts, visible keyboard focus, reduced-motion support, tactile controls, reusable surfaces, inputs, buttons, and icon buttons.

## Implemented application capabilities

| Capability | Status |
| --- | --- |
| Register with email, password, names, and optional phone | Implemented |
| Login, cookie session restoration, and logout | Implemented |
| Current authenticated user | Implemented |
| `USER`, `PRODUCER`, and `ADMIN` roles | Implemented |
| Shared role and resource-owner authorization checks | Implemented |
| Create and retrieve the current user's producer profile | Implemented |
| Public homepage and dedicated auth pages | Implemented |
| Genre, mood, and instrument administration | Models only |
| Track creation, publishing, playback, and discovery | Model only; homepage content is static demo data |
| Contract creation and assignment | Model only |
| Upload, checkout, payment, licensing, and fulfillment | Not implemented |

## API routes

| Method and route | Purpose |
| --- | --- |
| `POST /api/auth/register` | Validate and create a user, then establish a session. |
| `POST /api/auth/login` | Validate credentials and establish a session. |
| `POST /api/auth/logout` | Clear the browser session cookie. |
| `GET /api/auth/me` | Return the authenticated database user. |
| `POST /api/producers` | Create or recover the authenticated user's producer profile. |
| `GET /api/producers` | Return the authenticated user's producer profile. |

There are deliberately no beat or category routes. Track and taxonomy routes have not been created yet.

## Current model tree

The complete relationship map and model responsibilities are documented in [MODEL_TREE.md](./MODEL_TREE.md).

Persisted collections:

- `User`
- `ProducerProfile`
- `Genre`
- `Mood`
- `Instrument`
- `Track`
- `Contract`

Reusable embedded schema:

- `ObjectStorageAsset`

Key relationships:

- `ProducerProfile.userId → User`
- `ProducerProfile.genreIds → Genre[]`
- `Genre.parentGenreId → Genre`
- `Track.producerId → User`
- `Track.metadata.genreId → Genre`
- `Track.metadata.moodIds → Mood[]`
- `Track.metadata.instrumentIds → Instrument[]`
- `Track.collaborators.userId → User[]`
- `Contract.producerId → User`
- `Contract.trackIds → Track[]`

## Authentication and authorization

- Passwords use bcrypt with cost factor 12.
- JWTs use HS256 with issuer, audience, expiration, and token-type checks.
- Browser sessions use HTTP-only, same-site cookies and `Secure` in production.
- Protected requests reload the current user from MongoDB.
- Suspended or deactivated users are rejected.
- Role checks include an admin override.
- Resource-owner checks compare the authenticated user with the resource owner.

Still missing are email-verification workflows, password reset, rate limiting, MFA, refresh/revocation, audit logs, and database-managed permissions.

## Model safeguards

- Unique user email, optional phone, username, genre/mood/instrument slugs, and track slug.
- Hierarchical genres without a separate category model.
- Track publication requires a genre, artwork, and preview audio.
- Scheduled tracks require a future release date.
- Collaborators cannot duplicate the producer or each other.
- Collaborator revenue shares cannot exceed 100%.
- Contract prices use MongoDB Decimal128.
- Offer minimums, territories, deliverables, track assignments, and effective dates have cross-field validation.
- Protected master and stem fields are excluded from queries by default.

## Removed domain concepts

The following source code has been removed:

- `Beat` model and shared beat types
- beat validation functions
- `/api/beats` route
- beat publishing and listing UI
- `Category` model
- category references from genres

## Technology

- Next.js 16 and React 19
- TypeScript in strict mode
- MongoDB with Mongoose
- Zod runtime request validation
- bcrypt password hashing
- JSON Web Tokens
- Tailwind CSS 4

## Verification completed

- `npm run check` passes ESLint, Next route generation, and a cold TypeScript check.
- `/`, `/login`, and `/signup` return successful responses.
- A real development auth cycle passed: signup, session restoration, logout, rejected session after logout, login, restored session, and final logout.
- Desktop and 390 px mobile layouts were visually inspected for the homepage and authentication surfaces.

Run the complete static check with:

```bash
npm run check
```

## Next implementation decision

Do not treat the visual Producer Studio concept as an implemented feature. The next domain work should be chosen deliberately from the candidate models in [MODEL_TREE.md](./MODEL_TREE.md), followed by taxonomy/track APIs only after approval.
