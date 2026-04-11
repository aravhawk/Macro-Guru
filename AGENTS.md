<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Macro Guru — Project Architecture

**Stack**: Next.js 16 (App Router, Turbopack, TypeScript), Tailwind CSS v4, shadcn/ui, Better Auth, Neon Postgres (Drizzle ORM), OpenAI Assistants API, @serwist/next PWA

**Key Conventions**:
- Dark finance theme is always-on (no light mode toggle) — all color tokens are in `globals.css`
- Auth uses Better Auth (singleton in `lib/auth/server.ts`) — not Neon Auth directly
- DB uses Drizzle ORM with `drizzle-orm/neon-serverless` — connection string via `DATABASE_URL`
- Streaming chat via SSE in `app/api/chat/route.ts` — client consumes with `ReadableStream`
- PWA service worker is in `public/sw.js` — Serwist is disabled in dev mode
- All chat routes are under `app/(chat)/` — auth-gated via middleware + client-side redirect
- Auth pages are under `app/(auth)/` — unauthenticated access only
