# Macro Guru Migration Plan: Streamlit → Next.js PWA

## Current State

- **Single 149-line Python file** (`main.py`) — a Streamlit chat app powered by the OpenAI Assistants API with streaming
- **No auth, no charts, no data pipelines** — purely a conversational AP Macro tutor
- **Persistence**: browser `localStorage` for OpenAI thread ID + message history (per-device only)
- **Secrets**: `OPENAI_API_KEY` + `ASSISTANT_ID` (server-side in Streamlit secrets)
- **Deploy**: Docker container on port 8080, self-hosted + tunneled to `macroguru.aravhawk.com`
- **System instructions**: Socratic teaching method, AP Macro scope, source-backed responses (stored in `system_instructions.txt`)

### Problems with Current Setup

- No proper hosting — requires self-hosting + tunneling
- No auth — no cross-device persistence
- No conversation history management
- No PWA support
- Streamlit is not ideal for production chat UX (reruns, limited styling, no offline)
- Cannot deploy to Vercel or similar managed platforms

---

## Target State

A production-grade Next.js PWA hosted on Vercel with:

- **Neon Auth** (email + OAuth) for cross-device user persistence
- **Neon Postgres** (Drizzle ORM) for storing chat threads & messages
- **Dark finance theme** — Bloomberg-terminal aesthetic for the chat UI
- **Topic suggestions** — pre-built AP Macro topic cards
- **Conversation history** — sidebar to view/resume past chats
- **PWA** — installable, offline shell caching, splash screen
- **Custom domain** `macroguru.aravhawk.com` on Vercel

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth | Neon Auth (`@neondatabase/auth` — Better Auth under the hood) |
| Database | Neon Postgres + Drizzle ORM |
| AI | OpenAI Assistants API (streaming via SSE) |
| PWA | `@serwist/next` for service worker + manifest |
| Markdown | `react-markdown` + `rehype-highlight` |
| Deployment | Vercel (custom domain `macroguru.aravhawk.com`) |
| Package Manager | pnpm |

---

## Project Structure

```
macro-guru/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (chat)/
│   │   ├── layout.tsx             # Auth-gated layout with sidebar
│   │   ├── page.tsx               # Chat view (new or active thread)
│   │   └── [threadId]/page.tsx    # Resume a specific conversation
│   ├── api/
│   │   ├── auth/[...all]/route.ts  # Neon Auth handler
│   │   ├── chat/route.ts          # Streaming assistant response (SSE)
│   │   └── threads/
│   │       ├── route.ts           # List/create threads
│   │       └── [id]/route.ts      # Get/delete thread
│   ├── layout.tsx                  # Root layout (fonts, providers)
│   └── globals.css                # Theme tokens, animations
├── components/
│   ├── ui/                         # shadcn/ui primitives
│   ├── chat/
│   │   ├── chat-area.tsx           # Message list + streaming
│   │   ├── chat-input.tsx          # Input bar with send/stop
│   │   └── message.tsx             # Individual message bubble
│   ├── sidebar/
│   │   ├── sidebar.tsx             # Thread history + new chat button
│   │   └── thread-item.tsx         # Single thread in sidebar
│   ├── topics/
│   │   └── topic-grid.tsx          # AP Macro topic suggestion cards
│   ├── auth/
│   │   └── auth-form.tsx           # Sign in/up form
│   └── header.tsx                  # App title + user menu
├── lib/
│   ├── auth/server.ts              # Neon Auth instance
│   ├── auth/client.ts              # Auth client for client components
│   ├── db/
│   │   ├── index.ts                # Drizzle + neon client
│   │   ├── schema.ts              # Threads + messages tables
│   │   └── queries.ts             # DB query helpers
│   ├── openai.ts                  # OpenAI client + assistant config
│   └── system-instructions.ts     # System prompt (from system_instructions.txt)
├── public/
│   ├── manifest.json              # PWA manifest
│   └── icons/                     # 192x192, 512x512 app icons
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── package.json
├── CLAUDE.md
└── AGENTS.md
```

---

## Database Schema (Drizzle)

```typescript
// threads table
export const threads = pgTable('threads', {
  id:            uuid('id').defaultRandom().primaryKey(),
  openaiThreadId: text('openai_thread_id').notNull(),
  userId:        text('user_id').notNull(),      // Neon Auth user ID
  title:         text('title').default('New Chat'),
  createdAt:     timestamp('created_at').defaultNow(),
  updatedAt:     timestamp('updated_at').defaultNow(),
});

// messages table
export const messages = pgTable('messages', {
  id:         uuid('id').defaultRandom().primaryKey(),
  threadId:   uuid('thread_id').references(() => threads.id),
  role:       text('role').notNull(),  // 'user' | 'assistant'
  content:    text('content').notNull(),
  createdAt:  timestamp('created_at').defaultNow(),
});
```

---

## Key Implementation Details

### 1. Streaming Chat (Server-Sent Events)

