# BeatMarketplace: Current Platform State

> Repository snapshot reviewed on August 29, 2026.

## 1. Executive summary

BeatMarketplace is currently an early, runnable MVP foundation built as a Next.js modular monolith. It demonstrates the first half of a beat-marketplace journey:

1. register a user;
2. turn that user into a producer;
3. create and publish a beat; and
4. display published beats in a public marketplace list.

The code includes JWT authentication, bcrypt password hashing, role and ownership helpers, producer profiles, beat metadata, beat statuses, and a license data model. Persistence is currently an in-memory JavaScript store, not MongoDB or another database.

The larger product journey described in the repository's presentation decks—audio upload, beat-detail pages, license selection, checkout, payment confirmation, purchase entitlements, protected downloads, and a buyer library—is a roadmap, not current functionality.

## 2. Product status at a glance

| Capability | Status | What exists now |
| --- | --- | --- |
| User registration | Implemented | Creates an in-memory user, hashes the password, and returns a JWT. |
| User login | Implemented as an API | Verifies email/password and returns a JWT; there is no login form in the UI. |
| Current-user lookup | Implemented | `GET /api/auth/me` resolves a bearer token to a user. |
| Roles | Implemented at MVP level | A user can hold `USER`, `PRODUCER`, and/or `ADMIN` roles. |
| Producer conversion | Implemented | An authenticated user can create one producer profile and receive the `PRODUCER` role. |
| Producer profile retrieval | Implemented as an API | The authenticated user can fetch their own producer profile. |
| Beat creation | Implemented | Producers can create beat metadata as a draft or another supplied status. |
| Beat editing/publishing | Implemented at basic level | Owners or admins can update metadata and status through one collection-level `PATCH` endpoint. |
| Marketplace listing | Implemented | Public API and UI list all in-memory beats whose status is `PUBLISHED`. |
| License display | Partially implemented | License types exist and two licenses are seeded on one demo beat. There is no license-management API or UI. |
| Audio/cover upload | Not implemented | Models contain URL fields, but no upload, storage, processing, preview, or download flow exists. |
| Beat details and search | Not implemented | Only a marketplace grid exists; there are no detail routes, filters, search, indexes, or pagination. |
| Cart and checkout | Not implemented | No cart, order, pricing-validation, or checkout code exists. |
| Payments | Not implemented | No payment provider, webhook, or payment state machine exists. |
| Purchases and entitlements | Not implemented | No order, purchase-access, buyer-library, or protected-download model exists. |
| Admin tools | Not implemented | The `ADMIN` role is recognized by ownership helpers, but there is no admin interface or admin API. |
| Email verification, password reset, MFA | Not implemented | New users are marked unverified, but verification is not enforced or available. |
| Automated tests | Not implemented | No unit, integration, or end-to-end test files or test script are present. |

## 3. Current user experience

The application currently has one client-rendered page at `/`. Its dark, card-based demo interface contains:

- a registration form;
- a producer-profile form;
- a beat-publishing form;
- a marketplace grid of published beats; and
- a current-session summary showing the user, email, roles, and whether a token is present.

The browser keeps the JWT only in React component state. Refreshing the page clears the session. There is no navigation, login page, logout action, persistent session, producer dashboard, buyer account, beat details page, or checkout interface.

### Important demo-flow issue

The form initially uses `producer@beatmarketplace.dev`, but that email is already inserted by the in-memory seed. Pressing **Register** with the default form therefore returns `409 User already exists`, leaving the UI without a token. The seeded bcrypt hash also does not match the form's default password, `welcome123`, and the page has no login button. The flow can still be demonstrated by changing the registration email to a new value, then using the producer and beat forms.

## 4. Implemented API surface

All endpoints are Next.js App Router route handlers.

| Method and route | Access | Current behavior |
| --- | --- | --- |
| `POST /api/auth/register` | Public | Requires email, password, first name, and last name; rejects duplicate email; hashes the password; creates a `USER`; returns sanitized user data and a JWT. |
| `POST /api/auth/login` | Public | Requires email and password; verifies the bcrypt hash; returns sanitized user data and a JWT. |
| `GET /api/auth/me` | Bearer token | Verifies the JWT, loads the current in-memory user, and returns sanitized user data. |
| `POST /api/producers` | Bearer token; `USER` role | Creates one profile for the current user and adds the `PRODUCER` role. |
| `GET /api/producers` | Bearer token | Returns the current user's profile, or `null` when none exists. |
| `GET /api/beats` | Public | Returns all beats whose status is exactly `PUBLISHED`. |
| `POST /api/beats` | Bearer token; `PRODUCER` role | Creates beat metadata owned by the current user. Only the title is required. |
| `PATCH /api/beats` | Bearer token; owner or `ADMIN` | Updates a beat selected by `id` in the request body. Supports title, description, genre, mood, BPM, key, tags, and status. |

