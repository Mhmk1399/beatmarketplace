# BeatMarketplace: Current Platform State

> Repository snapshot reviewed on August 30, 2026.

## What exists today

BeatMarketplace is a Next.js modular monolith backed by MongoDB and Mongoose. The implemented product surface now includes a public marketing/discovery homepage, dedicated authentication pages, cookie-backed sessions, role and ownership authorization helpers, producer onboarding, and the first approved music-domain schemas.

The authenticated product surface now also includes one shared, role-aware dashboard shell for Personal, Producer Studio, and Admin workspaces. It is a foundation rather than three separate dashboard applications.

Track discovery cards, player controls, mood filters, and the Producer Studio shown on the homepage are presentation-only previews. They are intentionally isolated from the API layer and do not claim that track publishing or discovery is already live.

## Public web experience

| Route | Current behavior |
| --- | --- |
| `/` | Responsive public homepage with hero/player concept, demo discovery, moods, producer value proposition, workflow, and calls to action. |
| `/login` | Accessible email/password login form connected to `POST /api/auth/login`. |
| `/signup` | Accessible account form connected to `POST /api/auth/register`. |
| `/dashboard` | Personal overview for any authenticated account. |
| `/studio` | Producer overview restricted to users with the exact `PRODUCER` role. |
| `/admin` | Operational overview restricted to users with the exact `ADMIN` role. |

The shared navigation restores the current session through `GET /api/auth/me`. Anonymous visitors see login and account-creation actions. Authenticated visitors see their identity, role, and a real logout action. Session credentials remain in an HTTP-only cookie; the frontend does not store tokens in local or session storage.

The visual system is a dark graphite neumorphic interface with restrained purple accents, responsive layouts, visible keyboard focus, reduced-motion support, tactile controls, reusable surfaces, inputs, buttons, and icon buttons.

The shared UI foundation also provides a typed configuration-driven form, generic typed table, accessible controlled modal, and globally mounted toast system. Usage guidance lives in [components/ui/README.md](./components/ui/README.md).

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
| Shared responsive dashboard shell and role-aware workspace navigation | Implemented |
| Server-side Personal, Producer Studio, and Admin route authorization | Implemented |
| Shared dynamic form, table, modal, and global toast primitives | Implemented |
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

## Shared dashboard foundation

The three workspaces reuse the same dashboard shell, sidebar, header, workspace switcher, user menu, mobile drawer, and data-driven navigation renderer.

Available workspaces are derived from the current MongoDB user roles after the session token is verified:

- Every authenticated account receives Personal at `/dashboard`.
- `PRODUCER` adds Producer Studio at `/studio`.
- `ADMIN` adds Admin at `/admin`.
- Admin does not implicitly grant Producer Studio; the producer role must be present.

Anonymous access to any workspace redirects to `/login`. An authenticated user missing a workspace's required role is redirected to `/dashboard`. These checks happen in server layouts and do not rely on hidden navigation links.

Currently exposed navigation:

- Personal: Overview, Profile, Settings.
- Producer Studio: Overview, Tracks, Contracts, Producer Profile, Settings.
- Admin: Overview, Users, Genres, Moods, Instruments, Settings.

Only the three overview pages contain live dashboard information. Personal uses the authenticated account record, Producer Studio reads the existing `ProducerProfile` when available, and Admin presents current management domains without fabricated statistics. The remaining destinations are explicit structural placeholders: they contain no forms, records, CRUD behavior, or fake APIs.

The dashboard is responsive at desktop, tablet, and mobile widths. Desktop uses a persistent sidebar; smaller layouts use a keyboard-accessible modal drawer with focus containment, Escape handling, navigation-close behavior, and body scroll locking. Active routes use `aria-current="page"`, accent color, and an inset pressed state.

## Shared UI primitives

- `DynamicForm` renders typed field definitions while each feature retains ownership of state, validation, and API submission. Login and Signup currently use it.
- `DynamicTable<T>` renders semantic tables with typed columns, custom cells, loading rows, responsive overflow, and empty states. It does not fabricate fetching, sorting, or pagination behavior.
- `DynamicModal` is a controlled portal modal with focus containment/restoration, Escape and backdrop behavior, body scroll locking, responsive sizing, and accessible labelling.
- `ToastProvider` is mounted once in the root layout. `useToast()` exposes success, error, warning, informational, individual-dismiss, and dismiss-all behavior. Login, Signup, and both logout surfaces currently use it.

Transient toasts supplement rather than replace inline validation errors. No data-layer behavior or domain APIs are embedded in these UI primitives.

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
- Dashboard access was verified for `USER`, `USER + PRODUCER`, `USER + ADMIN`, and all-role combinations.
- Dashboard layouts were checked at 1440, 1024, 768, and 390 px without horizontal overflow.
- Nested navigation (`/studio/tracks`), mobile drawer focus, session refresh, and logout behavior were verified.

Run the complete static check with:

```bash
npm run check
```

## Next implementation decision

Do not treat the dashboard placeholders or the public Producer Studio concept as implemented domain features. Track CRUD, Contract CRUD, taxonomy administration, uploads, marketplace workflows, checkout, payments, analytics, notifications, and broader permissions remain intentionally postponed and require separate approval.
