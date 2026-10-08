# Portfolio Integration Guide for Vikas Boura (`https://vikasboura.dev`)

This document details how to integrate **ModelPicker** into Vikas Boura's personal portfolio at `https://vikasboura.dev`.

---

## 1. Project Overview & Metadata

- **Project Name**: ModelPicker
- **Tagline**: Choose the right model for the job.
- **Short Description**: "LLM inference and evaluation platform for comparing models across quality, latency, and cost."
- **Full Description**: "A full-stack developer platform designed to benchmark open-weight LLMs locally with Ollama. Evaluates models using rule-based metrics and LLM-as-a-judge scoring, calculates token-level latency, throughput, and projected API costs, and dynamically recommends the best model using multi-factor Pareto optimization."
- **Category**: AI / Machine Learning Infrastructure, Full-Stack Web Development, DevOps
- **Tech Stack**: React 19, TypeScript, Tailwind CSS, FastAPI, Python 3.11, SQLite, Ollama, Docker Compose, GitHub Actions, Vercel

---

## 2. Links & URLs

- **Live Application**: [https://modelpicker.vikasboura.dev](https://modelpicker.vikasboura.dev) *(points to deployed frontend; fallback: GitHub repo)*
- **GitHub Repository**: [https://github.com/Vikasboura/ModelPicker](https://github.com/Vikasboura/ModelPicker)
- **Author Portfolio**: [https://vikasboura.dev](https://vikasboura.dev)
- **Contact Email**: [contact@vikasboura.dev](mailto:contact@vikasboura.dev)
- **LinkedIn**: [https://linkedin.com/in/vikas-boura](https://linkedin.com/in/vikas-boura)

---

## 3. Ready-to-Use UI Components for `vikasboura.dev`

### A. React / Tailwind Project Card Component

```tsx
import React from 'react';
import { ExternalLink, Github, Cpu, Gauge, DollarSign, Award } from 'lucide-react';

export const ModelPickerCard: React.FC = () => {
  return (
    <div className="group relative rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-indigo-500/10">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">ModelPicker</h3>
            <p className="text-xs font-medium text-indigo-400">LLM Benchmarking & Evaluation</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
          Production Ready
        </span>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed mb-5">
        LLM inference and evaluation platform for comparing open-weight models across quality, latency, and cost. Benchmarks local Ollama models with real-time SSE streaming, LLM-as-a-judge scoring, and Pareto-optimal weighted recommendations.
      </p>

      {/* Metric highlights */}
      <div className="grid grid-cols-3 gap-2 py-3 px-3 mb-5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Scoring</div>
          <div className="text-xs font-semibold text-slate-200 mt-0.5 flex items-center justify-center gap-1">
            <Award className="h-3 w-3 text-amber-400" /> Multi-factor
          </div>
        </div>
        <div className="border-x border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Metrics</div>
          <div className="text-xs font-semibold text-slate-200 mt-0.5 flex items-center justify-center gap-1">
            <Gauge className="h-3 w-3 text-cyan-400" /> TTFT & Tok/s
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Analysis</div>
          <div className="text-xs font-semibold text-slate-200 mt-0.5 flex items-center justify-center gap-1">
            <DollarSign className="h-3 w-3 text-emerald-400" /> Cost/1k Tok
          </div>
        </div>
      </div>

      {/* Tech Stack Pills */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {['React 19', 'TypeScript', 'FastAPI', 'Python', 'Ollama', 'Docker', 'SQLite'].map((tech) => (
          <span key={tech} className="rounded-md bg-slate-800/70 px-2 py-0.5 text-[11px] font-mono text-slate-300">
            {tech}
          </span>
        ))}
      </div>

      {/* Action CTA Buttons */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
        <a
          href="https://modelpicker.vikasboura.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 shadow-sm"
        >
          View Project <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a
          href="https://github.com/Vikasboura/ModelPicker"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <Github className="h-3.5 w-3.5" /> GitHub
        </a>
      </div>
    </div>
  );
};
```

---

### B. Standard Markdown Card for Static Markdown Portfolios

```markdown
### [ModelPicker](https://modelpicker.vikasboura.dev)
**LLM inference and evaluation platform for comparing models across quality, latency and cost.**

- **Architecture**: Fast, reactive React 19 frontend paired with high-concurrency FastAPI backend communicating with local Ollama daemon.
- **Key Capabilities**: Real-time SSE streaming token metrics (TTFT, tokens/sec), rule-based and LLM-as-a-judge quality evaluation, dynamic pricing modeling, and multi-factor weighted scoring.
- **Technologies**: React 19, TypeScript, Tailwind CSS, FastAPI, Python 3.11, Docker Compose, SQLite, Ollama.
- **Links**: [Live Application](https://modelpicker.vikasboura.dev) | [GitHub Source](https://github.com/Vikasboura/ModelPicker)
```

---

## 4. DNS & Deployment Architecture for `vikasboura.dev`

To configure the custom subdomain `modelpicker.vikasboura.dev`:

1. **Vercel Frontend Deployment**:
   - Import repository `Vikasboura/ModelPicker` in Vercel.
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - In Vercel Project Settings > Domains: Add `modelpicker.vikasboura.dev`.
   - Update DNS provider for `vikasboura.dev`: Add a `CNAME` record for `modelpicker` pointing to `cname.vercel-dns.com`.

2. **Backend API URL Configuration**:
   - Set Vercel Environment Variable:
     ```env
     VITE_API_URL=https://api.modelpicker.vikasboura.dev
     ```
   - For public demo instances without self-hosted GPUs, point `VITE_API_URL` to your containerized cloud backend (Railway / Cloud Run) with a managed Ollama instance.
