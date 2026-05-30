# My Intelligent Portfolio

A full-stack personal portfolio with an admin dashboard, contact form, and JARVIS voice assistant. Built with TanStack Start and deployed on Cloudflare Workers.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [npm](https://www.npmjs.com/)

### Run locally

```bash
# 1. Go to the app folder
cd Anurag313y

# 2. Install dependencies
npm install

# 3. Set up environment variables
copy .dev.vars.example .dev.vars
# Edit .dev.vars with your admin email, password, and API keys

# 4. Apply local database migrations
npm run db:migrate:local

# 5. Start the dev server
npm run dev
```

Open **http://127.0.0.1:5173** in your browser.

> **Tip:** You can also run `npm run dev` from the repo root — it forwards to `Anurag313y/` automatically.

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

## Environment Variables

Copy `Anurag313y/.dev.vars.example` to `Anurag313y/.dev.vars` and fill in:

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_EMAIL` | Yes | Admin login email |
| `ADMIN_PASSWORD` | Yes | Admin login password |
| `DEEPGRAM_API_KEY` | For voice | JARVIS speech-to-text and text-to-speech |
| `GEMINI_API_KEY` | Optional | AI replies (or set in admin UI) |
| `COHERE_API_KEY` | Optional | AI replies (or set in admin UI) |

Never commit `.dev.vars` to Git — it is already in `.gitignore`.

---

## Available Scripts

Run these from **`Anurag313y/`** (or use root shortcuts where noted):

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Production build |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run db:migrate:local` | Apply D1 migrations locally |
| `npm run db:migrate:remote` | Apply D1 migrations in production |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

**From repo root:**

| Command | Description |
|---|---|
| `npm run dev` | Same as `cd Anurag313y && npm run dev` |
| `npm run build` | Same as `cd Anurag313y && npm run build` |
| `npm run db:migrate:local` | Same as above for migrations |

---

## Routes

| URL | Description |
|---|---|
| `/` | Public portfolio (Hero, About, Projects, Skills, Contact) |
| `/admin` | Admin dashboard — edit portfolio content |
| `/reset-password` | Password reset flow |

Default admin credentials come from your `.dev.vars` file on first run.

---

## Features

- **Dynamic portfolio** — Edit profile, projects, skills, and experience from `/admin`
- **Contact form** — Messages saved to the database
- **JARVIS voice assistant** — Speak to the portfolio; get voice replies powered by Deepgram + Gemini/Cohere
- **Interactive terminal** — Command-style UI section on the homepage
- **Resume download** — PDF served from `public/resume.pdf`
- **Cloudflare-native** — Single Worker handles SSR, API, and static assets

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start + TanStack Router |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Database | Cloudflare D1 (SQLite) + Drizzle ORM |
| Cache | Cloudflare KV |
| Hosting | Cloudflare Workers |
| Build | Vite 7 + Wrangler |
| Voice AI | Deepgram (STT/TTS) |
| Chat AI | Google Gemini or Cohere (configurable in admin) |

---

## JARVIS Voice Assistant

JARVIS lets visitors ask questions about the portfolio using their microphone.

**How it works:**

1. User speaks → Deepgram converts speech to text (browser WebSocket)
2. Text is sent to the server → Gemini/Cohere generates a portfolio-aware reply
3. Reply is converted to speech → Deepgram TTS plays natural voice audio

**Setup:**

1. Get a [Deepgram API key](https://console.deepgram.com/)
2. Add it to `.dev.vars` as `DEEPGRAM_API_KEY`
3. (Optional) Add `GEMINI_API_KEY` or configure AI keys in the admin panel under **API**

JARVIS can be toggled on/off from the admin dashboard.

---

## Deployment

```bash
cd Anurag313y

# Set production secrets (one-time)
wrangler secret put ADMIN_EMAIL
wrangler secret put ADMIN_PASSWORD
wrangler secret put DEEPGRAM_API_KEY

# Deploy
npm run deploy
```

Before deploying to production, run remote migrations:

```bash
npm run db:migrate:remote
```

The Worker is named **`anurag-portfolio`** (see `wrangler.jsonc`).

---

## Database

D1 tables (defined in `Anurag313y/src/db/schema.ts`):

| Table | Purpose |
|---|---|
| `portfolio_content` | Editable portfolio JSON |
| `admin_users` | Admin accounts |
| `sessions` | Login sessions |
| `contact_messages` | Contact form submissions |

Migrations are in `Anurag313y/drizzle/migrations/`.

---

## Development Notes

- **Path alias:** `@/*` maps to `src/*` inside `Anurag313y/`
- **Auth:** Custom session-based auth with PBKDF2 password hashing
- **Public vs admin data:** API keys are stripped from public portfolio responses
- **Rate limiting:** JARVIS endpoints are rate-limited per IP via Cloudflare KV

---

## License

Private project.
