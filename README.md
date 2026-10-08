# ModelPicker 🎯

> **Local LLM Inference, Benchmarking & Decision Platform**  
> Objectively select the optimal open-weight LLM for your workload based on real measured **Quality**, **Latency**, **Cost**, and **Overall Weighted Score**.

---

## Overview

ModelPicker is a full-stack developer platform designed to eliminate guesswork when choosing open-weight language models. Instead of relying on static leaderboards, ModelPicker runs standardized evaluation datasets directly on your local hardware via **Ollama**, records high-precision wall-clock latency, measures token throughput, computes cost from token pricing tables, and provides automated model recommendations based on configurable priorities.

---

## Key Features

- **Multi-Model Side-by-Side Comparison**: Benchmark models like `llama3.2:1b`, `qwen2.5:1.5b`, and `gemma2:2b` under identical prompt conditions.
- **Real-Time Wall-Clock Telemetry**: Measures time to first token (TTFT), total latency, generated tokens, and tokens per second without mock values.
- **Model Registry & Cost Estimation**: Centralized pricing registry (`data/pricing.yaml`) calculating exact inference costs.
- **Warm-Up Isolation**: Excludes model load cold-starts from benchmark statistics.
- **Custom Dataset Engine**: Upload, validate, and preview evaluation sets in **JSON** or **JSONL** formats.
- **Configurable Weighted Scoring**: Dynamically adjust weights for Quality ($W_q$), Latency ($W_l$), and Cost ($W_c$) with automatic normalization.
- **Dynamic 🏆 Model Recommendations**: Recommends the highest-ranking model with auto-generated rationales and badges for Fastest, Cheapest, and Highest Quality.
- **Interactive Playground**: Send prompts across multiple models concurrently with real-time response comparison.
- **Full Historical Persistence**: All runs and prompt-level results are saved to SQLite for auditing and regressions.
- **One-Command Docker Deployment**: Runs with `docker compose up --build`.

---

## Architecture

```
                  ┌──────────────────────────────────────────┐
                  │          React 19 Frontend               │
                  │ (Vite, TypeScript, Tailwind, Recharts)   │
                  └─────────────────────┬────────────────────┘
                                        │ REST / SSE
                                        ▼
                  ┌──────────────────────────────────────────┐
                  │           FastAPI Backend                │
                  │   (Pydantic v2, SQLAlchemy 2.0, httpx)   │
                  └──┬─────────────┬─────────────┬─────────┬─┘
                     │             │             │         │
                     ▼             ▼             ▼         ▼
               ┌──────────┐  ┌───────────┐  ┌─────────┐ ┌────────┐
               │  SQLite  │  │ Benchmark │  │ Quality │ │ Model  │
               │ Database │  │  Engine   │  │ Scoring │ │Registry│
               └──────────┘  └─────┬─────┘  └─────────┘ └────────┘
                                   │
                                   ▼
                  ┌──────────────────────────────────────────┐
                  │         Ollama Serving Daemon            │
                  │   llama3.2:1b • qwen2.5:1.5b • gemma2:2b │
                  └──────────────────────────────────────────┘
```

---

## Tech Stack

- **Backend**: Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, SQLite, httpx, PyYAML, pytest, Ruff
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Serving Engine**: Ollama (Docker or local installation)
- **Infrastructure**: Docker, Docker Compose, GitHub Actions CI

---

## Quickstart (One-Command Experience)

### 1. Clone the repository
```bash
git clone https://github.com/your-repo/ModelPicker.git
cd ModelPicker
```

### 2. Configure environment
```bash
cp .env.example .env
```

### 3. Launch via Docker Compose
```bash
docker compose up --build
```

