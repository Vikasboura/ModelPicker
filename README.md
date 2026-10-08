# ModelPicker

> An inference and evaluation platform that helps developers benchmark, analyze, and select the optimal open-weight LLM based on quality, latency, cost, and throughput.

[![CI Pipeline](https://github.com/Vikasboura/ModelPicker/actions/workflows/ci.yml/badge.svg)](https://github.com/Vikasboura/ModelPicker/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built by Vikas Boura](https://img.shields.io/badge/Author-Vikas%20Boura-indigo)](https://vikasboura.dev)

---

## What is ModelPicker?

Selecting the right Large Language Model (LLM) for an engineering workload requires balancing competing trade-offs: smaller models execute with microsecond latency and zero cost, while larger models produce higher quality answers at the expense of throughput and hardware requirements.

**ModelPicker** is a full-stack developer platform that automates this evaluation process across two distinct operational modes:
- **Public Demo Mode**: "The public demo uses a free-tier inference provider (Groq / Open-Weight models) hosted serverlessly at zero infrastructure cost."
- **Local Ollama Mode**: "Local mode uses Ollama running on your local machine with private open-weight weights (e.g. Qwen 2.5, Llama 3.2)."

It provides systematic, reproducible benchmarking across:
- **Quality**: Rule-based validation (JSON structure, regex, exact match) and LLM-as-a-judge scoring with bias prevention.
- **Latency & Throughput**: Wall-clock duration, Time to First Token (TTFT), and generated tokens per second.
- **Cost**: Real-time financial estimation projected against commercial API pricing catalogs.
- **Pareto Recommendation**: Dynamic multi-criteria scoring algorithm that ranks candidate models according to custom workload priorities.

---

## Live Demo & Creator

- **Application Subdomain**: [https://modelpicker.vikasboura.dev](https://modelpicker.vikasboura.dev)
- **Personal Portfolio**: [https://vikasboura.dev](https://vikasboura.dev)
- **Author**: Vikas Boura ([contact@vikasboura.dev](mailto:contact@vikasboura.dev))
- **GitHub**: [@Vikasboura](https://github.com/Vikasboura)
- **LinkedIn**: [vikas-boura](https://linkedin.com/in/vikas-boura)

---

## Architecture

ModelPicker features a unified provider abstraction supporting both free serverless cloud inference and local GPU/CPU execution:

```
                          ┌─────────────────────────────────────┐
                          │          React 19 Frontend          │
                          │   (TypeScript + Vite + Tailwind)    │
                          └──────────────────┬──────────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
           [ Public Demo Mode ]                          [ Local Mode ]
                      │                                             │
                      ▼                                             ▼
       ┌──────────────────────────────┐              ┌──────────────────────────────┐
       │   Vercel Serverless API      │              │       FastAPI Backend        │
       │  (Node.js /api endpoints)    │              │ (Python 3.11 + SQLite DB)    │
       └──────────────┬───────────────┘              └──────────────┬───────────────┘
                      │                                             │
                      ▼                                             ▼
       ┌──────────────────────────────┐              ┌──────────────────────────────┐
       │     Groq Free Cloud API      │              │     Local Ollama Daemon      │
       │ (Llama 3.1, Llama 3.3, etc.) │              │  (qwen2.5:1.5b, llama3.2:1b) │
       └──────────────────────────────┘              └──────────────────────────────┘
```

---

## Two Operational Modes

### 1. Public Demo Mode ($0 Cost Cloud)
- **Target Audience**: Portfolio visitors, remote developers testing the web interface.
- **Inference Provider**: [Groq](https://groq.com) free tier (OpenAI-compatible HTTP API).
- **Available Models**:
  - `llama-3.1-8b-instant` (High-speed 8B model, up to 500+ tok/s)
  - `llama-3.3-70b-versatile` (Flagship 70B open reasoning model)
  - `mixtral-8x7b-32768` (Mixture-of-Experts architecture)
  - `gemma2-9b-it` (Google open instruction model)
- **Free-Tier Limits & Abuse Protection**:
  - Request Rate Limit: 30 Requests per Minute (RPM).
  - Maximum Prompt Length: 4,000 characters.
  - Maximum Output Tokens: 1,024 tokens.
  - Request Timeout: 30 seconds.
  - History: Stored in browser session storage without requiring a persistent database server.

### 2. Local Ollama Mode (Self-Hosted)
- **Target Audience**: Developers running local weights privately on their own workstation or GPU cluster.
- **Inference Engine**: [Ollama](https://ollama.ai) daemon via `http://localhost:11434`.
- **Available Models**: Any model pulled via `ollama pull` (e.g., `qwen2.5:1.5b`, `llama3.2:1b`, `mistral`, `deepseek-r1`).
- **Database**: Local SQLite database (`modelpicker.db`) with full benchmark persistence, custom dataset file uploads, and historical run comparison.

---

## Security Considerations

- **Server-Side API Key Handling**: `PUBLIC_PROVIDER_API_KEY` is never exposed to the client or embedded in the React bundle. It is stored exclusively in Vercel Project Settings > Environment Variables.
- **Zero Client-Side Secrets**: Never use `VITE_*` environment variables for private API credentials.
- **Network Isolation**: When running via Docker Compose, Ollama's port `11434` is restricted to the internal Docker network.

---

## Local Setup

### 1. Clone Repository
```bash
git clone https://github.com/Vikasboura/modelpicker.git
cd modelpicker
```

### 2. Start Ollama
```bash
ollama serve
ollama pull qwen2.5:1.5b
```

### 3. Start Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1    # On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## Docker Setup

Run the full local stack with one command:
```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/docs`
- Ollama: `http://localhost:11434`

---

## Vercel Deployment (Public Demo)

1. Import the repository in [Vercel](https://vercel.com).
2. Set Root Directory: `frontend`.
3. Add environment variable:
   - `PUBLIC_PROVIDER_API_KEY` = `<your-free-groq-api-key>`
4. Deploy! Vercel automatically deploys both the Vite frontend SPA and the serverless functions in `frontend/api/`.

---

## Environment Variables

| Variable | Description | Where to Configure |
| :--- | :--- | :--- |
| `PUBLIC_PROVIDER_API_KEY` | Free API key for Groq Cloud | Vercel Environment Variables only |
| `PUBLIC_PROVIDER_BASE_URL` | Upstream provider URL (default: `https://api.groq.com/openai/v1`) | Vercel / Backend `.env` |
| `OLLAMA_BASE_URL` | Local Ollama daemon URL (default: `http://localhost:11434`) | Local Backend `.env` |
| `MODEL_PROVIDER` | Default provider: `ollama` or `public_free` | Backend `.env` |
| `DATABASE_URL` | SQLite database connection string | Local Backend `.env` |

---

## Testing

```bash
# Run backend provider and inference tests (mocked, no active Ollama required)
pytest backend/tests

# Lint and format check
ruff check backend/
ruff format --check backend/

# Frontend quality checks
cd frontend
npm run lint
npm run build
```

---

## License

MIT License © 2026 **Vikas Boura**.
