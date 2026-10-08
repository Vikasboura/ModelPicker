import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Trophy,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { api } from '../services/api';
import type { BenchmarkResult, BenchmarkRun } from '../types';

interface RunDetailsPageProps {
  runId: string;
  onBack: () => void;
}

export const RunDetailsPage: React.FC<RunDetailsPageProps> = ({ runId, onBack }) => {
  const [run, setRun] = useState<BenchmarkRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPrompts, setExpandedPrompts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchRun = async () => {
      setLoading(true);
      try {
        const data = await api.getBenchmarkRun(runId);
        setRun(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load run details.');
      } finally {
        setLoading(false);
      }
    };
    fetchRun();
  }, [runId]);

  const togglePrompt = (promptId: string) => {
    setExpandedPrompts((prev) => ({ ...prev, [promptId]: !prev[promptId] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RotateCw className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="p-6 rounded-xl bg-dark-900 border border-dark-800 space-y-4">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertCircle className="w-5 h-5" />
          <h2 className="text-base font-bold">Failed to load run #{runId}</h2>
        </div>
        <p className="text-sm text-slate-400">{error || 'Benchmark run not found.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg text-xs font-semibold"
        >
          Back to Runs
        </button>
      </div>
    );
  }

  const summary = run.summary;
  const rankings = summary?.rankings || [];
  const results = run.results || [];

  // Group individual prompt results by prompt_id
  const promptGroups: Record<
    string,
    { prompt_text?: string | null; expected?: string | null; results: BenchmarkResult[] }
  > = {};

  results.forEach((r) => {
    if (!promptGroups[r.prompt_id]) {
      promptGroups[r.prompt_id] = {
        prompt_text: r.prompt_text,
        expected: r.expected_output,
        results: [],
      };
    }
    promptGroups[r.prompt_id].results.push(r);
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Navigation & Meta */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Runs
        </button>

        <span className="text-xs text-slate-400">
          Executed on {new Date(run.created_at).toLocaleString()}
        </span>
      </div>

      {/* Run Summary Banner */}
      <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Benchmark Run #{run.id.slice(0, 8)}
              </h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {run.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dataset: <strong className="text-slate-200">{run.dataset_name || 'Default Set'}</strong> • Models:{' '}
              {run.configuration?.models?.join(', ')}
            </p>
          </div>

          {summary?.recommended_model && (
            <div className="px-4 py-2.5 rounded-xl bg-brand-950/50 border border-brand-500/40 flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-[11px] text-brand-300 font-semibold block uppercase tracking-wider">
                  Top Recommendation
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  {summary.recommended_model}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Model Ranking Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-dark-800">
          {rankings.map((r) => (
            <div
              key={r.model_name}
              className={`p-3 rounded-xl border ${
                r.is_recommended
                  ? 'bg-brand-950/30 border-brand-500/40'
                  : 'bg-dark-950/40 border-dark-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'} #{r.rank} {r.model_name}
                </span>
                <span className="text-xs font-mono font-bold text-brand-400">
                  {r.final_score} pts
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                <p>Quality: <strong className="text-rose-300">{r.quality_score}/100</strong></p>
                <p>Latency: <strong className="text-amber-300">{r.avg_latency_ms} ms</strong></p>
                <p>Throughput: <strong className="text-slate-300">{r.avg_tokens_per_second} tok/s</strong></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Side-by-Side Model Comparison Table */}
      <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          Side-by-Side Model Comparison Matrix
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-dark-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-3 px-4 bg-dark-950/50">Metric</th>
                {rankings.map((m) => (
                  <th
                    key={m.model_name}
                    className={`py-3 px-4 ${
                      m.is_recommended ? 'bg-brand-950/30 text-brand-300 font-bold' : ''
                    }`}
                  >
                    {m.model_name}
                    {m.is_recommended && ' 🏆'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/60 font-mono text-xs">
              <tr>
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-dark-950/30">
                  Final Score (Weighted)
                </td>
                {rankings.map((m) => (
                  <td key={m.model_name} className="py-3 px-4 font-bold text-brand-400 text-sm">
                    {m.final_score}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-dark-950/30">
                  Quality Score (0-100)
                </td>
                {rankings.map((m) => (
                  <td key={m.model_name} className="py-3 px-4 text-rose-300">
                    {m.quality_score}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-dark-950/30">
                  Average Latency
                </td>
                {rankings.map((m) => (
                  <td key={m.model_name} className="py-3 px-4 text-amber-300">
                    {m.avg_latency_ms} ms
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-dark-950/30">
                  Generation Speed
                </td>
                {rankings.map((m) => (
                  <td key={m.model_name} className="py-3 px-4 text-slate-200">
                    {m.avg_tokens_per_second} tok/s
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-dark-950/30">
                  Total Tokens Generated
                </td>
                {rankings.map((m) => (
                  <td key={m.model_name} className="py-3 px-4 text-slate-300">
                    {m.total_tokens}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-dark-950/30">
                  Total Estimated Cost
                </td>
                {rankings.map((m) => (
                  <td key={m.model_name} className="py-3 px-4 text-emerald-400">
                    {m.total_cost !== null && m.total_cost !== undefined
                      ? `$${m.total_cost.toFixed(6)}`
                      : 'Unavailable'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Prompt-Level Inspector */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Individual Prompt Results & Responses</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Expand any prompt to inspect raw model outputs, measured generation latency, and quality evaluation.
          </p>
        </div>

        <div className="space-y-3">
          {Object.entries(promptGroups).map(([promptId, group], index) => {
            const isExpanded = expandedPrompts[promptId] ?? false;
            return (
              <div
                key={promptId}
                className="rounded-xl bg-dark-900 border border-dark-800 overflow-hidden transition"
              >
                {/* Header row */}
                <div
                  onClick={() => togglePrompt(promptId)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-dark-850/50 transition select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-dark-800 flex items-center justify-center text-xs font-mono text-slate-400">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white line-clamp-1">
                        {group.prompt_text || promptId}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">ID: {promptId}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      {group.results.length} model outputs
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-dark-800 space-y-4 bg-dark-950/40">
                    {/* Expected Reference Answer if present */}
                    {group.expected && (
                      <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-xs">
                        <span className="font-semibold text-indigo-300 block mb-1">
                          Reference / Expected Output:
                        </span>
                        <p className="text-slate-300 whitespace-pre-wrap font-mono text-[11px]">
                          {group.expected}
                        </p>
                      </div>
                    )}

                    {/* Model Responses Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.results.map((res) => (
                        <div
                          key={res.model_name}
                          className="p-4 rounded-xl bg-dark-900 border border-dark-800 flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-center justify-between pb-2 border-b border-dark-800">
                              <span className="font-bold text-xs text-white truncate">
                                {res.model_name}
                              </span>
                              <span className="text-xs font-mono font-bold text-rose-300">
                                {res.quality_score !== null ? `${res.quality_score}/100` : 'N/A'}
                              </span>
                            </div>

                            {/* Response content */}
                            <div className="mt-3">
                              {res.error ? (
                                <p className="text-xs text-rose-400 font-mono bg-rose-950/30 p-2 rounded">
                                  {res.error}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                                  {res.response || 'No response generated.'}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Generation Metrics Footer */}
                          <div className="pt-2 border-t border-dark-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span className="text-amber-300">{res.latency_ms} ms</span>
                            <span>{res.tokens_per_second} tok/s</span>
                            <span className="text-emerald-400">
                              {res.estimated_cost !== null && res.estimated_cost !== undefined
                                ? `$${res.estimated_cost.toFixed(6)}`
                                : '$0.00'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
