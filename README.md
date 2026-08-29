# BeatMarketplace

A modular beat marketplace MVP built in Next.js with a domain-first architecture aimed at the first full product flow:

REGISTER → BECOME PRODUCER → CREATE BEAT → PUBLISH → MARKETPLACE → BUY LICENSE → PURCHASE

## Current implementation status

This repo is at the beginning of the foundation phase and includes:

- user registration and login APIs
- JWT-based authenticated user retrieval
- role and ownership helpers
- producer profile conversion
- beat creation and marketplace listing
- a single-page demo UI to exercise the flow

## Architecture approach

This project intentionally starts as a modular monolith in spirit, with clear domain boundaries rather than microservices. The initial modules are organized as a small set of reusable services and route handlers:

- auth
- users
- producers
- beats
- marketplace
- shared

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

## Environment variables

Create a .env.local file with at least:

```bash
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb://localhost:27017/beatmarketplace-dev
```

## Next milestone

The next targeted implementation is the checkout and purchase flow with order snapshots, price validation, payment abstraction, and entitlements.
