# My Intelligent Portfolio

A full-stack personal portfolio with an admin dashboard, contact form, and JARVIS voice assistant. Built with **TanStack Start + React 19**, styled with **Tailwind v4 and shadcn/ui**, backed by **Cloudflare Workers, D1, and KV**, with **Drizzle ORM** and custom session auth — deployed via Wrangler.

This is a **full-stack SSR React app** deployed as a single Cloudflare Worker — not a separate frontend + backend.

---

## Quick Start

Choose **local Node development** for day-to-day coding, or **Docker** for a reproducible, production-like runtime without installing Node on the host.

### Prerequisites

| Method | Requirements |
|---|---|
| **Local (Node)** | [Node.js](https://nodejs.org/) 18+, [npm](https://www.npmjs.com/) |
| **Docker** | [Docker Engine](https://docs.docker.com/engine/install/) 24+ or [Docker Desktop](https://www.docker.com/products/docker-desktop/), with Docker Compose v2 |

---

### Option A — Run locally (Node)

```bash
# 1. Go to the app folder
cd Anurag313y

# 2. Install dependencies
npm install

# 3. Set up environment variables
copy .dev.vars.example .dev.vars
# Edit .dev.vars — see Environment Variables section below

# 4. Apply local database migrations
npm run db:migrate:local

# 5. Start the dev server
npm run dev
```

Open **http://127.0.0.1:5173** in your browser.

> **Tip:** You can also run `npm run dev` from the repo root — it forwards to `Anurag313y/` automatically.

---

### Option B — Run with Docker (recommended on Windows)

From the **repo root**, Docker builds the app, applies local D1 migrations, and serves the Worker via Wrangler.

```bash
# 1. Create secrets file (if you don't have one yet)
copy .dev.vars.example .dev.vars
# macOS/Linux: cp .dev.vars.example .dev.vars

# 2. Edit .dev.vars — at minimum set ADMIN_EMAIL and ADMIN_PASSWORD
#    Optional: RESEND_*, DEEPGRAM_API_KEY, COHERE_API_KEY

# 3. Build and start
npm run docker:up
# Or: docker compose up --build -d
```

Open **http://127.0.0.1:8787** or **http://127.0.0.1:5173** in your browser (use `http://`, not `https://`).

| Command | Purpose |
|---|---|
| `npm run docker:up` | Build and start in the background |
| `npm run docker:logs` | Stream container logs |
| `npm run docker:down` | Stop and remove containers |
| `npm run docker:restart` | Rebuild and recreate after Dockerfile changes |
| `docker compose ps` | Check service and health status |

> **Windows:** Ports are bound to `127.0.0.1` so browsers can reach the app through Docker Desktop. The container runs `wrangler dev` with local D1/KV emulation — ideal when native `npm run dev` fails on Windows. See [Docker Deployment](#docker-deployment).

---

## Project Structure

```
My-Intellegent-portfolio/
├── Anurag313y/              # Main application (all code lives here)
│   ├── src/
│   │   ├── components/      # UI components (portfolio, admin, shadcn/ui)
│   │   ├── routes/          # Pages: /, /admin, /reset-password
│   │   ├── lib/             # Server logic, API functions, JARVIS
│   │   └── hooks/           # React hooks (voice assistant, etc.)
│   ├── drizzle/             # Database migrations
│   ├── public/              # Static assets (resume PDF)
│   ├── wrangler.jsonc       # Cloudflare Workers config
│   └── .dev.vars            # Local secrets (not committed)
├── package.json             # Root scripts (forwards to Anurag313y)
└── README.md
```

All application code is inside **`Anurag313y/`**. The repo root only contains wrapper scripts and documentation.

---

## Architecture

### System overview

```
                              ┌─────────────────────────┐
                              │     Visitor / Admin     │
                              └───────────┬─────────────┘
                                          │
                              ┌───────────▼─────────────┐
                              │         Client          │
                              │  React · Router · UI    │
                              │  JARVIS voice interface │
                              └───────────┬─────────────┘
                                          │
                          SSR + typed server functions
                                          │
                              ┌───────────▼─────────────┐
                              │   Cloudflare Worker     │
                              │    TanStack Start       │
                              │  auth · content · API   │
                              └───────────┬─────────────┘
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
          ┌─────────▼─────────┐ ┌─────────▼─────────┐ ┌─────────▼─────────┐
          │    D1 SQLite      │ │    KV cache       │ │  External APIs    │
          │  portfolio · auth │ │  content · limits │ │ Deepgram · Cohere │
          │  contact messages │ │                   │ │      Cohere       │
          └───────────────────┘ └───────────────────┘ └───────────────────┘
```

| Layer | Role |
|---|---|
| **Client** | SSR React pages, admin dashboard, JARVIS mic UI |
| **Worker** | Single edge app — routing, SSR, auth, and all business logic |
| **D1** | Persistent data: portfolio content, sessions, contact messages |
| **KV** | Fast cache for portfolio JSON and JARVIS rate limits |
| **External APIs** | Speech and conversational AI — keys never sent to the browser |

### Application layers

| Layer | Technology / Location |
|---|---|
| **Language** | TypeScript (strict, ES2022) |
| **Framework** | TanStack Start + TanStack Router + TanStack React Query |
| **Entry point** | `src/server.ts` → TanStack Start handler on Workers |
| **API layer** | `createServerFn` in `src/lib/api/*.functions.ts` |
| **Domain layer** | `src/lib/*.server.ts` (content, auth, jarvis, cache) |
| **Data layer** | Drizzle ORM → D1 + KV |
| **Build** | Vite 7 + `@cloudflare/vite-plugin` + Wrangler |

### Data flow

```
Browser → TanStack Router loader / React Query
       → createServerFn (portfolio · auth · contact · jarvis)
       → content.server.ts / jarvis.server.ts
       → D1 (via Drizzle) + KV cache
```

Portfolio content path:

1. Read from KV cache when possible (5-min TTL)
2. Fallback to D1
3. Merged with defaults from `portfolio-defaults.ts`
4. API keys (Cohere/Deepgram) stripped before sending public content

---

## Routes

| URL | Description |
|---|---|
| `/` | Public portfolio (Hero, About, Projects, Skills, Contact) |
| `/admin` | Admin dashboard — edit portfolio content |
| `/reset-password` | Password reset flow |

Default admin credentials come from your `.dev.vars` file on first run.

TanStack Router uses file-based routes. Portfolio content is loaded in route loaders and cached via React Query (5-minute stale time).

---

## Features

- **Dynamic portfolio** — Edit profile, projects, skills, and experience from `/admin`, stored in D1
- **Contact form** — Validated server-side with Zod, emailed to your Admin → Profile email via Resend, archived in D1
- **JARVIS voice assistant** — Deepgram STT + TTS, portfolio-aware replies via Cohere RAG or static fallback
- **AI config** — Admin can store Deepgram/Cohere API keys; keys are admin-only
- **Interactive terminal** — Client-side command simulation on the homepage (static, not AI-powered)
- **Resume download** — PDF served from `public/resume.pdf`
- **Cloudflare-native** — Single Worker handles SSR, API, and static assets

---

## Tech Stack

### Core

| Layer | Choice |
|---|---|
| **Full-stack framework** | TanStack Start |
| **UI library** | React 19 |
| **Hosting / runtime** | Cloudflare Workers (`nodejs_compat`) |
| **Build tool** | Vite 7 |
| **Database** | Cloudflare D1 (SQLite) |
| **ORM** | Drizzle ORM |
| **Cache** | Cloudflare KV (`PORTFOLIO_CACHE`) |

### Frontend (UI)

| Category | Stack |
|---|---|
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) |
| **Design system** | shadcn/ui — New York style, Slate base, CSS variables |
| **Primitives** | Radix UI (dialog, tabs, select, accordion, etc.) |
| **Icons** | Lucide React |
| **Animations** | Framer Motion (Hero, NavBar, sections) |
| **Forms** | React Hook Form + Zod validators |
| **Toasts** | Sonner |
| **Charts** | Recharts (via shadcn `chart` component) |
| **Utilities** | `clsx`, `tailwind-merge`, `class-variance-authority` |

Tailwind v4 uses a custom theme in `styles.css` with **OKLCH colors** and dark mode via a `.dark` class.

Other UI: **cmdk**, **vaul**, **embla-carousel**, **react-day-picker**, **input-otp**.

### Backend & Cloudflare Services

Configured in `wrangler.jsonc`:

| Service | Purpose |
|---|---|
| **Cloudflare Workers** | Runs the SSR app |
| **Cloudflare D1** | SQLite database (`portfolio-db`) |
| **Cloudflare KV** | Portfolio content cache + JARVIS rate limits |
| **Wrangler** | Local dev, deploy, D1 migrations, type generation |

### Voice & Chat AI

| Service | Purpose |
|---|---|
| **Deepgram** | Speech-to-text (live WebSocket) + text-to-speech |
| **Cohere** | Portfolio-aware conversational replies + RAG embeddings |

### Developer Tooling

| Tool | Role |
|---|---|
| **Vite 7** | Dev server (port 5173), build |
| **@cloudflare/vite-plugin** | Workers SSR integration |
| **ESLint 9** | Linting (React Hooks, Prettier integration) |
| **Prettier** | Formatting |
| **drizzle-kit** | Schema migrations against D1 |
| **TypeScript 5.8** | Strict type checking |

### Validation & Types

- **Zod** validates server function inputs (admin login, contact form, content updates)
- Shared types in `content.types.ts`
- Path alias `@/*` → `src/*`

---

## Environment Variables

Copy `Anurag313y/.dev.vars.example` to `Anurag313y/.dev.vars`:

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_EMAIL` | Yes | Admin login email |
| `ADMIN_PASSWORD` | Yes | Admin login password |
| `RESEND_API_KEY` | For contact form | Sends contact messages to **Admin → Profile & Contact** email |
| `RESEND_FROM` | Recommended | Verified sender, e.g. `Portfolio <hello@yourdomain.com>` |
| `DEEPGRAM_API_KEY` | For voice | JARVIS STT + TTS + auth grant |
| `COHERE_API_KEY` | Optional | AI replies + RAG embeddings (or set in admin UI) |

Never commit `.dev.vars` to Git — it is already in `.gitignore`.

**Production (Cloudflare):**

```bash
cd Anurag313y
wrangler secret put ADMIN_EMAIL
wrangler secret put ADMIN_PASSWORD
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM       # optional but required for custom domains
wrangler secret put DEEPGRAM_API_KEY
wrangler secret put COHERE_API_KEY    # optional
```

**Contact form:** Create a [Resend](https://resend.com) API key, verify your sending domain, and set `RESEND_FROM`. Submissions are emailed to the address in **Admin → Profile & Contact** (not `ADMIN_EMAIL`) and also stored in D1 `contact_messages`.

**Admin UI (API panel)** — stored in D1, never in public content:

- `cohereApiKey`, `primaryModel` (`cohere` | `static`)
- `jarvisEnabled` (kill switch)
- `deepgramSttModel`, `deepgramTtsModel` (optional tuning)

**Recommendation:** Keep `DEEPGRAM_API_KEY` in Wrangler secrets only, not in portfolio JSON.

---

## Available Scripts

Run from **`Anurag313y/`** (or use root shortcuts):

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Production build |
| `npm run deploy` | Build + deploy to Cloudflare |
| `npm run db:migrate:local` | Apply D1 migrations locally |
| `npm run db:migrate:remote` | Apply D1 migrations in production |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

**From repo root:** `npm run dev`, `npm run build`, `npm run db:migrate:local` — all forward to `Anurag313y/`.

---

## Auth & Security

Custom auth (no NextAuth/Clerk):

- **Password hashing:** Web Crypto PBKDF2 (100k iterations, SHA-256)
- **Sessions:** DB-backed sessions + HTTP-only cookie (`portfolio_session`, 7-day expiry)
- **Secrets:** From `.dev.vars` (local) or `wrangler secret put` (production)
- **Public vs admin data:** API keys stripped from public portfolio responses via `toPublicContent()`

---

## Database

D1 tables (defined in `Anurag313y/src/db/schema.ts`):

| Table | Purpose |
|---|---|
| `portfolio_content` | Editable portfolio JSON |
| `admin_users` | Admin accounts |
| `sessions` | Login sessions |
| `contact_messages` | Contact form submissions |
| `rag_chunks` | RAG embedding chunks (Cohere vectors + portfolio text) |

Migrations live in `drizzle/migrations/` and are applied with `wrangler d1 migrations apply`.

---

## JARVIS Voice Assistant

JARVIS lets visitors ask questions about the portfolio using their microphone. Deepgram handles speech ↔ text; Cohere (with RAG) or static fallback generates portfolio-aware replies. API keys are proxied through Cloudflare Workers — never exposed to the browser.

**How it works:**

1. User speaks → browser records audio via `MediaRecorder`
2. Audio sent to server → Deepgram pre-recorded STT returns transcript
3. Text sent to server → Cohere generates a RAG-enhanced portfolio-aware reply
4. Reply converted to speech → Deepgram TTS plays natural voice audio

### JARVIS architecture

```mermaid
flowchart TB
  subgraph Browser["Client — Browser"]
    User((User))
    Hero["Hero.tsx<br/>JARVIS UI"]
    Hook["use-jarvis-voice.ts<br/>MediaRecorder"]
    User --> Hero
    Hero --> Hook
  end

  subgraph Cloudflare["Cloudflare Edge"]
    Worker["TanStack Start Worker<br/>server.ts"]
    subgraph Functions["Jarvis Server Functions"]
      SttFn["transcribeJarvisSpeech"]
      AskFn["askJarvis"]
      TtsFn["synthesizeJarvisSpeech"]
    end
    RAG["rag.server.ts<br/>chunk · embed · search"]
    D1[("D1 SQLite<br/>portfolio + rag_chunks")]
    KV[("KV<br/>cache · rate limit · RAG status")]
    Worker --> Functions
    Functions --> RAG
    RAG --> D1
    Functions --> D1
    Functions --> KV
    RAG --> KV
  end

  subgraph APIs["External APIs"]
    Deepgram["Deepgram<br/>STT · TTS"]
    Cohere["Cohere<br/>chat + embed"]
  end

  Hook -->|"server fn calls"| Worker
  SttFn -->|"POST /v1/listen"| Deepgram
  TtsFn -->|"POST /v1/speak"| Deepgram
  AskFn -->|"RAG retrieve + chat"| Cohere
  RAG -->|"embed on save"| Cohere
```

| Layer | Components | Role |
|---|---|---|
| **Client** | `Hero.tsx`, `use-jarvis-voice.ts` | Mic capture, transcript UI, audio playback |
| **Worker** | `jarvis.functions.ts`, `jarvis.server.ts`, `deepgram.server.ts`, `llm.server.ts`, `rag.server.ts` | Proxy secrets, RAG, LLM routing, rate limits |
| **Cloudflare data** | D1, KV | Portfolio content, RAG chunks, sessions, cache, per-IP limits |
| **External** | Deepgram, Cohere | Speech ↔ text, chat + embeddings |

### Voice request flow

```mermaid
sequenceDiagram
  participant User
  participant Hero as Hero_Jarvis_UI
  participant Worker as Cloudflare_Worker
  participant DG as Deepgram
  participant Cohere as Cohere_API

  User->>Hero: Tap mic (record)
  Hero->>Worker: transcribeJarvisSpeech(audio)
  Worker->>DG: POST /v1/listen
  DG-->>Worker: transcript
  Worker-->>Hero: transcript text

  Hero->>Worker: askJarvis(message, history?)
  Worker->>Cohere: embed query + retrieve top chunks from D1
  Worker->>Cohere: chat with RAG system prompt
  Cohere-->>Worker: reply text
  Worker-->>Hero: reply + optional actions

  Hero->>Worker: synthesizeJarvisSpeech(text)
  Worker->>DG: POST /v1/speak
  DG-->>Worker: audio bytes
  Worker-->>Hero: audio blob (base64)
  Hero->>User: Play natural voice
```

**Why server-proxied Deepgram?**

| Concern | Approach |
|---|---|
| **API key security** | Main Deepgram key stays on the Worker — never sent to the browser |
| **STT + TTS control** | Server handles billing, model selection, and rate limits centrally |

### Hero UI states

`Anurag313y/src/components/portfolio/Hero.tsx`:

- States: `ready` → `listening` → `processing` → `responding`
- **STT:** `MediaRecorder` → server `transcribeJarvisSpeech` → Deepgram pre-recorded API
- **TTS:** Server-proxied Deepgram Aura voice (`synthesizeJarvisSpeech`)
- **Brain:** Server-side `askJarvis` → Cohere RAG / static fallback
- Suggestion chips call text-only `handleQuery(text)`

### APIs & keys

#### Deepgram (required for voice)

| Purpose | Endpoint | Auth |
|---|---|---|
| STT (server) | `POST https://api.deepgram.com/v1/listen?model=nova-3` | `Authorization: Token <DEEPGRAM_API_KEY>` |
| TTS (server) | `POST https://api.deepgram.com/v1/speak?model=aura-2-thalia-en&encoding=mp3` | `Authorization: Token <DEEPGRAM_API_KEY>` |

Get a key from [Deepgram Console](https://console.deepgram.com/). Suggested models: STT `nova-3`, TTS `aura-2-thalia-en`.

#### Conversational brain + RAG

| Provider | When to use |
|---|---|
| **Cohere** | Admin `primaryModel: cohere` — chat (`command-r-08-2024`) + embeddings (`embed-english-v3.0`) for RAG |
| **Static fallback** | `primaryModel: static` or missing Cohere key |

RAG indexes portfolio sections + Knowledge Base into D1 on every admin save. At query time, hybrid retrieval combines semantic search with intent-based chunk boosting.

#### Browser (no keys)

- `getUserMedia({ audio: true })` — mic permission
- `HTMLAudioElement` — play Deepgram MP3 response

### Server implementation

| File | Responsibility |
|---|---|
| `src/lib/api/jarvis.functions.ts` | `createServerFn` endpoints |
| `src/lib/jarvis.server.ts` | Deepgram token grant, TTS proxy, LLM routing |
| `src/lib/deepgram.server.ts` | Fetch wrappers for grant + speak |
| `src/lib/llm.server.ts` | Cohere adapter + RAG/full-context prompt builder |
| `src/lib/rag.server.ts` | Chunking, Cohere embeddings, D1 storage, hybrid retrieval |
| `src/lib/jarvis-answer.server.ts` | Static fallback answers |
| `src/lib/jarvis-actions.ts` | Structured scroll / resume actions |

**Server functions (public, rate-limited):**

1. **`transcribeJarvisSpeech`** — `{ audioBase64, mimeType }` → Deepgram STT transcript
2. **`askJarvis`** — `{ message, history? }` → RAG retrieval + Cohere chat, returns `{ text, actions? }`
3. **`synthesizeJarvisSpeech`** — `{ text }` → returns `audio/mpeg` bytes (base64)

**Rate limiting** (Cloudflare KV): max **30** `askJarvis` + **60** TTS requests per IP per hour → `429` when exceeded.

### Client implementation

Hook: `Anurag313y/src/hooks/use-jarvis-voice.ts`

| Step | Behavior |
|---|---|
| Start listen | Request mic → `MediaRecorder` captures audio chunks |
| Stop / finalize | Stop recorder → `transcribeJarvisSpeech` → `askJarvis` |
| Respond | Play audio from `synthesizeJarvisSpeech` via blob URL |
| Actions | Map `scrollTo` ids to `scrollIntoView` / `window.open` for resume |
| Errors | Toast + revert to `ready` |

### System prompt (JARVIS personality)

Short answers for voice (1–3 sentences), first-person as assistant, only portfolio data from context, refuse unrelated requests politely.

### JARVIS setup checklist

1. Add `DEEPGRAM_API_KEY` to `.dev.vars`
2. Run `npm run dev`
3. Chrome/Edge: grant mic → speak → hear Aura voice reply
4. Admin: set `primaryModel` to `cohere`, save Cohere key, verify RAG index status
5. Verify public `getPortfolioContent` has **no** API keys
6. Production: `wrangler secret put DEEPGRAM_API_KEY` then smoke test

| Service | What you get | Used for |
|---|---|---|
| **Deepgram** | API key | STT, TTS |
| **Cohere** | API key | Chat + RAG embeddings |
| **Browser** | Mic permission | Audio capture |

### Implementation status

| Phase | Deliverable | Status |
|---|---|---|
| **1** | Worker secrets + `getDeepgramToken` + live STT in Hero | Done |
| **2** | `synthesizeJarvisSpeech` + replace `speechSynthesis` | Done |
| **3** | `askJarvis` + Cohere + structured scroll actions | Done |
| **4** | KV rate limits + admin kill switch + error/fallback UX | Done |
| **5** | RAG pipeline (chunk · embed · D1 · hybrid retrieval) + admin index status | Done |

---

## Deployment

```bash
cd Anurag313y

# One-time: set production secrets
wrangler secret put ADMIN_EMAIL
wrangler secret put ADMIN_PASSWORD
wrangler secret put RESEND_API_KEY
wrangler secret put DEEPGRAM_API_KEY

# Apply remote migrations (before first deploy)
npm run db:migrate:remote

# Build and deploy
npm run deploy
```

The Worker is named **`anurag-portfolio`** with observability enabled (see `wrangler.jsonc`).

## Docker Deployment

This project is a **single Cloudflare Worker SSR app** (TanStack Start). The containerization uses an **optimized multi-stage Dockerfile** and runs the Worker using **`wrangler dev`** with an explicit port so the service is reachable from the container and can be health-checked.

### Architecture & strategy
- **Multi-stage build** for smaller images and better caching:
  - `build` stage: **Node 22 Alpine** — `npm ci` + `npm run build`
  - `runtime` stage: **Node 22 Debian slim** (glibc required by workerd)
- **Production-like runtime**: container starts **Wrangler dev** (`wrangler dev`) on `0.0.0.0:8787` inside the container.
- **Host ports**: `127.0.0.1:8787` and `127.0.0.1:5173` → container `8787` (Windows-friendly).
- **Non-root user**: the runtime image runs as a non-root `app` user.
- **Health check**: Docker probes `GET http://127.0.0.1:8787/` and requires an HTTP 2xx/3xx response.

### Environment variables
Docker Compose loads secrets from **`.dev.vars`** at the repo root (same file as local Wrangler dev).

1. Create your secrets file:
```bash
copy .dev.vars.example .dev.vars
```

2. Fill in values:
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (required)
- `RESEND_API_KEY`, `RESEND_FROM` (contact form)
- `DEEPGRAM_API_KEY` (JARVIS voice)
- Optional: `COHERE_API_KEY`

For `docker run` without Compose, use `docker/.env.example` → `docker/.env` with `--env-file docker/.env`.

> Secrets are kept in local env files and not committed.

### Local build + run (Docker)
From the repo root:

#### Build
```bash
docker build -t anurag-portfolio:local .
```

#### Run
```bash
docker run --rm -p 127.0.0.1:8787:8787 -p 127.0.0.1:5173:8787 --env-file ./.dev.vars anurag-portfolio:local
```

#### Stop
```bash
docker ps
docker stop <container_id>
```

#### Rebuild
```bash
docker build --no-cache -t anurag-portfolio:local .
```

#### View logs
```bash
docker logs -f <container_id>
```

### Docker Compose
```bash
# Build + start
docker compose up --build

# Stop
docker compose down

# Rebuild
docker compose up --build --force-recreate

# Logs
docker compose logs -f
```

### Deploy on Docker-compatible platforms (Render / AWS / DO / DigitalOcean)
This image runs `wrangler dev` for local container testing (HTTP on **8787** / **5173** on the host). For Docker-compatible production deployments, push the image to your registry and set environment variables via the platform UI using the same keys as `.dev.vars`.

Suggested container port:
- `8787`

1. Push image:
- Docker Hub: `docker tag anurag-portfolio:local <your-dockerhub-user>/anurag-portfolio:<tag>` then `docker push ...`
- GHCR / ECR: follow your provider’s standard flow

2. Configure the platform service:
- Container image: your pushed image
- Port: `8787`
- Environment variables: load from your configured secrets (same names as `.dev.vars`)

> Note: Cloudflare Workers deployment to the edge should still use `wrangler deploy` as documented in the existing README “Deployment” section.

---
RAG improvements (Cohere)
Improvement	What changed
Hybrid retrieval
Semantic top-5 + focus-based chunks (projects → project chunks, etc.)
Query embed cache
KV cache (1h TTL) avoids re-embedding repeat questions
Batch D1 writes
Re-index uses Drizzle db.batch() (25 inserts per batch)
Index status tracking
KV stores idle / indexing / ready / failed / unconfigured
Admin status UI
Live badge + auto-poll while indexing + manual re-index
API
getRagIndexStatus + reindexRag returns status


## Development Notes

- **Path alias:** `@/*` maps to `src/*` inside `Anurag313y/`
- **JARVIS dependency:** `@deepgram/sdk` on client for live STT; server uses `fetch` for grant + speak
- **Rate limiting:** JARVIS endpoints rate-limited per IP via Cloudflare KV
