# OpenBots Architecture

## Package Overview

```
apps/
  web/              → Next.js frontend
  api/              → Thin Bun HTTP server (deployment entrypoint only)

packages/
  api-contract/     → Hono app, domain routes, schemas, logic (reusable implementation)
  api-client/       → Typed hc<AppType>() client for frontend consumption
  db/               → Drizzle ORM + PostgreSQL + Upstash Redis (server-only)
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
- All secrets are server-only — never in `NEXT_PUBLIC_*`

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

## Infrastructure

### Database — Supabase PostgreSQL + Drizzle

Primary persistent storage. Managed through `packages/db`.

- **ORM:** Drizzle with `postgres.js` driver
- **Connection:** `DATABASE_URL` environment variable
- **pgvector:** Extension enabled via migration — ready for future vector/semantic memory
- **Schemas:** `packages/db/src/schemas/`
- **Migrations:** `packages/db/drizzle/`

```bash
cd packages/db
bun run db:generate    # Generate migrations
bun run db:migrate     # Apply migrations
bun run db:push        # Push schema changes
bun run db:studio      # Open Drizzle Studio
```

### Redis — Upstash

Server-side ephemeral infrastructure in `packages/db/src/redis/`. Uses HTTP-based Upstash client.

Intended for caching, rate limiting, distributed locks, and short-lived execution state. Not a source of truth for persistent data.

- **Client:** `@upstash/redis` (REST-based, works in all runtimes)
- **Connection:** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- **Access:** `import { getRedis } from "@openbots/db/redis"`

### AI — Vercel AI SDK

LLM provider abstraction via the `ai` package with `@ai-sdk/openai` provider. Installed in `packages/api-contract`.

The AI SDK provides `generateText`, `streamText`, tool calling, and structured output across model providers through a unified API. Domain code uses the AI SDK directly — no custom wrapper.

- **Connection:** `OPENAI_API_KEY` (read by `@ai-sdk/openai`)

### Authentication — Better Auth

Server-side authentication in `packages/api-contract/src/lib/auth.ts`. Uses the Drizzle adapter with the existing PostgreSQL database.

Auth handler is mounted on the Hono app at `/api/auth/*`.

- **Connection:** `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL`
- **Verify:** `GET /api/auth/ok` should return `{ status: "ok" }`
- **Schema:** Run `bunx auth@latest generate --output packages/db/src/schemas/auth-schema.ts` then `bun run db:push`

### Composio — External Integrations

Server-side integration layer in `packages/api-contract/src/lib/composio.ts`. Uses `@composio/core` with `@composio/vercel` for AI SDK compatibility.

Handles OAuth connections, tool discovery, and tool execution for external apps (Gmail, Slack, GitHub, etc.) via Composio's Tool Router.

- **Connection:** `COMPOSIO_API_KEY`
- **Access:** `import { getComposio } from "./lib/composio.js"`

### Trigger.dev — Background Tasks

Durable background execution in `apps/api`. Task definitions in `apps/api/src/trigger/`.

Handles long-running agent runs, scheduled tasks, retries, and human-in-the-loop workflows. Keeps background work separate from the HTTP request lifecycle.

- **Connection:** `TRIGGER_SECRET_KEY` + `TRIGGER_PROJECT_REF`
- **Config:** `apps/api/trigger.config.ts`
- **Dev:** `npx trigger.dev@latest dev` (from `apps/api/`)

### MCP — Model Context Protocol

`@modelcontextprotocol/sdk` installed in `packages/api-contract` for future tool protocol support. Enables the agent engine to connect to external MCP servers for standardized tool discovery and execution.

No MCP servers or clients are implemented yet.

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Server only (`packages/db`) | PostgreSQL connection string |
| `UPSTASH_REDIS_REST_URL` | Server only (`packages/db`) | Upstash Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Server only (`packages/db`) | Upstash Redis auth token |
| `OPENAI_API_KEY` | Server only (`api-contract`) | OpenAI API key for AI SDK |
| `COMPOSIO_API_KEY` | Server only (`api-contract`) | Composio API key |
| `BETTER_AUTH_SECRET` | Server only (`api-contract`) | Auth encryption secret |
| `BETTER_AUTH_URL` | Server only (`api-contract`) | Auth base URL |
| `TRIGGER_SECRET_KEY` | Server only (`apps/api`) | Trigger.dev secret key |
| `TRIGGER_PROJECT_REF` | Server only (`apps/api`) | Trigger.dev project ref |
| `PORT` | Server only (`apps/api`) | API server port (default: 3001) |
| `NEXT_PUBLIC_API_URL` | Web app (`apps/web`) | API base URL for the client |

## Getting Started

```bash
bun install

# Copy and fill environment variables
cp .env.example .env

# Start the API server
cd apps/api && bun run dev

# Start the web app (separate terminal)
cd apps/web && bun run dev

# Verify
curl http://localhost:3001/api/health
curl http://localhost:3001/api/auth/ok
```

## Adding New Routes

1. Create `packages/api-contract/src/routes/<domain>/<domain>.schema.ts`
2. Create `packages/api-contract/src/routes/<domain>/<domain>.logic.ts`
3. Create `packages/api-contract/src/routes/<domain>/<domain>.route.ts`
4. Mount the route in `packages/api-contract/src/index.ts`
5. The client picks up the new types automatically via `AppType`
