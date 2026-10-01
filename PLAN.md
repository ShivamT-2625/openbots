# OpenBots Implementation Plan

## Current State

| Component | Status | Location |
|---|---|---|
| DB schema (11 tables, 9 enums) | ✅ Complete & migrated | `packages/db/src/schemas/` |
| Drizzle ORM + Supabase Postgres | ✅ Configured | `packages/db/src/client.ts` |
| Upstash Redis | ✅ Client ready | `packages/db/src/redis/` |
| Better Auth server | ✅ Configured (email/password not enabled, no frontend) | `packages/api-contract/src/lib/auth.ts` |
| Hono API with domain routes | ✅ Agents, runs, conversations auth-protected | `packages/api-contract/src/` |
| Connections route | ⚠️ Stub — returns hardcoded placeholders | `packages/api-contract/src/routes/connections/` |
| Tasks route | ⚠️ Stub — returns hardcoded placeholders | `packages/api-contract/src/routes/tasks/` |
| Agent runtime (ToolLoopAgent) | ✅ Complete with atomic claim, cancellation, step persistence | `apps/api/src/agent/execute.ts` |
| Tool resolver (internal + Composio + MCP) | ✅ Complete with cleanup | `apps/api/src/agent/tools.ts` |
| Trigger.dev agent-run task | ✅ Configured with idempotency, onCancel | `apps/api/src/trigger/agent-run.ts` |
| Hono RPC client | ✅ Typed `hc<AppType>` | `packages/api-client/src/index.ts` |
| UI library (54 shadcn components) | ✅ base-vega, tabler icons, chat primitives | `packages/ui/src/components/` |
| Frontend workspace | ⚠️ Single `page.tsx`, no auth UI, no sidebar, no routing, dev `x-user-id` header | `apps/web/` |
| Streaming | ❌ Not implemented — uses `agent.generate()` + polling | — |
| Scheduling UI | ❌ Not implemented | — |
| Connections UI | ❌ Not implemented | — |
| Agent delete | ❌ No endpoint or UI | — |

---

## Phase 0 — Shared Infrastructure & Middleware

1. **Shared Auth Middleware**: Single source of truth in `packages/api-contract/src/middleware/auth.ts`. Extracts user from Better Auth session cookie. Dev fallback for `NODE_ENV !== "production"`.
2. **Shared Error Handling**: `packages/api-contract/src/middleware/error-handler.ts` & `packages/api-contract/src/lib/errors.ts` for clean sanitization, typed errors (400, 401, 403, 404, 500).
3. **Request Context**: Request ID tracing + JSON structured logging.
4. **CORS & Types**: Proper credentials-enabled CORS on API + typed context `AppEnv`.

## Phase 1 — Authentication

1. Enable `emailAndPassword: { enabled: true }` in Better Auth config.
2. Install & configure Better Auth client in `apps/web` (`lib/auth-client.ts`).
3. Build auth pages (`app/(auth)/login/page.tsx`, `signup/page.tsx`, `layout.tsx`).
4. Replace `x-user-id` with cookie session in `apps/web/lib/api.ts` (`credentials: "include"`).
5. Build `AuthGuard` and `UserContext`.

## Phase 2 — Workspace Layout & Routing

1. Route structure:
   - `app/(auth)/...`
   - `app/(workspace)/layout.tsx` (sidebar + persistent shell)
   - `app/(workspace)/page.tsx` (zero agent empty state or redirect)
   - `app/(workspace)/agent/[id]/page.tsx` (route-based agent selection)
2. Build persistent sidebar: agent search, agent list, account menu with sign-out, new agent trigger.

## Phase 3 — Conversations & Messages

1. Wire conversations per agent; load previous messages on mount.
2. Reconcile optimistic user messages with DB persistence.
3. Refresh preserves conversation history from DB.

## Phase 4 — Streaming

1. Add `POST /api/agents/:id/stream` (SSE text/event-stream).
2. Use `ToolLoopAgent.stream()` with token deltas & inline tool executions.
3. Keep Trigger.dev background path intact for background/scheduled work.
4. Frontend SSE reader hook with progressive token rendering.

## Phase 5 — Agent CRUD & Delete

1. Add `DELETE /api/agents/:id` with DB cascade.
2. Add delete button and confirmation modal in UI.

## Phase 6 — Real Connections (Composio)

1. Implement real Composio OAuth connect link initiation & completion.
2. Connect/disconnect UI sheet in web workspace.

## Phase 7 — Scheduling (Trigger.dev)

1. Add `schedules` schema to DB.
2. Natural language parsing ("Wake me up at 7 AM every day") -> cron expression.
3. Trigger.dev scheduled task triggering `executeAgentRun`.
4. Schedules manager sheet in UI.

## Phase 8 — Production Polish & Verification

1. Loading skeletons, error boundaries, toast notifications.
2. Verification: typecheck, lint, build across monorepo.
