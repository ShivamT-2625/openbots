# OpenBots Backend Architecture

## Package Overview

```
apps/
  web/          → Next.js frontend (existing)
  api/          → Thin Bun HTTP server (deployment entrypoint)

packages/
  api/          → Hono app, routes, middleware (reusable implementation)
  api-client/   → Typed hc<AppType>() client for frontend consumption
  api-contracts/→ Shared Zod schemas, enums, types (browser-safe)
  db/           → Drizzle ORM + PostgreSQL (server-only)
  ui/           → Shared React components (existing)
```

## Dependency Graph

```
apps/web ──→ @openbots/api-client ──→ @openbots/api ──→ @openbots/db
                   │                        │
                   └──→ @openbots/api-contracts ←──┘

apps/api ──→ @openbots/api
```

**Hard rules:**
- `apps/web` never imports from `apps/api` or `@openbots/db`
- `apps/api` is a thin entrypoint — all logic lives in `@openbots/api`
- `@openbots/api-client` and `@openbots/api-contracts` are browser-safe
- `@openbots/api` and `@openbots/db` are server-only

## Why This Architecture

### `apps/api` is thin, `packages/api` has the logic
The API implementation (`packages/api`) is a reusable Hono application. `apps/api` just imports it and exposes it through Bun's HTTP server. This means the same API can be mounted in tests, serverless functions, or other runtimes without duplicating code.

### `apps/web` talks through `packages/api-client`
The web app communicates with the API exclusively through `@openbots/api-client`, which provides end-to-end type safety via Hono's `hc<AppType>()` RPC client. The web app never imports server-only code.

### `packages/api-contracts` holds shared validation
Public Zod schemas and enums live in `@openbots/api-contracts`. Both the API routes and the client can use these for validation without pulling in server dependencies. If a type can be inferred from Hono's route definitions via `AppType`, prefer that over duplicating it here.

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Server only (`packages/db`) | PostgreSQL connection string |
| `PORT` | Server only (`apps/api`) | API server port (default: 3001) |
| `NEXT_PUBLIC_API_URL` | Web app (`apps/web`) | API base URL for the client |

## Getting Started

```bash
# Install dependencies
bun install

# Typecheck everything
bun run typecheck

# Start the API server
cd apps/api && bun run dev

# Start the web app (separate terminal)
cd apps/web && bun run dev
```

## Adding New Routes

1. Add Zod schemas to `packages/api-contracts/src/<resource>.ts`
2. Create route module in `packages/api/src/routes/<resource>.ts`
3. Mount the route in `packages/api/src/app.ts`
4. The client picks up the new types automatically via `AppType`

## Database

The database package uses Drizzle ORM with `postgres.js` driver, configured for Supabase PostgreSQL (or any standard PostgreSQL). Schema files go in `packages/db/src/schema/`.

```bash
# Generate migrations
cd packages/db && bun run db:generate

# Push schema changes
cd packages/db && bun run db:push

# Open Drizzle Studio
cd packages/db && bun run db:studio
```
