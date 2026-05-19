# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm run build:vercel` — build for Vercel (API bundle + frontend static files)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Vercel Deployment

The project is ready for Vercel. Configuration lives in `vercel.json` at the root.

**Vercel project settings:**
- Framework Preset: Other
- Build Command: `pnpm run build:vercel`
- Output Directory: `artifacts/forgotten-realms/dist/public`
- Install Command: `pnpm install`

**Required environment variables in Vercel dashboard:**
- `DATABASE_URL` — PostgreSQL connection string
- `OPENAI_API_KEY` — Standard OpenAI API key (outside Replit, use this instead of the Replit integration vars)

The API is served via a Vercel serverless function at `api/index.js`, which imports the pre-built Express bundle from `artifacts/api-server/dist/vercel.mjs`. All `/api/*` routes are forwarded to that function; all other routes serve the SPA.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
