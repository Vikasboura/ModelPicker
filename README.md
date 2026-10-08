# ModelPicker

> An inference and evaluation platform that helps developers benchmark, analyze, and select the optimal open-weight LLM based on quality, latency, cost, and throughput.

[![CI Pipeline](https://github.com/Vikasboura/ModelPicker/actions/workflows/ci.yml/badge.svg)](https://github.com/Vikasboura/ModelPicker/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built by Vikas Boura](https://img.shields.io/badge/Author-Vikas%20Boura-indigo)](https://vikasboura.dev)

---

## What is ModelPicker?

Selecting the right Large Language Model (LLM) for an engineering workload requires balancing competing trade-offs: smaller models execute with microsecond latency and zero cost, while larger models produce higher quality answers at the expense of throughput and hardware requirements.

**ModelPicker** is a full-stack developer tool that automates this evaluation process for locally hosted models running via [Ollama](https://ollama.ai). It provides systematic, reproducible benchmarking across:
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

## Features

- **Local Model Auto-Discovery**: Automatically enumerates installed Ollama models, extracting parameter size, family, context window, and quantization level.
- **Real-Time Streaming Playground**: Test models interactively with Server-Sent Events (SSE) streaming output, measuring live TTFT, total latency, and tokens/sec.
- **Automated Batch Benchmarking**: Execute multi-model test runs against custom evaluation datasets with configurable concurrency and warm-up isolation.
- **Multi-Engine Quality Evaluation**:
  - *Rule-Based*: JSON schema validation, regex pattern matching, keyword containment, and length heuristics.
  - *LLM-as-a-Judge*: Model-graded rubric evaluation with anti-self-judge bias safeguards.
- **Dynamic Cost Analysis**: Calculates projected token expense using an extensible pricing catalog (`backend/data/pricing.yaml`).
- **Configurable Weighted Scoring**: Dynamically normalizes metrics (Quality, Latency, Cost) to compute a composite score and produce an actionable recommendation rationale.
- **Interactive Visual Comparison**: Recharts-powered performance radar, latency vs. quality scatter plots, and token throughput comparisons.
- **Extensible Dataset Manager**: Create, upload, validate, and manage custom benchmark datasets formatted as JSON.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│            (TypeScript + Vite + Tailwind CSS)          │
│            Runs as SPA or hosted on Vercel             │
└───────────────────────────┬────────────────────────────┘
                            │ REST / SSE
                            ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│             (Python 3.11 + SQLAlchemy 2.0)             │
├───────────────────────────┬────────────────────────────┤
│   Benchmark Orchestrator  │     Scoring & Pricing      │
│   (Semaphore Concurrency) │     (Pareto Normalization) │
└─────────────┬─────────────┴─────────────┬──────────────┘
              │                           │
              ▼                           ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│      Ollama Daemon        │ │      SQLite Database     │
│   (Local LLM Inference)   │ │  (Benchmarks & Results)  │
└─────────────┬─────────────┘ └──────────────────────────┘
              ▼
┌───────────────────────────┐
│       Local Models        │
│ (Llama 3, Qwen, Mistral)  │
└───────────────────────────┘
```

---

## Tech Stack

- **Frontend**:
  - React 19, TypeScript, Vite
  - Tailwind CSS, Lucide React
  - Recharts for metrics visualization
  - Axios for API communication
- **Backend**:
  - Python 3.11 / 3.10
  - FastAPI, Pydantic v2
  - SQLAlchemy 2.0 + SQLite
  - HTTPX for async Ollama communication
  - PyYAML for model pricing configuration
- **AI / Inference**:
  - [Ollama](https://ollama.ai) (Local open-weight LLM execution)
- **Infrastructure & Quality**:
  - Docker & Docker Compose
  - GitHub Actions CI (Ruff, Pytest, ESLint, Vite Build)
  - Vercel configuration (`vercel.json`)

---

## Quickstart & Local Setup

### Prerequisites
- [Git](https://git-scm.com/)
- [Python 3.10+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)
- [Ollama](https://ollama.ai/) installed and running (`ollama serve`)

### 1. Clone Repository
```bash
git clone https://github.com/Vikasboura/ModelPicker.git
cd ModelPicker
```

### 2. Pull at Least One Ollama Model
```bash
ollama pull qwen2.5:1.5b
# Optional: pull a second model for comparison
ollama pull llama3.2:1b
```

### 3. Start Backend
```bash
cd backend
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend Swagger API documentation is available at `http://localhost:8000/docs`.

### 4. Start Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Docker Compose Setup

Run the complete multi-container stack with a single command:

```bash
docker compose up --build
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Ollama**: `http://localhost:11434`

To stop the containers:
```bash
docker compose down
```

---

## Environment Variables

Copy the example environment files:

```bash
# Root / Docker environment
cp .env.example .env

# Backend environment
cp backend/.env.example backend/.env

# Frontend environment
cp frontend/.env.example frontend/.env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint (`http://ollama:11434` in Docker) |
| `DATABASE_URL` | `sqlite:///./data/modelpicker.db` | SQLAlchemy database connection string |
| `DEFAULT_JUDGE_MODEL` | `qwen2.5:7b` | Default model used for LLM-as-a-judge evaluation |
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL accessed by the React frontend |

---

## Benchmark Methodology

### 1. Latency & Throughput
- **Time to First Token (TTFT)**: Measured from request dispatch until the first token chunk is emitted via the streaming endpoint.
- **Total Latency**: Wall-clock time (milliseconds) taken from prompt dispatch until the complete generation ends (`done = true`).
- **Throughput**: Calculated as:
  $$\text{Throughput} = \frac{\text{Tokens Generated}}{\text{Total Latency (seconds)}}$$
- **Warm-Up Isolation**: An unmeasured single-token warm-up query is dispatched to load the model weights into GPU VRAM before benchmark timing begins.

### 2. Quality Evaluation
- **Rule-Based Engine**: Scores responses on a 0–10 scale checking JSON parsability, exact keyword presence, length constraints, and regex matching.
- **LLM-as-a-Judge**: Evaluates responses using a prompt rubric assessing accuracy, adherence, and clarity. To prevent bias, a model is barred from judging its own output.

### 3. Cost Analysis
Estimated cost per 1,000 queries is calculated against `backend/data/pricing.yaml`:
$$\text{Cost} = \left(\frac{\text{Prompt Tokens}}{1,000,000} \times \text{Input Price}\right) + \left(\frac{\text{Completion Tokens}}{1,000,000} \times \text{Output Price}\right)$$

### 4. Composite Scoring Formula
Metrics are normalized into $[0, 1]$ across all candidate models:
- **Quality** ($Q_{\text{norm}}$): Higher is better $\rightarrow \frac{Q - Q_{\min}}{Q_{\max} - Q_{\min}}$
- **Latency** ($L_{\text{norm}}$): Lower is better $\rightarrow \frac{L_{\max} - L}{L_{\max} - L_{\min}}$
- **Cost** ($C_{\text{norm}}$): Lower is better $\rightarrow \frac{C_{\max} - C}{C_{\max} - C_{\min}}$

The final score is computed as:
$$\text{Final Score} = (w_q \times Q_{\text{norm}}) + (w_l \times L_{\text{norm}}) + (w_c \times C_{\text{norm}})$$
*Default weights: Quality 50%, Latency 30%, Cost 20%.*

---

## Dataset Format

Custom datasets can be imported via the Datasets page using standard JSON:

```json
{
  "name": "Customer Support Triage",
  "description": "Benchmarks intent classification and tone adherence",
  "category": "classification",
  "test_cases": [
    {
      "prompt": "Classify the sentiment and issue: 'My package arrived damaged two days late.'",
      "expected_output": "{\"sentiment\": \"negative\", \"issue\": \"damaged_goods\"}",
      "eval_criteria": "json_valid",
      "weight": 1.0
    }
  ]
}
```

---

## REST API Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service status, database check, and Ollama reachability |
| `GET` | `/api/models` | List all discovered local models and pricing details |
| `POST` | `/api/models/pull` | Pull a new model from the Ollama library |
| `POST` | `/api/inference` | Non-streaming single prompt inference |
| `POST` | `/api/inference/stream` | Server-Sent Events (SSE) streaming token output |
| `POST` | `/api/benchmarks/run` | Execute asynchronous multi-model benchmark run |
| `GET` | `/api/benchmarks` | List benchmark history |
| `GET` | `/api/benchmarks/{id}` | Get benchmark results, scores, and recommendation |
| `GET` | `/api/datasets` | List benchmark datasets |
| `POST` | `/api/datasets` | Create custom benchmark dataset |

---

## Testing & Quality Assurance

### Run Backend Tests & Linters
```bash
# Run 17 unit and integration tests (mocked, no Ollama required)
pytest backend/tests

# Check code formatting & linting
ruff check backend/
ruff format --check backend/
```

### Run Frontend Linters & Build
```bash
cd frontend
npm run lint
npm run build
```

---

## Screenshots

| Overview & Landing | Real-time Comparison Dashboard |
| :---: | :---: |
| *(Landing Page Screenshot)* | *(Dashboard Screenshot)* |

| Live Playground | Benchmark Runner |
| :---: | :---: |
| *(Playground Screenshot)* | *(Benchmark Run Screenshot)* |

---

## Deployment Guide

### Vercel (Frontend)
1. Push this repository to GitHub: `https://github.com/Vikasboura/ModelPicker`.
2. Connect your repository to [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Configure environment variable: `VITE_API_URL=https://your-backend-api.com`.
5. Deploy. Vercel automatically routes client-side paths using `frontend/vercel.json`.

### Backend & Ollama (Cloud / VPS)
Because Ollama requires a GPU or persistent CPU host with local storage for model weights, it cannot run inside serverless functions (e.g. AWS Lambda, Vercel Serverless).
- **Recommended Setup**: Deploy `docker-compose.yml` to an AWS EC2 instance, GCP Compute Engine VM, or a GPU-enabled VPS (RunPod, Lambda Labs, Hetzner).
- Bind the backend to your domain (e.g., `https://api.modelpicker.vikasboura.dev`) with an Nginx SSL reverse proxy.

---

## Roadmap

- [x] Local Ollama model auto-discovery
- [x] Real-time SSE streaming playground
- [x] Rule-based and LLM-as-a-judge scoring
- [x] Weighted multi-factor recommendation engine
- [x] Docker Compose local orchestration
- [x] Vercel SPA deployment configuration
- [ ] Support for vLLM and TensorRT-LLM endpoints
- [ ] Export benchmark reports as PDF / CSV
- [ ] Human-in-the-loop manual evaluation mode

---

## License

This project is licensed under the [MIT License](LICENSE) © 2026 **Vikas Boura**.
