# User images and producer administration

The Users editor supports creating an account with an avatar, previewing its saved image, replacing it, and removing it. The separate **Admin → Producers** section lists accounts with the `PRODUCER` role, including suspended and deactivated accounts.

The producer editor reuses the owner's studio designer. Its public profile panel controls the producer/studio name, banner and focal point, biography, tagline, location, website, social links, music styles, featured beats and layout. Its account panel controls account identity, avatar, contact details, roles and status. These panels save independently; changing a banner does not change the account version.

## Access rules

| Action | Allowed access |
| --- | --- |
| List/manage user accounts or producer accounts | Active `ADMIN` |
| Edit a producer through `/api/admin/producers/:id` | Active `ADMIN`; target must have `PRODUCER` role |
| Edit `/api/account/producer` | Active `PRODUCER`, own profile only |
| Change `/api/account/avatar` | Active signed-in user, own avatar only |
| Read public producer pages/images | Public, for active producer accounts |
| Read settings images with `private=1` | Active `ADMIN`, or the active producer who owns that image |

Owner endpoints derive the account ID from authentication and never accept another owner's ID from form data. The server reads current roles and status from MongoDB. A producer cannot use the admin endpoints to edit another producer, and a customer cannot access the studio settings by supplying an ID or a role claim. Administrative role/status/password changes revoke prior sessions. Object IDs are normalized before comparison so letter casing cannot bypass platform-owner or self-access protection.

## API contracts

- `POST /api/admin/users`: JSON account data, or multipart `data` JSON plus optional `artwork` avatar. Returns `{ item }`.
- `PATCH /api/admin/users/:id`: same formats plus `expectedVersion`; `removeAvatar: true` removes the saved avatar. A replacement image and removal cannot be submitted together. Returns `{ item }`.
- `GET /api/admin/producers`: cursor pagination with bounded `q`, `limit`, `cursor` and optional `status`. Results always contain producers, even if a caller supplies a different role filter.
- `GET /api/admin/producers/:id`: `{ profile, user }` for the two editor panels.
- `PATCH /api/admin/producers/:id`: the same validated public-profile payload as the owner endpoint; optional multipart `banner`.
- `GET /api/admin/producers/:id/beats`: bounded cursor list of that producer's published public beats; `ids` supports lookup of at most six selected beats.
- `GET/PATCH /api/account/producer`: the owner's studio settings.
- `POST /api/account/avatar`: multipart `artwork` using the existing owner upload flow.
- `DELETE /api/account/avatar`: strict JSON `{ expectedVersion }`; returns `{ user }`.

Account and studio saves use separate MongoDB document version checks. A stale save returns `409` instead of overwriting another edit. Blank usernames are unset to respect the sparse unique index. Administrative profile changes use explicit field updates and preserve existing media unless replacement/removal is requested.

## Image storage and table freshness

Images use the shared bounded upload and optimization pipeline: WebP below 800,000 bytes, 512 × 512 avatars, and retained banner artwork for adjustable framing. S3 keys remain under the configured `beatmarket/` prefix. New media is associated with the account/profile in the same version-checked document update. Failed saves roll back newly written media; replaced/removed objects are deleted only after the database update succeeds. Cleanup failures are logged without reporting a committed save as failed.

Image endpoints resolve the current stored asset after authorization; clients cannot submit an arbitrary bucket or object key. A supplied image version must match that asset's key, so an old image URL does not silently return its replacement. Settings image URLs use private delivery, including when an administrator edits an inactive producer. Public image URLs retain the active-producer requirement.

Successful account/avatar/producer writes invalidate related SWR table searches and pages. Mounted Users and Producers tables revalidate immediately; unmounted affected entries are invalidated for their next use. Cache scope includes the signed-in account and its roles, keeping administrative data separated between sessions.
