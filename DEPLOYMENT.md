# Deployment Guide: ModelPicker

This guide covers production deployment strategies for **ModelPicker**, detailing how to deploy each component across suitable cloud infrastructure providers.

---

## 1. Architecture Overview & Cloud Reality

ModelPicker consists of three core components:

```
┌──────────────────────────────────────┐
│          Frontend (SPA)              │  Hosted on Vercel or Static CDN
│  React 19 + Vite + Tailwind CSS      │  URL: https://modelpicker.vikasboura.dev
└──────────────────┬───────────────────┘
                   │ HTTPS / SSE
                   ▼
┌──────────────────────────────────────┐
│          Backend (API)               │  Hosted on Container Cloud (Render / Railway / VPS)
│      FastAPI + SQLAlchemy            │  URL: https://api.modelpicker.vikasboura.dev
└──────────┬───────────────────┬───────┘
           │                   │
           ▼                   ▼
┌──────────────────────┐ ┌───────────────────────────┐
│  Ollama Daemon (GPU) │ │     SQLite / Postgres     │
│  Model Weights Host  │ │    Persistent Storage     │
└──────────────────────┘ └───────────────────────────┘
```

### Critical Infrastructure Assessment:
- **Frontend (Vercel)**: **Optimal**. Vercel excels at hosting React/Vite SPAs globally with zero maintenance and native custom domain mapping (`modelpicker.vikasboura.dev`).
- **Backend & Ollama (Why Vercel Cannot Run Ollama)**:
  - Vercel is a serverless platform with execution time limits (10s to 60s max) and ephemeral file systems.
  - LLM inference takes seconds to minutes, and Ollama requires persistent local disk storage (multi-gigabyte GGUF model files) and GPU/CPU acceleration.
  - **Verdict**: Backend + Ollama must run on a persistent container host (e.g. VPS, Railway, Render with persistent disk, GCP Compute Engine, AWS EC2, or Hetzner).

---

## 2. Recommended Deployment Architectures

