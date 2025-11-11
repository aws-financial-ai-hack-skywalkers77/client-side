# DocuFlow Frontend

DocuFlow is the award-ready intelligence layer for finance teams who live inside PDFs. Built with Vite, React, and TypeScript, the frontend turns raw invoices and contracts into auditor-ready insights, pairing real-time analytics with conversational AI so analysts can move from ingestion to investigation without leaving the browser.

---

## Why It Wins

- **Instant understanding for auditors** — Dashboard cards, exception heatmaps, and inline AI summaries surface the “so what?” behind every upload.  
- **AI that is workflow-native** — Gemini 2.5 Pro powers contextual chat, inline Q&A, and tailored prompts tied to each document row. No context switching, no copy/paste gymnastics.  
- **Landing AI ADE pipeline visualised** — Users see progress from ingestion through ADE Parse/Extract and embedding generation, mirroring the production data path so stakeholders trust the automation.  
- **Composable design system** — A shadcn-inspired component library (`src/components/ui`) keeps the experience consistent, accessible, and easy to white-label.

---

## Architecture Snapshot

The frontend orchestrates three core lanes that mirror the system diagram shared above:

1. **Analyst Command Surface**  
   - `Dashboard` page aggregates cross-document KPIs, processing status, and AI nudges.  
   - `Reports` page layers analytics, time-series trends, and exportable compliance checklists.

2. **Document Intelligence Pipeline**  
   - `Upload` page funnels PDFs into the Landing AI ADE flow (Parse ➜ Extract ➜ Gemini embeddings).  
   - `Invoices` and `Contracts` pages render normalized metadata, with inline AI queries per row.  
   - `AIChatPanel` stitches Gemini responses to specific documents using the anchoring metadata stored in Postgres.

3. **Platform Services**  
   - `src/api/index.ts` provides typed gateways for the FastAPI backend (`/upload_document`, `/invoices`, `/contracts`, `/ai/query`, `/health`).  
   - Shared type guards live in `src/types`, ensuring the UI trusts every payload before rendering.

> **Data flow recap:** Client uploads ➜ Landing AI ADE Parse ➜ ADE Extract ➜ Gemini Embedding 004 ➜ Embeddings stored in Postgres ➜ Gemini 2.5 Pro serves conversational answers back to the Dashboard and row-level AI buttons. The UI reflects each phase with optimistic status badges and retry affordances.

---

## Component Playbook

| Area | Key Components | Highlights |
| --- | --- | --- |
| Global Shell | `layout/AppLayout`, `layout/Sidebar`, `layout/TopNav`, `ThemeToggle` | Responsive nav, role-aware quick links, persistent dark/light theming |
| Dashboard Intelligence | `DashboardCards`, `InlineQueryCell`, `AIChatPanel` | KPI tiles, inline AI suggestions, real-time Gemini follow-ups |
| Document Tables | `InvoiceList`, `ContractList`, `DetailsModal` | Virtualized tables, hover affordances for AI actions, JSON deep-dive modal |
| Upload Experience | `UploadForm` | Multi-step validation, progress feedback, success handoff to tables and AI |
| Role Onboarding | `RoleSelection` | Persona-specific defaults for auditors, compliance officers, finance leads |
| UI Primitives | `components/ui/*` | Button, Card, Dialog, Progress, Select, etc. — all Tailwind-powered, accessible, and themable |

Every component is co-located with its styles via Tailwind utility classes. Shared transitions and color tokens live in `src/index.css`, ensuring the experience feels bespoke while remaining easy to maintain.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.x and **npm** ≥ 10.x (`node -v`, `npm -v`)  
- FastAPI backend for DocuFlow running on `http://localhost:8001`

### Install & Run

```bash
git clone https://github.com/aws-financial-ai-hack-skywalkers77/client-side.git
cd client-side/document-processing-client
npm install
npm run dev
```

- Dev server launches at `http://localhost:5173` and pings `/health` every 30 seconds.
- Build with `npm run build`; preview production bundle via `npm run preview`.

### Environment Variables

The frontend reads Vite envs prefixed with `VITE_`. The starter `.env` contains:

```
VITE_API_BASE_URL=http://localhost:8001
```

Create additional variants (`.env.staging`, `.env.production`) as you promote through environments. Vite merges mode-specific files automatically.

---

## Project Structure

```
src/
 ├─ api/                # Axios instance, REST helpers, and workflow-specific actions
 ├─ components/         # Feature + UI primitives (grouped by domain)
 │   ├─ layout/         # Application shell, navigation, theming
 │   └─ ui/             # Design-system foundation (shadcn-inspired)
 ├─ context/            # Global providers (theme, query cache hooks if introduced later)
 ├─ pages/              # Route-level views (Dashboard, Upload, Invoices, Contracts, Reports, Settings)
 ├─ types/              # Shared DTOs for invoices, contracts, ADE status, AI responses
 └─ main.tsx            # App bootstrap with router + theme provider
```

Supporting configuration lives in:

- `tailwind.config.cjs` — design tokens, animations, and content scanning  
- `tsconfig.json` — path aliases (`@/components`, `@/api`, etc.)  
- `vite.config.ts` — dev server proxying, build optimizations, and React plugin setup

---

## Development Workflow

- **Type-safe APIs:** Update `src/types` first, then adapt `src/api/index.ts` and the consuming components.  
- **Design polish:** Use `components/ui` primitives to ensure consistent spacing, color, and motion.  
- **AI Iterations:** `AIChatPanel` exposes a single `submitPrompt` helper—extend prompts there to add new “Ask DocuFlow” shortcuts.  
- **Testing hooks:** While formal tests aren’t shipped yet, the architecture is ready for React Testing Library + MSW; seed stories or tests under `src/__tests__` as you scale.  
- **Build & Deploy:** Run `npm run build` to produce the `dist/` bundle. Deploy via any static host (Cloudflare Pages, Vercel, S3 + CloudFront). Configure `VITE_API_BASE_URL` per environment.

---

## Operational Checklist

- Monitor FastAPI `/health` to keep the UI badge green.  
- Ensure ADE Parse/Extract services and Gemini endpoints are reachable; the UI surfaces toast errors and queue retry buttons when not.  
- Verify Postgres embeddings table migrations whenever the ADE schema evolves; the frontend expects enriched metadata for Invoice/Contract details and AI anchoring.

---

## License & Credits

DocuFlow belongs to the `aws-financial-ai-hack-skywalkers77` initiative. Confirm licensing for external distribution.  
Design system inspired by shadcn/ui. AI experiences built on Google Gemini, Landing AI ADE, and DocuFlow’s custom prompt orchestration.