There are no endpoints for logout, token refresh/revocation, email verification, password reset, individual public beat retrieval, producer storefronts, license creation, uploads, orders, payments, purchases, downloads, or administration.

## 5. Domain model

### User

The `User` type contains:

- UUID identifier;
- normalized email;
- bcrypt password hash;
- first and last name;
- an array of roles (`USER`, `PRODUCER`, `ADMIN`);
- email-verification flag; and
- created/updated timestamps.

### Producer profile

The `ProducerProfile` type contains:

- UUID identifier and associated user ID;
- stage name, bio, location, and genres;
- avatar and banner URLs;
- optional Instagram, Twitter/X, YouTube, and Spotify links;
- storefront name; and
- created/updated timestamps.

### Beat

The `Beat` type contains:

- UUID identifier and producer owner ID;
- title, generated slug, and description;
- genre, mood, BPM, musical key, and tags;
- cover, preview, and master URLs;
- status (`DRAFT`, `PROCESSING`, `PUBLISHED`, `UNPUBLISHED`, or `ARCHIVED`);
- embedded licenses; and
- created/updated timestamps.

In the current implementation, `producerId` stores the owning **user ID**, not the producer-profile ID.

### License

The embedded `License` type contains:

- UUID, name, price, and currency;
- allowed file formats;
- usage-rights text;
- commercial-use flag;
- distribution and streaming limits; and
- creation timestamp.

No API currently creates or updates licenses. Newly created beats always have an empty license list.

## 6. Seed data

Each fresh server process seeds:

- one verified producer user named Ari Vance;
- one producer profile named **Ari Vance Beats**; and
- one published beat named **Midnight Shift**.

The seeded beat is a 140 BPM, C-sharp-minor dark trap beat with two sample licenses:

- **MP3 Lease** — USD 29, MP3; and
- **Premium Mix** — USD 79, MP3 and WAV.

Its cover, preview, and master URLs are all `null`, so the current marketplace is metadata-only and has no playable audio.

## 7. Architecture and implementation

### Application shape

The code follows a small modular-monolith approach:

- `app/` contains the UI, root layout, styling, and API route handlers;
- `lib/types.ts` defines the domain types;
- `lib/store.ts` provides seed data and in-memory CRUD helpers;
- `lib/auth.ts` centralizes password and JWT operations;
- `lib/permissions.ts` centralizes basic role/ownership decisions; and
- `lib/config.ts` reads runtime configuration.

There are not yet separate service, repository, validation, payment, storage, worker, or event layers.

### Technology stack

- Next.js 16.3.2 with the App Router
- React and React DOM 19.2.8
- TypeScript 5.x in strict mode
- Tailwind CSS 4 through PostCSS
- `bcryptjs` for password hashing
- `jsonwebtoken` for access tokens
- ESLint 9 with Next.js Core Web Vitals and TypeScript rules
- npm lockfile version 3

The checked-in SVGs are standard starter assets and are not used by the current page. The favicon is present. The seeded producer references `/placeholder-user.png`, but that file is not present; the current UI does not render it.

### Runtime configuration

The application recognizes:

| Variable | Default | Current use |
| --- | --- | --- |
| `JWT_SECRET` | `dev-secret-change-me` | Signs and verifies JWTs. |
| `JWT_EXPIRES_IN` | `7d` | Sets token lifetime. |
| `MONGODB_URI` | `mongodb://localhost:27017/beatmarketplace-dev` | Declared but not used. |

## 8. Authentication and authorization behavior

Passwords are hashed with bcrypt using cost factor 10 for newly registered users. JWTs contain the user ID (`sub`), email, and roles. Protected endpoints expect `Authorization: Bearer <token>`.

The API reloads the user from the in-memory store for protected operations rather than trusting token roles alone. Authorization currently includes:

- producer-role enforcement for beat creation;
- user ownership or admin-role enforcement for beat updates; and
- duplicate-profile prevention during producer conversion.

This is a useful MVP base, but it is not production-ready authentication or authorization.

## 9. Known limitations and risks

### Data and deployment

