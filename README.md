# SahayakAI — Government AI Copilot (Frontend)

> Frontend for the GovAssist AI platform. React + Vite + TanStack Query SPA backed by a FastAPI backend at `mrdu.avlokai.com`.

## Architecture

Every page consumes **only backend APIs** — zero hardcoded/mock data. The API client (`src/api.js`) talks to the backend at `https://mrdu.avlokai.com/api` (override with `VITE_API_URL`).

| Page | Backend Endpoint(s) | Description |
|------|-------------------|-------------|
| Assistant | `POST /api/chat`, `POST /api/extract`, `POST /api/autofill` | RAG chat with document upload, extraction, and certified PDF generation |
| My Requests | `GET /api/cases` | Live case tracking with real timelines, SLA countdowns, and stage progress |
| Officer Copilot | `GET /api/templates`, `POST /api/documents/*` | Draft → approve → issue lifecycle with state-machine enforcement |
| Workflow & SLA | `GET /api/cases`, `POST /api/cases/*`, `GET /api/departments/*/queue` | Kanban board with multi-department routing, live SLA timers, and escalation |
| Departments | `GET /api/departments`, `GET /api/departments/*/queue` | Department queues with start/complete actions and auto-advance |
| Audit Trail | `GET /api/audit` | Immutable, append-only action log with hash-chained integrity |
| Reports | `GET /api/analytics/summary` | Charts and stats: open cases, SLA breaches, drafting time reduction |

## New Features (v2.0)

### 1. 100% Backend-Driven My Requests
All request data comes from `GET /api/cases`. Timelines are built from the backend's `case.route` (real workflow stages), SLA data from `sla_remaining_hours` / `sla_status`, and department from `current_department_name`. The old hardcoded seed data store (`RequestsContext.jsx`) has been removed — what you see is what's actually in the system.

### 2. Live SLA Countdown Timers
Reusable `SlaCountdown` component (`src/components/SlaCountdown.jsx`) that ticks every second from backend-fetched SLA data. Shows a live `HH:MM:SS` countdown that transitions amber → red when approaching/passing the deadline. Used on both the Workflow board and My Requests cards.

### 3. Multi-Language Translate Toggle
Every bot response in the Assistant chat now shows language toggle buttons (हिन्दी / తెలుగు / English). Tapping one calls `POST /api/translate` to translate the response into the selected language via the backend LLM. The translated text replaces the original inline — no page reload.

### 4. Complete API Surface
The frontend API client now covers every backend endpoint including:
- Session management (`GET /api/session`, `POST /api/session/reset`)
- Voice guide (`POST /api/guide`)
- Multi-department routing (`POST /api/cases/:id/assign-route`, `POST /api/cases/:id/route-next`)
- Scheme eligibility checks (`POST /api/schemes/eligibility`)
- PDF document rendering with inline iframe viewer + download

## Quick Start

```bash
npm install
cp .env.example .env   # set VITE_API_URL if backend isn't at mrdu.avlokai.com
npm run dev            # http://localhost:5173
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `https://mrdu.avlokai.com/api` | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | (empty) | Google OAuth client ID for sign-in |
| `VITE_REQUIRE_AUTH` | `true` | Set to `false` to skip login gate during dev |

## Build & Deploy

```bash
npm run build    # outputs to dist/
```

The `dist/` folder is a static SPA — deploy to Cloudflare Pages, Vercel, Netlify, or any static host. Point the API client at your backend via `VITE_API_URL`.

## Tech Stack

- **React 18** with Hooks
- **Vite** for dev/build
- **TanStack Query (React Query)** for server state
- **React Router v6** for client-side routing
- **Framer Motion** for page transitions
- **react-markdown** for AI response rendering
- **Tailwind CSS** for styling
- **Web Speech API** for voice input/output
- **@react-oauth/google** for Google Sign-In

## Backend

The backend is a FastAPI service with PostgreSQL + pgvector, Anthropic/OpenAI LLM, document generation, and multi-department workflow routing. See the [backend repo](https://github.com/AdapaRohith/SahayakAI) for details.
