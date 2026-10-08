import React, { useEffect, useState } from 'react';
import {
  Trophy,
  Zap,
  DollarSign,
  Award,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  AlertCircle,
  Play,
  RotateCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import type { BenchmarkRun, SystemHealth } from '../types';

interface DashboardProps {
  onNavigateToBenchmark: () => void;
  onNavigateToRun: (runId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToBenchmark,
  onNavigateToRun,
}) => {
  const [latestRun, setLatestRun] = useState<BenchmarkRun | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, runs] = await Promise.all([api.getHealth(), api.getBenchmarkRuns()]);
      setHealth(h);
      const completedRuns = runs.filter((r) => r.status === 'COMPLETED' && r.summary);
      if (completedRuns.length > 0) {
        setLatestRun(completedRuns[0]);
      } else {
        setLatestRun(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('modelpicker_mode_changed', loadData);
    return () => window.removeEventListener('modelpicker_mode_changed', loadData);
  }, []);

  const summary = latestRun?.summary;
  const rankings = summary?.rankings || [];

  const recommended = rankings.find((r) => r.is_recommended);
  const fastest = rankings.find((r) => r.is_fastest);
  const cheapest = rankings.find((r) => r.is_cheapest);
  const highestQ = rankings.find((r) => r.is_highest_quality);

  const chartData = rankings.map((r) => ({
    name: r.model_name,
    score: r.final_score,
    quality: r.quality_score,
    latency: r.avg_latency_ms,
    tokensPerSec: r.avg_tokens_per_second,
    cost: r.total_cost !== null && r.total_cost !== undefined ? r.total_cost * 1000 : 0, // In milli-cents
  }));

  const currentMode = api.getMode();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RotateCw className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading model benchmark metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mode Information Banner */}
      <div
        className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
          currentMode === 'public'
            ? 'bg-brand-950/40 border-brand-800/60 text-brand-200'
            : 'bg-dark-900 border-dark-800 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2 h-2 rounded-full ${
              currentMode === 'public' ? 'bg-cyan-400' : 'bg-emerald-400'
            }`}
          />
          <span>
            {currentMode === 'public'
              ? 'Public Demo Mode: Evaluating open-weight models live on Groq free cloud tier. Zero local setup required.'
              : 'Local Mode: Interfacing with your local FastAPI + Ollama server on localhost:8000.'}
          </span>
        </div>
        <span className="font-mono text-[11px] opacity-75 hidden md:inline">
          {currentMode === 'public' ? 'Provider: Groq Cloud (Free)' : 'Provider: Local Ollama'}
        </span>
      </div>

      {/* Header & Status Alert */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Model Evaluation Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Data-driven LLM comparison across response quality, latency, token throughput, and cost.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-dark-800 hover:bg-dark-700 text-slate-300 rounded-lg border border-dark-700 transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={onNavigateToBenchmark}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-lg shadow-brand-500/20 transition"
          >
            <Play className="w-4 h-4" />
            Run New Benchmark
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ollama Offline Warning Banner if not reachable */}
      {health && !health.ollama.available && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-rose-200">Ollama is currently unreachable</p>
            <p className="mt-0.5 text-rose-300/80">
              The backend could not reach Ollama at <code className="bg-rose-950/40 px-1 py-0.5 rounded text-rose-200">{health.ollama.base_url}</code>.
              Make sure the Ollama container or local daemon is running. Real-time inference and live benchmarks require an active Ollama instance.
            </p>
          </div>
        </div>
      )}

      {/* Empty State when no benchmarks exist yet */}
      {!latestRun && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-dark-700 bg-dark-900/40 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">No Benchmark Runs Recorded Yet</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
              Run your first benchmark against locally installed models (e.g. Llama 3.2, Qwen 2.5, Gemma 2)
              to measure latency, evaluate answer quality, compute costs, and calculate the recommended model.
            </p>
          </div>
          <button
            onClick={onNavigateToBenchmark}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition"
          >
            <Play className="w-4 h-4" />
            Launch Initial Benchmark
          </button>
        </div>
      )}

      {/* When a real benchmark run exists */}
      {latestRun && summary && (
        <>
          {/* Highlight Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 🏆 Recommended Model */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-950/60 to-dark-900 border border-brand-500/30 relative overflow-hidden shadow-lg shadow-brand-500/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Recommended
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300">
                  Score {recommended?.final_score ?? '-'}
                </span>
              </div>
              <p className="text-xl font-bold text-white mt-3 truncate">
                {recommended?.model_name || 'N/A'}
              </p>
              <div className="mt-2 space-y-1">
                {recommended?.recommendation_reasons.slice(0, 2).map((r, i) => (
                  <p key={i} className="text-xs text-slate-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{r}</span>
                  </p>
                ))}
              </div>
            </div>

            {/* ⚡ Fastest Model */}
            <div className="p-5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Fastest Response
              </span>
              <p className="text-xl font-bold text-white mt-3 truncate">
                {fastest?.model_name || 'N/A'}
              </p>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Avg Latency: <strong className="text-white">{fastest?.avg_latency_ms} ms</strong></span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Throughput: <strong className="text-slate-200">{fastest?.avg_tokens_per_second} tok/s</strong>
              </p>
            </div>

            {/* 💰 Cheapest Model */}
            <div className="p-5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Lowest Cost
              </span>
              <p className="text-xl font-bold text-white mt-3 truncate">
                {cheapest?.model_name || 'N/A'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Total Benchmark Cost:{' '}
                <strong className="text-emerald-400">
                  {cheapest?.total_cost !== null && cheapest?.total_cost !== undefined
                    ? `$${cheapest.total_cost.toFixed(6)}`
                    : 'N/A'}
                </strong>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Cost Score: <strong className="text-slate-200">{cheapest?.cost_score}/100</strong>
              </p>
            </div>

            {/* 🎯 Highest Quality */}
            <div className="p-5 rounded-xl bg-dark-900 border border-dark-800">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-rose-400" />
                Highest Quality
              </span>
              <p className="text-xl font-bold text-white mt-3 truncate">
                {highestQ?.model_name || 'N/A'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Evaluation Score:{' '}
                <strong className="text-rose-300">{highestQ?.quality_score}/100</strong>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Quality Rank: <strong className="text-slate-200">#1 in test set</strong>
              </p>
            </div>
          </div>

          {/* Recharts Comparison Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Final Weighted Score Comparison */}
            <div className="p-5 rounded-xl bg-dark-900 border border-dark-800">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                Final Composite Score Comparison
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.name === recommended?.model_name ? '#6366f1' : '#334155'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Latency Comparison */}
            <div className="p-5 rounded-xl bg-dark-900 border border-dark-800">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Average Generation Latency (ms - lower is better)
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="latency" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Model Comparison Table */}
          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Full Model Comparison Table</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Run #{latestRun.id.slice(0, 8)} • Dataset: {latestRun.dataset_name || 'Default'} • {new Date(latestRun.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => onNavigateToRun(latestRun.id)}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition"
              >
                Inspect Individual Prompts <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-dark-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-3">Model</th>
                    <th className="py-3 px-3">Quality Score</th>
                    <th className="py-3 px-3">Avg Latency</th>
                    <th className="py-3 px-3">Throughput</th>
                    <th className="py-3 px-3">Total Cost</th>
                    <th className="py-3 px-3">Final Score</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/60 font-mono text-xs">
                  {rankings.map((r) => (
                    <tr
                      key={r.model_name}
                      className={`hover:bg-dark-850/50 transition ${
                        r.is_recommended ? 'bg-brand-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-sans font-bold text-slate-300">
                        {r.rank === 1 ? '🥇 #1' : r.rank === 2 ? '🥈 #2' : r.rank === 3 ? '🥉 #3' : `#${r.rank}`}
                      </td>
                      <td className="py-3 px-3 font-sans font-semibold text-white flex items-center gap-2">
                        {r.model_name}
                        {r.is_recommended && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-brand-500/20 text-brand-300 font-sans font-bold">
                            WINNER
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        <span className="text-rose-400 font-bold">{r.quality_score}</span> / 100
                      </td>
                      <td className="py-3 px-3 text-amber-300">{r.avg_latency_ms} ms</td>
                      <td className="py-3 px-3 text-slate-300">{r.avg_tokens_per_second} tok/s</td>
                      <td className="py-3 px-3 text-emerald-400">
                        {r.total_cost !== null && r.total_cost !== undefined ? `$${r.total_cost.toFixed(6)}` : 'N/A'}
                      </td>
                      <td className="py-3 px-3 font-bold text-brand-400 text-sm">{r.final_score}</td>
                      <td className="py-3 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {Math.round(r.success_rate * 100)}% Pass
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
