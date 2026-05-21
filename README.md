# AetherAXE Extraction Engine

AetherAXE is a fullstack document and URL extraction app built for RAG-ready ingestion workflows.

It accepts web URLs or uploaded files, extracts and normalizes content into markdown, generates metadata and semantic chunks, and can export results to downstream webhook pipelines.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript (`server.ts`)
- AI: Google Gemini (`@google/genai`)

## Core Features
- URL and file extraction (`pdf`, `docx`, `xlsx/xls`, `csv`, `zip`, `txt/md`, `jpg/png`)
- Structured output: title, summary, tags, entities, TOC, chunks
- Optional chunk embeddings
- Markdown/JSON export from UI
- Webhook delivery endpoint for downstream ingestion pipelines

## Security Hardening Included
- Security response headers (`nosniff`, frame deny, strict referrer policy)
- URL validation (only `http/https`)
- Unsafe host blocking for outbound requests (localhost/private IP ranges)
- HTTPS-only webhook targets
- Request timeout protection for outbound fetches
- Safer parsing and validation of advanced options
- Upload extension allowlist
- Controlled error responses (no verbose internals returned)

## Local Run
Prerequisites:
- Node.js 22+

Steps:
1. Install dependencies:
   `npm install`
2. Create `.env.local` and set:
   `GEMINI_API_KEY=your_key_here`
3. Run:
   `npm run dev`
4. Open:
   `http://localhost:3000`

## Docker Run
The project includes a single-container dev setup via Docker Compose.

1. Export API key in your shell:
   `export GEMINI_API_KEY=your_key_here`
2. Build and start:
   `docker compose up -d --build`
3. Open:
   `http://localhost:3310`

## API Endpoints
- `GET /api/health`
- `POST /api/extract`
- `POST /api/summarize`
- `POST /api/export/webhook`
