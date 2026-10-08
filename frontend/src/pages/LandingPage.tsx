import React from 'react';
import {
  Layers,
  ArrowRight,
  Zap,
  Award,
  DollarSign,
  Scale,
  Database,
  Cpu,
  CheckCircle2,
  ExternalLink,
  Code2,
} from 'lucide-react';

interface LandingPageProps {
  onOpenDashboard: () => void;
  onOpenPlayground: () => void;
}

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenDashboard,
  onOpenPlayground,
}) => {
  return (
    <div className="space-y-24 py-4 max-w-6xl mx-auto">
      {/* 1. Hero Section */}
      <section className="text-center space-y-6 pt-6 sm:pt-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold select-none">
          <Layers className="w-3.5 h-3.5" />
          <span>Local Open-Weight LLM Evaluation Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Choose the right model <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-indigo-100 bg-clip-text text-transparent">
            for the job.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed">
          Benchmark and compare LLMs across response quality, latency, token throughput, and cost.
          Run standardized evaluation datasets locally on Ollama with one-command Docker Compose.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={onOpenDashboard}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-xl shadow-brand-500/25 transition"
          >
            Open Dashboard <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenPlayground}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-dark-900 hover:bg-dark-800 text-slate-200 border border-dark-700 font-semibold text-sm transition"
          >
            Try Playground
          </button>

          <a
            href="https://github.com/Vikasboura/ModelPicker"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-dark-950 hover:bg-dark-900 text-slate-300 border border-dark-800 font-semibold text-sm transition"
          >
            <GithubIcon className="w-4 h-4" />
            View GitHub
          </a>
        </div>

        {/* Highlight Stats Badges */}
        <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left text-xs">
          <div className="p-3.5 rounded-xl bg-dark-900/70 border border-dark-800">
            <span className="text-slate-400 block text-[11px]">Serving Engine</span>
            <strong className="text-white text-sm font-semibold">Ollama Local</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-dark-900/70 border border-dark-800">
            <span className="text-slate-400 block text-[11px]">Telemetry</span>
            <strong className="text-amber-400 text-sm font-semibold">Wall-clock Latency</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-dark-900/70 border border-dark-800">
            <span className="text-slate-400 block text-[11px]">Evaluation</span>
            <strong className="text-rose-400 text-sm font-semibold">Rule & LLM Judge</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-dark-900/70 border border-dark-800">
            <span className="text-slate-400 block text-[11px]">Cost Accounting</span>
            <strong className="text-emerald-400 text-sm font-semibold">Token Registry</strong>
          </div>
        </div>
      </section>

      {/* 2. Core Pillars & Features */}
      <section className="space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Engineered for Precision & Reproducibility
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Everything needed to move from subjective model impressions to objective engineering decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Feature 1: Quality */}
          <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Quality Evaluation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Deterministic scoring based on n-gram recall, keyword overlap, and response completeness. Supports separate LLM judge evaluation with anti-self-judging guardrails.
            </p>
          </div>

          {/* Feature 2: Latency */}
          <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Latency & TTFT Benchmarking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Records actual wall-clock milliseconds and Time To First Token (TTFT) via Server-Sent Events. Separates model cold-start warmup latency from measured runs.
            </p>
          </div>

          {/* Feature 3: Cost */}
          <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Token Cost Estimation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Maintains an explicit model pricing table (<code className="text-slate-300">data/pricing.yaml</code>). Calculates prompt and completion costs without inventing prices.
            </p>
          </div>

          {/* Feature 4: Side-by-Side Comparison */}
          <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Side-by-Side Model Matrix</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compare Llama 3.2, Qwen 2.5, Gemma 2, and others across normalized composite scores, generation speeds (tok/s), and individual expandable prompt responses.
            </p>
          </div>

          {/* Feature 5: Custom Datasets */}
          <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Custom JSON/JSONL Datasets</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload domain-specific prompt sets in JSON or JSONL format. Built-in schema validator checks fields and generates an instant 10-row preview before benchmarking.
            </p>
          </div>

          {/* Feature 6: Local Ollama Serving */}
          <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">100% Local & Private</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Runs completely on your local workstation with Ollama and Docker. No data leaves your machine, ensuring full privacy for proprietary code and sensitive evaluation sets.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Architecture Overview */}
      <section className="p-8 rounded-3xl bg-dark-900 border border-dark-800 space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
            System Design
          </span>
          <h2 className="text-2xl font-bold text-white">Architecture Flow</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            A clean modular separation of concerns ensures business logic remains strictly in service layers, keeping API routes lightweight and testable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-dark-950/70 border border-dark-800 space-y-2">
            <div className="flex items-center gap-2 text-brand-400 font-bold">
              <Code2 className="w-4 h-4" /> React Frontend
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Vite, TypeScript, Tailwind CSS, and Recharts. Live progress polling, interactive playground, and mobile-responsive layouts.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-dark-950/70 border border-dark-800 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <Layers className="w-4 h-4" /> FastAPI Backend
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Pydantic v2 validation, SSE streaming, structured error handling, and modular service-based architecture.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-dark-950/70 border border-dark-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Zap className="w-4 h-4" /> Benchmark Engine
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Cold-start warmup requests, semaphore-bounded concurrency (<code className="text-slate-300">MAX_CONCURRENT_REQUESTS=2</code>), and min-max metric normalization.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-dark-950/70 border border-dark-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Cpu className="w-4 h-4" /> Ollama Serving
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Official Docker container serving models like Llama 3.2, Qwen 2.5, and Gemma 2 with GPU acceleration or CPU execution.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Methodology & Weighted Formula */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
            Scoring Mathematics
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            How ModelPicker Calculates Recommendations
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Raw quality, latency, and costs have incompatible scales. ModelPicker normalizes every metric to a uniform 0–100 scale:
          </p>

          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Quality Score ($S_q$)</strong>: Higher is better (0–100 range from evaluated concept recall and completeness).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span><strong>Latency Score ($S_l$)</strong>: Lower is better (min-max scaled between 25 and 100 where fastest = 100).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span><strong>Cost Score ($S_c$)</strong>: Lower is better (scaled between 25 and 100 based on price per 1M tokens).</span>
            </li>
          </ul>

          <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 font-mono text-xs text-brand-300">
            Final Score = (S_q × W_q) + (S_l × W_l) + (S_c × W_c)
          </div>
        </div>

        {/* Dynamic Recommendation Card Preview */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/70 to-dark-900 border border-brand-500/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              🏆 Recommendation Engine Output
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300">
              Rank #1 Winner
            </span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">qwen2.5:1.5b</h3>
            <p className="text-xs text-slate-400 mt-1">Alibaba Cloud • 1.54B Parameters • 32k Context</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded bg-dark-950/60 border border-dark-800">
              <span className="text-slate-400 block text-[10px]">Quality</span>
              <strong className="text-rose-300">84.2 / 100</strong>
            </div>
            <div className="p-2 rounded bg-dark-950/60 border border-dark-800">
              <span className="text-slate-400 block text-[10px]">Latency</span>
              <strong className="text-amber-300">210 ms</strong>
            </div>
            <div className="p-2 rounded bg-dark-950/60 border border-dark-800">
              <span className="text-slate-400 block text-[10px]">Cost / 1M</span>
              <strong className="text-emerald-400">$0.05</strong>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-dark-950/80 border border-dark-800 text-[11px] text-slate-300 space-y-1">
            <p className="font-semibold text-brand-300">Generated Recommendation Reasons:</p>
            <p>• Highest overall score across weighted criteria (91.4 pts)</p>
            <p>• Lowest response latency (210 ms)</p>
            <p>• Competitive pricing at $0.05 per 1M tokens</p>
          </div>
        </div>
      </section>

      {/* 5. Creator & Portfolio Integration Section */}
      <section className="p-8 rounded-3xl bg-dark-900 border border-dark-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Portfolio Project
          </span>
          <h2 className="text-xl font-bold text-white">Built by Vikas Boura</h2>
          <p className="text-xs text-slate-400 max-w-md">
            Full-stack AI/ML and software engineer specializing in scalable LLM systems, evaluation pipelines, and high-performance developer tooling.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://vikasboura.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-200 text-xs font-semibold border border-dark-700 transition"
          >
            <span>vikasboura.dev</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <a
            href="https://github.com/Vikasboura"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-200 text-xs font-semibold border border-dark-700 transition"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>

          <a
            href="https://linkedin.com/in/vikas-boura"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-200 text-xs font-semibold border border-dark-700 transition"
          >
            <span>LinkedIn</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <a
            href="mailto:contact@vikasboura.dev"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition"
          >
            <span>Contact</span>
          </a>
        </div>
      </section>
    </div>
  );
};
