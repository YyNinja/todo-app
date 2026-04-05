# Architecture

## Stack

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| Framework | Next.js (App Router) | 16.x | Full-stack React framework |
| Language | TypeScript | 5.x | Type safety across the entire codebase |
| API | tRPC | 11.x | End-to-end type-safe RPC layer |
| ORM | Prisma | 7.x | Database access and migrations |
| Database | PostgreSQL | — | Primary data store |
| Cache | Redis (ioredis) | 5.x | Query result caching |
| Auth | Better Auth | 1.x | Session management, OAuth, email/password |
| AI | Anthropic SDK | 0.82+ | Natural language parsing, todo prioritization |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| State | TanStack Query | 5.x | Server state, caching via tRPC adapter |

## Directory Layout

```
src/
  app/                      # Next.js App Router pages and routes
    api/
      auth/[...all]/        # Better Auth catch-all handler
      trpc/[trpc]/          # tRPC HTTP handler
    layout.tsx
    page.tsx
  lib/                      # Shared singletons and utilities
    auth.ts                 # Better Auth server config
    auth-client.ts          # Better Auth browser client
    ai.ts                   # Anthropic client + AI helpers
    db.ts                   # Prisma client singleton
    redis.ts                # Redis client + cache helpers
    trpc.ts                 # tRPC client-side setup
  server/
    routers/
      _app.ts               # Root router (merges sub-routers)
      todos.ts              # Todo CRUD + AI operations
      lists.ts              # Shared list management
    trpc/
      context.ts            # Per-request context (db, session, userId)
      trpc.ts               # tRPC init, publicProcedure, protectedProcedure
  components/               # Shared React components
  hooks/                    # Custom React hooks
  types/                    # Shared TypeScript types
prisma/
  schema.prisma             # Database schema
```

## Data Model

```
User ──< Session          (Better Auth session management)
User ──< Account          (OAuth provider accounts)
User ──< Todo             (owned todos)
User ──< List             (owned lists)
User ──< ListMember       (list memberships)
User ──< Comment          (todo comments)

List ──< Todo             (todos belong to a list, optional)
List ──< ListMember       (members with roles: owner | member | viewer)
Todo ──< Comment          (discussion thread on a todo)
```

**Todo fields of note:**
- `priority`: enum `low | medium | high | urgent`
- `aiSuggested`: flag set when created via natural language input
- `aiContext`: JSON blob storing original NL input for auditability

## Request Flow

```
Browser
  └─ TanStack Query + tRPC client
       └─ POST /api/trpc/[procedure]
            └─ createTRPCContext()          # resolves session via Better Auth
                 └─ protectedProcedure      # enforces auth
                      └─ router handler     # business logic + Prisma + Redis
```

## Auth

Better Auth handles:
- Email/password sign-up and sign-in
- Google and GitHub OAuth
- 30-day sessions with daily token refresh
- Session resolution is called once per request in `createTRPCContext`

OAuth credentials are injected via `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

## Caching

Redis is used for read-heavy queries:
- Todo list results cached for 60 seconds, keyed by `todos:{userId}:{filters}`
- Top-3 AI prioritization cached for 5 minutes, keyed by `todos:top3:{userId}`
- Cache is invalidated on any write to that user's todos

## AI Features

Two capabilities powered by `claude-haiku-4-5-20251001`:

1. **Natural language todo capture** (`parseTodoFromNaturalLanguage`): takes free-text input, returns structured `{ title, description, priority, dueDate, tags }`.
2. **Daily Top 3** (`prioritizeTodos`): scores up to 20 open todos 0–100 and returns the three highest-priority items with reasoning.

Both functions parse JSON from model output and propagate errors to tRPC callers.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for AI features |
| `BETTER_AUTH_SECRET` | Yes | Secret for Better Auth JWT signing |
| `GOOGLE_CLIENT_ID` | OAuth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | OAuth | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | OAuth | GitHub OAuth client secret |

## Key Conventions

- **`protectedProcedure`** enforces authentication; unauthenticated calls throw `UNAUTHORIZED`.
- **User-scoping**: all queries filter by `userId: ctx.userId` — users never see other users' data.
- **Prisma singleton**: `db.ts` uses a global variable to avoid exhausting connections in Next.js dev hot-reload cycles.
- **superjson** transformer on tRPC handles `Date`, `bigint`, and `undefined` round-trips correctly.