- All data disappears on process restart and is not shared safely across server instances.
- The configured MongoDB URI is unused.
- IDs and timestamps are generated in memory; no database constraints enforce unique email, profile ownership, or slug uniqueness.
- Concurrent requests can race because mutations are direct array operations.

### Security and access control

- The fallback JWT secret is publicly known and unsafe for deployment if `JWT_SECRET` is missing.
- Tokens have no refresh, revocation, rotation, or logout mechanism.
- The UI does not use secure, HTTP-only cookies and does not persist sessions.
- There is no rate limiting, login throttling, MFA, password reset, breached-password check, audit log, or suspicious-login detection.
- Email syntax, password strength, and field sizes are not validated beyond presence checks.
- Email verification is recorded but never enforced.
- Route handlers repeat token-parsing logic; there is no shared authentication middleware/guard.
- Runtime payloads are TypeScript-cast rather than schema-validated, so clients can submit invalid values or statuses.
- `GET /api/beats` returns the complete beat object. If `masterUrl` later contains a protected asset, the public response would expose it unless a public response model is introduced.

### Beat and marketplace rules

- A producer can publish a beat without audio, artwork, or a license.
- Publishing has no state-transition or completeness validation.
- Changing a beat title does not regenerate its slug.
- Slugs are not guaranteed unique.
- BPM, musical key, tags, status, and other inputs have no range or enum validation at runtime.
- New beats cannot receive licenses through the product.
- There is no individual beat route, producer name in marketplace cards, preview player, search, filtering, sorting, or pagination.

### Commerce and fulfillment

- Prices are display-only seed data.
- There are no carts, server-side price snapshots, orders, payments, webhooks, refunds, commissions, payouts, invoices, taxes, or currencies beyond stored text.
- Exclusive licenses and concurrent-purchase protection are only design concepts in the decks.
- There are no entitlements or protected asset checks.

### UI and quality

- The default registration values conflict with the seed user, so the advertised flow requires manually changing the email.
- The beat description exists in state and is sent to the API, but there is no description input in the publish form.
- Network failures are not caught in the client event handlers.
- Buttons do not have loading/disabled states beyond status text.
- Accessibility, responsive behavior, and browser coverage have not been tested formally.
- No automated test suite or CI configuration exists.

## 10. Verification status

Checks run against this snapshot:

- `npm ls --depth=0`: passed; installed top-level dependencies are resolved.
- `tsc --noEmit`: passed with no TypeScript errors.
- `npm run lint`: completed with no errors and one warning in `lib/auth.ts` because `sanitizeUser` destructures `passwordHash` solely to omit it.
- `npm run build`: could not be verified in the current restricted execution environment because Turbopack was denied permission to bind a local worker port while processing CSS.
- `next build --webpack`: also did not complete; Next.js reported that it could not parse TypeScript's `--showConfig` output, although running `tsc --showConfig` and `tsc --noEmit` directly succeeded.

At the start of the review, `.next` contained generated route output from an earlier build. The clean verification attempts replaced it with partial cache, type, trace, and diagnostic output; generated output is ignored by Git and is not source code.

## 11. Product direction documented in the slide decks

The two PowerPoint files provide product and teaching plans rather than additional implemented software.

`authentication and autherization.pptx` defines the intended identity foundation: registration, login, sessions/tokens, roles, permissions, ownership checks, least privilege, route protection, and future MFA/re-authentication. The code implements a smaller subset: registration, login, bearer JWTs, roles, producer ownership, and an admin override.

`fullgerny.pptx` describes the intended complete vertical slice:

1. register and become a producer;
2. create a beat;
3. upload audio;
4. create license options;
5. publish to a discoverable marketplace;
6. view a beat and play its preview;
7. select a license and check out;
8. create and confirm an order; and
9. access purchased files in a buyer library.

It also deliberately postpones queues/workers, object storage and audio processing infrastructure, CDN delivery, a dedicated search engine, WebSockets, analytics infrastructure, and AI features until later stages.

## 12. Recommended next milestone

Before starting checkout, the current foundation should be made dependable:

1. replace the in-memory store with a database-backed repository and enforce uniqueness;
2. add runtime request validation and public/private response models;
3. fix the seeded-user/default-form conflict and provide a real login/logout session flow;
4. add license creation and publishing requirements;
5. add object storage with separate preview and protected master assets; and
6. add automated API tests for authentication, roles, ownership, publication, and invalid input.

After those foundations, the repository's stated next milestone—orders, price snapshots, payment abstraction, payment-state handling, and purchase entitlements—can be implemented without building commerce on ephemeral or unvalidated data.