Access the interfaces:
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Ollama Engine**: [http://localhost:11434](http://localhost:11434)

---

## Model Initialization (Ollama)

To pull the default lightweight benchmark models into the Ollama container:

```bash
docker compose exec ollama ollama pull llama3.2:1b
docker compose exec ollama ollama pull qwen2.5:1.5b
docker compose exec ollama ollama pull gemma2:2b
```

*Alternatively, you can pull models directly in the web UI via the **Models** tab.*

---

## Local Development Setup

### Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Benchmark & Scoring Methodology

### 1. Benchmark Execution
1. **Warmup Request**: Dispatches a short ping to prime model weights in VRAM. This latency is logged but **excluded** from benchmark averages.
2. **Standardized Prompts**: Every selected model receives the exact same prompts with identical temperature and token constraints.
3. **Bounded Concurrency**: Dispatches inference concurrently up to `MAX_CONCURRENT_REQUESTS=2` to prevent memory bottlenecks.

### 2. Weighted Scoring Math
All three evaluation dimensions are normalized to a `0 - 100` scale:

- **Quality Score ($S_q$)**: Rule-based concept overlap, recall, and completeness heuristic, or external LLM judge.
- **Latency Score ($S_l$)**: Scaled min-max across participating models (lower latency = higher score).
- **Cost Score ($S_c$)**: Scaled min-max based on pricing per 1M tokens (lower cost = higher score).

$$\text{Final Score} = (S_q \times W_q) + (S_l \times W_l) + (S_c \times W_c)$$

$$\text{Default Weights: } W_q = 0.50, \; W_l = 0.30, \; W_c = 0.20$$

*Weights can be customized directly in the benchmark configuration interface.*

---

## Dataset Formats

### JSON Format (`data/eval.json`)
```json
[
  {
    "id": "q1",
    "prompt": "What is machine learning in simple terms?",
    "expected": "Machine learning is a subset of AI where algorithms learn from data."
  }
]
```

### JSONL Format
```jsonl
{"id": "q1", "prompt": "What is machine learning?", "expected": "Machine learning is..."}
{"id": "q2", "prompt": "Explain REST APIs.", "expected": "A REST API..."}
```

Upload custom datasets directly via the **Datasets** tab in the UI.

---

## API Documentation

FastAPI provides an interactive OpenAPI / Swagger UI at `http://localhost:8000/docs`.

Key Endpoints:
- `GET  /api/v1/health`: Backend, database, and Ollama connectivity status.
- `GET  /api/v1/models`: List registered and installed models.
- `POST /api/v1/models/pull`: Trigger model download in Ollama.
- `POST /api/v1/inference`: Synchronous inference with latency, throughput, and cost.
- `POST /api/v1/inference/stream`: SSE streaming inference with TTFT tracking.
- `POST /api/v1/benchmarks`: Schedule and start multi-model benchmark.
- `GET  /api/v1/benchmarks`: List historical benchmark runs.
- `GET  /api/v1/benchmarks/{id}`: Detailed prompt-level benchmark results.
- `POST /api/v1/datasets/validate`: Validate JSON/JSONL dataset schema.
- `POST /api/v1/datasets/upload`: Upload and store custom dataset.

---

## Running Tests & Code Quality

### Backend Tests & Linting
```bash
# Run test suite
python -m pytest backend/tests

# Run Ruff linter
python -m ruff check backend

# Run Ruff code formatter
python -m ruff format --check backend
```

### Frontend Typecheck & Build
```bash
cd frontend
npm run lint
npm run build
```

---

## Screenshots

*(UI screenshots placeholder: Dashboard, Model Comparison Matrix, and Benchmark Runner)*

```
[ Dashboard KPIs & Recommendation Banner ]
[ Recharts Composite Score & Latency Comparison ]
[ Side-by-Side Prompt Output Inspector ]
```

---

## Troubleshooting

- **Ollama Offline Banner**: Ensure the Ollama container or local daemon is active. If running locally outside Docker, set `OLLAMA_BASE_URL=http://localhost:11434` in `.env`.
- **Model Not Found**: If a model has not been downloaded, navigate to the **Models** tab and click **Pull**, or run `docker compose exec ollama ollama pull <model-name>`.
- **Out of Memory on Benchmarks**: Reduce `MAX_CONCURRENT_REQUESTS=1` in `.env` if benchmarking larger models on limited host RAM/VRAM.

---

## License

MIT License. Developed for open-weight LLM evaluation and performance analysis.