### Option A: Hybrid Production (Recommended)
- **Frontend**: Deployed to **Vercel** connected to `modelpicker.vikasboura.dev`.
- **Backend + Ollama**: Deployed to a **GPU-enabled VPS** (RunPod, Lambda Labs, Hetzner, AWS EC2 `g4dn.xlarge`, or GCP Compute Engine) running `docker-compose.yml` behind an Nginx reverse proxy with SSL (Let's Encrypt).

### Option B: Unified Single-Server Deployment
- Run the complete `docker-compose.yml` (Frontend, Backend, Ollama) on an Ubuntu 22.04 LTS VPS with Docker and Docker Compose installed.
- Route incoming traffic through Caddy or Nginx with automatic SSL certificates.

---

## 3. Required Environment Variables

### Backend Configuration (`backend/.env`)
| Variable | Production Example | Description |
| :--- | :--- | :--- |
| `OLLAMA_BASE_URL` | `http://ollama:11434` *(or `http://localhost:11434`)* | Reachable Ollama daemon endpoint |
| `DATABASE_URL` | `sqlite:////app/data/modelpicker.db` | Persistent database storage path |
| `CORS_ORIGINS` | `https://modelpicker.vikasboura.dev,https://vikasboura.dev` | Allowed origins for API requests |
| `APP_ENV` | `production` | Runtime mode |
| `LOG_LEVEL` | `INFO` | Logging verbosity |
| `MAX_CONCURRENT_REQUESTS` | `2` | Bound parallel inferences to prevent OOM |
| `WARMUP_REQUESTS` | `1` | Pre-warm model in VRAM prior to benchmark |
| `QUALITY_WEIGHT` | `0.5` | Weight for quality in Pareto score (0.0–1.0) |
| `LATENCY_WEIGHT` | `0.3` | Weight for latency in Pareto score (0.0–1.0) |
| `COST_WEIGHT` | `0.2` | Weight for cost in Pareto score (0.0–1.0) |

### Frontend Configuration (`frontend/.env` or Vercel Environment Settings)
| Variable | Production Example | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://api.modelpicker.vikasboura.dev` | Public URL of the FastAPI backend |

---

## 4. Frontend Deployment (Vercel Step-by-Step)

1. **Connect GitHub Repository**:
   - Log into [Vercel](https://vercel.com) and click **Add New Project**.
   - Import `https://github.com/Vikasboura/modelpicker`.

2. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Set Environment Variables**:
   - Add `VITE_API_URL` = `https://api.modelpicker.vikasboura.dev` (or your backend URL).

4. **Verify Client-Side Routing**:
   - `frontend/vercel.json` is pre-configured with:
     ```json
     {
       "rewrites": [
         {
           "source": "/(.*)",
           "destination": "/index.html"
         }
       ]
     }
     ```
   - This ensures routes like `/benchmark`, `/history`, and `/playground` reload cleanly without 404s.

5. **Configure Custom Subdomain**:
   - Navigate to **Project Settings > Domains**.
   - Add `modelpicker.vikasboura.dev`.
   - In your DNS provider (Cloudflare, Namecheap, Route53, etc.) for `vikasboura.dev`, add:
     - **Type**: `CNAME`
     - **Name**: `modelpicker`
     - **Target**: `cname.vercel-dns.com`

---

## 5. Backend & Ollama Deployment (Cloud / VPS)

### Step 1: Provision Server
- Recommended OS: Ubuntu 22.04 LTS (x86_64) with NVIDIA GPU driver support (or high-memory CPU: 16GB+ RAM).

### Step 2: Install Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# If using NVIDIA GPU:
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### Step 3: Clone & Configure
```bash
git clone https://github.com/Vikasboura/modelpicker.git
cd modelpicker
cp .env.example .env
```
Edit `.env` to set:
```bash
CORS_ORIGINS=https://modelpicker.vikasboura.dev,https://vikasboura.dev
```

### Step 4: Launch Stack
```bash
docker compose up -d --build
```

### Step 5: Pre-Pull Benchmark Models
```bash
# Pull models into the running Ollama container
docker exec -it modelpicker-ollama ollama pull qwen2.5:1.5b
docker exec -it modelpicker-ollama ollama pull llama3.2:1b
```

### Step 6: Configure Reverse Proxy & SSL (Caddy or Nginx)
Using Caddy (automatic HTTPS):
```caddyfile
api.modelpicker.vikasboura.dev {
    reverse_proxy localhost:8000
}
```

---

## 6. Health Checks & Verification

After deployment, verify that all health checkpoints return 200 OK:

1. **Backend Health Check**:
   ```bash
   curl -s https://api.modelpicker.vikasboura.dev/api/v1/health | jq
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "version": "1.0.0",
     "database": "connected",
     "ollama": {
       "status": "connected",
       "base_url": "http://ollama:11434"
     }
   }
   ```

2. **Model Discovery Check**:
   ```bash
   curl -s https://api.modelpicker.vikasboura.dev/api/v1/models | jq
   ```

3. **Frontend Check**:
   - Visit `https://modelpicker.vikasboura.dev` in a web browser.
   - Verify that the connection banner shows **Ollama Connected** (green indicator).

---

## 7. Troubleshooting Common Issues

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **CORS error in browser console** | `CORS_ORIGINS` in backend does not include frontend domain | Add `https://modelpicker.vikasboura.dev` to `CORS_ORIGINS` in backend environment and restart. |
| **Ollama shows Disconnected** | Ollama container is starting or crashed | Check container logs: `docker logs modelpicker-ollama`. Verify port 11434 is accessible. |
| **Frontend 404 on page refresh** | SPA rewrites not configured on hosting provider | Ensure `vercel.json` is present or configure Nginx `try_files $uri /index.html;`. |
| **Out of Memory during benchmarks** | Parallel inferences exceed host RAM/VRAM | Keep `MAX_CONCURRENT_REQUESTS=2` or reduce model parameter size (e.g. 1B to 3B parameters). |
