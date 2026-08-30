# BeatMarketplace

A modular music marketplace built in Next.js with a domain-first architecture. The first complete product flow is:

REGISTER / LOGIN → USER PROFILE → BECOME PRODUCER

## Current implementation status

This repo is at the beginning of the foundation phase and includes:

- MongoDB-backed user, producer-profile, genre, mood, instrument, track, and contract schemas
- independently managed genre, mood, and instrument taxonomies referenced by tracks
- object-storage metadata for artwork, preview audio, masters, stems, avatars, and banners
- user-linked track collaborators with credits, invitation state, and revenue shares
- reusable contracts with pricing, offer rules, deliverables, territories, rights, and governed tracks
- validated registration and login APIs
- JWT authentication through HTTP-only cookies or bearer tokens
- centralized role and resource-ownership authorization helpers
- producer profile conversion
- a responsive public homepage with clearly labeled static music previews
- dedicated, accessible login and signup pages connected to the real auth API
- authentication-aware public navigation and logout
- one shared responsive dashboard shell for Personal, Producer Studio, and Admin workspaces
- server-authoritative workspace access based on the authenticated user's current database roles
- shared typed form, table, modal, and global toast primitives for future feature UI

See [CURRENT_PLATFORM_STATE.md](./CURRENT_PLATFORM_STATE.md) for the exact implemented scope and [MODEL_TREE.md](./MODEL_TREE.md) for domain relationships.

## Architecture approach

This project is a modular monolith with clear domain boundaries rather than microservices. Its current modules are organized as reusable models, utilities, and route handlers:

- auth
- users
- producers
- shared
- genres / moods / instruments
- tracks
- contracts

This keeps the system simple enough to understand while making later growth straightforward.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the dev server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000

MongoDB must be available at `MONGODB_URI` before using the API.

## Environment variables

Create a .env.local file with at least:

```bash
JWT_SECRET=replace-with-at-least-32-random-characters
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb://localhost:27017/beatmarketplace-dev
JWT_ISSUER=beatmarketplace
JWT_AUDIENCE=beatmarketplace-web
```

`JWT_SECRET` is mandatory in production and must contain at least 32 characters. The development-only fallback must never be used for a deployed application.

## Current boundary

The homepage previews discovery, playback, and mood browsing visually. Dashboard links for Tracks, Contracts, Producer Profile, Users, Genres, Moods, Instruments, and Settings are structural placeholders only. Their CRUD APIs and workflows are not implemented yet, and the next milestone should be selected before that domain work begins.
