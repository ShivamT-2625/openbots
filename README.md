# OpenBots

> 🚧 **OpenBots is currently in active development.**

OpenBots is a platform for creating **personal AI agents** that can work on your behalf.

Create multiple AI bots with different personalities, skills, and responsibilities. Connect them to the apps and services you already use, then let them handle tasks, workflows, and everyday digital work for you.

### Why OpenBots?

* 🤖 **Multiple AI agents** — Create specialized bots for different tasks.
* 🧠 **Personalities & skills** — Customize how each agent thinks and works.
* 🔌 **App integrations** — Connect your agents to the tools you already use.
* ⚡ **Autonomous work** — Let agents execute tasks and workflows on your behalf.
* 🔒 **Secure by default** — Built with security and user control as core principles.
* 🏠 **Self-hostable** — Run OpenBots on your own infrastructure.
* 🆓 **Free & open** — No mandatory paid service required to run your own instance.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, Tailwind CSS |
| API | Hono (with end-to-end typed RPC) |
| Validation | Zod |
| Database | Drizzle ORM, PostgreSQL (Supabase) |
| Runtime | Bun |
| Monorepo | Turborepo |

## Project Structure

```
apps/
  web/              → Next.js frontend
  api/              → Bun HTTP server (deployment entrypoint)

packages/
  api-contract/     → Hono routes, schemas, domain logic
  api-client/       → Typed RPC client for frontend
  db/               → Drizzle ORM + PostgreSQL
  ui/               → Shared React components
  eslint-config/    → Shared ESLint configuration
  typescript-config/→ Shared TypeScript configuration
```

The API implementation lives entirely in `packages/api-contract`. The `apps/api` entrypoint just mounts it on Bun's HTTP server. The frontend never imports from `apps/api` directly — it goes through `packages/api-client`, which provides full type safety via Hono RPC.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full dependency graph and design rationale.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.4
- PostgreSQL (or a [Supabase](https://supabase.com/) project)

### Setup

```bash
# Clone and install
git clone https://github.com/your-org/openbots.git
cd openbots
bun install
```

### Environment Variables

Create `.env` files as needed:

```bash
# apps/api/.env (or packages/db/.env)
DATABASE_URL="postgresql://user:pass@localhost:5432/openbots"

# apps/web/.env.local
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### Development

```bash
# Start the API server (port 3001)
cd apps/api && bun run dev

# Start the web app (separate terminal)
cd apps/web && bun run dev

# Verify the API is running
curl http://localhost:3001/api/health
```

### Commands

```bash
bun run dev         # Start all apps in dev mode
bun run build       # Build everything
bun run typecheck   # TypeScript check across all packages
bun run lint        # Lint all packages
```

### Database

```bash
cd packages/db
bun run db:generate   # Generate migrations from schema
bun run db:push       # Push schema to database
bun run db:studio     # Open Drizzle Studio
```

## Contributing

OpenBots is still early. The backend foundation (API routing, typed client, database layer) is in place. The following are not yet implemented:

- Authentication
- Agent runtime / execution engine
- Composio integrations
- Trigger.dev workers
- Redis
- Memory / pgvector

> **Note:** OpenBots is under active development and is not production-ready yet.
