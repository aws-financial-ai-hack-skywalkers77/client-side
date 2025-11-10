# DocuFlow Client

DocuFlow is a Vite + React + TypeScript front-end for the Document Processing Platform.  
It provides dashboards for auditors, chartered accountants, compliance officers, and financial consultants to upload PDFs, review extracted metadata, and interact with an AI assistant that surfaces workflow insights.

The UI consumes the FastAPI backend exposed at `http://localhost:8001` and expects the endpoints defined in the server-side README (`/upload_document`, `/invoices`, `/contracts`, `/health`, etc.).

---

## Prerequisites

- **Node.js** 20.x (or newer) and **npm** 10.x  
  > verify with `node -v` and `npm -v`
- FastAPI backend for the Document Processing Platform running locally on port `8001`

---

## Getting started

Clone the repository (or copy the folder) and install dependencies:

```bash
git clone https://github.com/aws-financial-ai-hack-skywalkers77/client-side.git
cd client-side
npm install
```

### Environment variables

The project reads configuration from `.env`. The repo already contains a sample file:

```
VITE_API_BASE_URL=http://localhost:8001
```

- Update the value if your backend runs elsewhere.
- For alternative environments, create additional files (`.env.staging`, `.env.production`, etc.) per Vite’s [env loading rules](https://vitejs.dev/guide/env-and-mode.html).

---

## Available scripts

```bash
npm run dev       # Start Vite dev server with hot reload on http://localhost:5173
npm run lint      # Run ESLint across the project
npm run build     # Type-check then build production assets into dist/
npm run preview   # Preview the production build locally
```

- `npm run dev` expects the FastAPI backend to be available; health checks poll `/health` every 30 seconds.
- `npm run build` executes `tsc -b` before bundling to ensure type safety.

---

## Upload workflow

1. Navigate to the **Upload** page.
2. Choose the document type (`invoice` or `contract`) and browse for a PDF (max 10 MB).
3. Submit the form. The client:
   - Validates file type/size
   - Calls `POST /upload_document`
   - Shows a progress animation while waiting
   - Refreshes metadata tables or displays the returned payload in the sidebar

Rows in the invoices and contracts tables are clickable; the modal surfaces the full JSON payload with copy/export actions. The AI chat panel offers quick actions to jump directly to these tables or review workflow summaries.

---

## Project structure

```
src/
 ├─ api/                # Axios client + typed fetch helpers
 ├─ components/         # Reusable UI + layout (shadcn/ui inspired)
 ├─ context/            # Theme provider with light/dark switch
 ├─ pages/              # Route-level views (Dashboard, Upload, etc.)
 ├─ types/              # Shared TypeScript interfaces
 └─ main.tsx            # App bootstrap
```

Tailwind CSS is configured in `tailwind.config.cjs`, and shadcn-style design tokens live in `src/index.css` (including golden-themed light mode plus dark mode overrides).

---

## Development tips

- The repo ships with a `.env` file for local work; create environment-specific variants as needed.
- If you update the backend API, mirror those changes in `src/types` and `src/api`.
- To refresh shadcn components or add new ones, follow the patterns in `src/components/ui`.
- For production deploys, serve the `dist/` output behind your preferred static host (Cloudflare Pages, S3 + CloudFront, Vercel, etc.).

---

## License

This project is part of the `aws-financial-ai-hack-skywalkers77` workspace and intended for internal hackathon use. Confirm licensing requirements with the team before external distribution.