- `POST /api/chat` creates an OpenAI thread message + streaming run
- Uses `ReadableStream` with `TextEncoder` for SSE response
- Client consumes via `EventSource` or `fetch` with `ReadableStream`
- Streaming cursor animation (blinking block) mirrors Streamlit's "Thinking..." UX
- System instructions loaded from `lib/system-instructions.ts` (ported from `system_instructions.txt`)
- `OPENAI_API_KEY` and `ASSISTANT_ID` stay server-side only — never exposed to client

### 2. Topic Suggestions

Pre-defined AP Macro topics displayed as cards on the empty chat state:

- GDP & Economic Growth
- Inflation & CPI
- Monetary Policy & the Fed
- Fiscal Policy & Government Spending
- Unemployment & NAIRU
- Aggregate Supply & Demand
- Money Market & Interest Rates
- The Phillips Curve
- International Trade & Exchange Rates
- Economic Indicators & Business Cycles

Each card sends a starter prompt like "Help me understand [topic]". Hidden once conversation starts.

### 3. Conversation History Sidebar

- Collapsible sidebar listing all user threads (ordered by `updatedAt` desc)
- Each thread shows title + truncated last message
- Click to navigate to `/[threadId]` and resume
- New Chat button creates fresh thread + OpenAI thread
- Thread title auto-generated from first message (or edited manually)

### 4. Auth Flow

- Neon Auth with email/password + Google OAuth
- Protected routes: `/(chat)/*` -- redirect to `/sign-in` if unauthenticated
- No guest mode (simplifies DB design, every thread has an owner)
- Session managed via cookies (Neon Auth handles this)
- Middleware checks auth on protected routes

### 5. PWA Setup

- `@serwist/next` generates service worker with precache of app shell
- `manifest.json`: name ("Macro Guru"), icons, `theme_color: #0a0a0a`, `background_color: #0a0a0a`, `display: standalone`
- Offline: app shell cached, shows "You're offline" banner when no network
- Install prompt shown on supported browsers

### 6. Design System (Dark Finance)

| Token | Value | Usage |
|---|---|---|
| Background | `#0A0A0F` | Near-black base with subtle radial gradient mesh overlays in emerald/gold at 3-5% opacity |
| Cards/Panels | `#12121A` | Glass-morphism panels with `backdrop-blur`, `0.5px border` at 10% white |
| Primary Accent | `#10B981` (Emerald) | Send buttons, active states, links |
| Secondary Accent | `#F59E0B` (Gold) | Highlights, important callouts |
| Text Primary | `#F8FAFC` | Main body text |
| Text Secondary | `#94A3B8` | Metadata, timestamps, hints |
| Heading Font | Instrument Sans | Geometric, distinctive display font |
| Body Font | System font stack | Fast rendering for chat messages |

- User messages: right-aligned with emerald-tinted background
- Assistant messages: left-aligned with subtle card background
- Animations: page-load stagger reveals, streaming typewriter effect, sidebar slide-in, topic card hover scale
- Decorative elements: subtle grid/axis-line patterns in backgrounds, not literal charts

---

## Migration Steps (Execution Order)

1. **Scaffold Next.js project** — `pnpm create next-app@latest` with TypeScript, Tailwind, App Router, Turbopack
2. **Install dependencies** — `@neondatabase/auth`, `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`, `openai`, `@serwist/next`, `react-markdown`, `rehype-highlight`, shadcn/ui components
3. **Set up Neon project** — Create Neon project, enable Auth, get connection strings + auth URLs
4. **Configure Neon Auth** — `lib/auth/server.ts`, `app/api/auth/[...all]/route.ts`, sign-in/up pages
5. **Define DB schema** — `lib/db/schema.ts` (threads + messages), run `drizzle-kit push`
6. **Build API routes** — `/api/chat` (streaming), `/api/threads` (CRUD)
7. **Build UI components** — Chat area, input, messages, sidebar, topic grid, header
8. **Apply dark finance theme** — Tailwind config, CSS variables, animations
9. **Integrate OpenAI** — Client setup, system instructions, streaming handler
10. **Add PWA support** — Service worker, manifest, icons, offline handling
11. **Deploy to Vercel** — Connect repo, set env vars, configure custom domain
12. **Clean up** — Remove Streamlit files (`main.py`, `Dockerfile`, `requirements.txt`), update `.gitignore`

---

## Environment Variables (Vercel)

```
OPENAI_API_KEY=sk-...
ASSISTANT_ID=asst_...
DATABASE_URL=postgresql://...           # Neon pooled connection
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=...             # 32+ char random string
```

---

## Files to Remove After Migration

- `main.py` — Streamlit app (replaced by Next.js)
- `Dockerfile` — Docker config (replaced by Vercel)
- `requirements.txt` — Python deps (replaced by `package.json`)
- `system_instructions.txt` — Ported to `lib/system-instructions.ts`
- `.streamlit/` — Streamlit config (if it exists)

## Files to Keep/Update

- `.gitignore` — Update for Node.js project (add `node_modules/`, `.env.local`, `.next/`, etc.)
- `system_instructions.txt` — Keep as reference, content ported to TypeScript