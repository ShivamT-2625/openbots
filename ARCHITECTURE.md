# OpenBots Backend Architecture

## Package Overview

```
apps/
  web/              → Next.js frontend
  api/              → Thin Bun HTTP server (deployment entrypoint only)

packages/
  api-contract/     → Hono app, domain routes, schemas, logic (reusable implementation)
  api-client/       → Typed hc<AppType>() client for frontend consumption
  db/               → Drizzle ORM + PostgreSQL (server-only)
  ui/               → Shared React components
```

## Dependency Graph

```
apps/web ──→ @openbots/api-client ──→ @openbots/api-contract ──→ @openbots/db

apps/api ──→ @openbots/api-contract ──→ @openbots/db
```

**Hard rules:**
- `apps/web` never imports from `apps/api` or `@openbots/db`
- `apps/api` is a thin deployment entrypoint — all logic lives in `@openbots/api-contract`
- `@openbots/api-client` is browser-safe
- `@openbots/api-contract` and `@openbots/db` are server-only

## Route Organization

Each domain follows a three-file convention inside `packages/api-contract/src/routes/`:

```
routes/
├── agents/
│   ├── agents.schema.ts    ← Zod schemas, types, enums
│   ├── agents.route.ts     ← Hono route definitions
│   └── agents.logic.ts     ← Domain/application logic
├── tasks/
├── runs/
└── connections/
```

- **`*.schema.ts`** — request/response validation and public data schemas
- **`*.route.ts`** — Hono route handlers, HTTP concerns, middleware
- **`*.logic.ts`** — domain logic called by routes; database access goes here

Route handlers delegate to the logic layer. The logic layer uses `@openbots/db` for persistence.

## Why This Architecture

### `apps/api` is thin, `packages/api-contract` has the logic
The API implementation lives in `packages/api-contract` as a reusable Hono application. `apps/api` just imports it and exposes it through Bun's HTTP server. The same API can be mounted in tests, serverless functions, or other runtimes without duplicating code.

### `apps/web` talks through `packages/api-client`
The web app communicates with the API exclusively through `@openbots/api-client`, which provides end-to-end type safety via Hono's `hc<AppType>()` RPC client.

### `packages/api-contract` is more than types
Despite the name, `api-contract` contains the full Hono route definitions, validation schemas, and domain logic. It is the reusable API implementation that any deployment entrypoint can mount.

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Server only (`packages/db`) | PostgreSQL connection string |
| `PORT` | Server only (`apps/api`) | API server port (default: 3001) |
| `NEXT_PUBLIC_API_URL` | Web app (`apps/web`) | API base URL for the client |

## Getting Started

```bash
bun install

# Start the API server
cd apps/api && bun run dev

# Start the web app (separate terminal)
cd apps/web && bun run dev

# Verify
curl http://localhost:3001/api/health
```

## Adding New Routes

1. Create `packages/api-contract/src/routes/<domain>/<domain>.schema.ts`
2. Create `packages/api-contract/src/routes/<domain>/<domain>.logic.ts`
3. Create `packages/api-contract/src/routes/<domain>/<domain>.route.ts`
4. Mount the route in `packages/api-contract/src/index.ts`
5. The client picks up the new types automatically via `AppType`

## Database

Drizzle ORM with `postgres.js` driver, configured for Supabase PostgreSQL (or any standard PostgreSQL). Schema files go in `packages/db/src/schemas/`.

```bash
cd packages/db
bun run db:generate    # Generate migrations
bun run db:push        # Push schema changes
bun run db:studio      # Open Drizzle Studio
```
