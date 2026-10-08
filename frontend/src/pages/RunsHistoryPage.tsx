import React, { useEffect, useState } from 'react';
import {
  History,
  RotateCw,
  Trophy,
  Calendar,
  Layers,
  ArrowRight,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import type { BenchmarkRun } from '../types';

interface RunsHistoryPageProps {
  onNavigateToRun: (runId: string) => void;
  onNavigateToBenchmark: () => void;
}

export const RunsHistoryPage: React.FC<RunsHistoryPageProps> = ({
  onNavigateToRun,
  onNavigateToBenchmark,
}) => {
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const data = await api.getBenchmarkRuns();
      setRuns(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch historical runs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const handleDelete = async (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this benchmark run?')) return;
    try {
      await api.deleteBenchmarkRun(runId);
      setRuns((prev) => prev.filter((r) => r.id !== runId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete run');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-brand-400" />
            Benchmark History
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Persisted historical runs, comparative rankings, and prompt-level results.
          </p>
        </div>

        <button
          onClick={loadRuns}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-dark-800 hover:bg-dark-700 text-slate-300 rounded-lg border border-dark-700 transition"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Refresh History
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RotateCw className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      ) : runs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-dark-800 bg-dark-900/30 space-y-3">
          <History className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Benchmark Runs Recorded</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Run a benchmark to compare models on your hardware and build a performance history.
          </p>
          <button
            onClick={onNavigateToBenchmark}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition"
          >
            Launch Benchmark
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((r) => {
            const winner = r.summary?.recommended_model;
            const modelsCount = r.configuration?.models?.length || 0;
            return (
              <div
                key={r.id}
                onClick={() => onNavigateToRun(r.id)}
                className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white">#{r.id.slice(0, 8)}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        r.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : r.status === 'RUNNING'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {r.status}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Layers className="w-3.5 h-3.5 text-brand-400" />
                      {modelsCount} Models Evaluated
                    </span>
                    <span>Dataset: <strong className="text-slate-200">{r.dataset_name || 'Default Set'}</strong></span>
                  </div>
                </div>

                {/* Winner Pill & Actions */}
                <div className="flex items-center gap-4">
                  {winner && (
                    <div className="px-3 py-1.5 rounded-lg bg-brand-950/40 border border-brand-500/30 flex items-center gap-2 text-xs">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-slate-400">Winner:</span>
                      <strong className="text-white font-mono">{winner}</strong>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(e, r.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-dark-800 transition"
                      title="Delete run"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-slate-200 rounded-lg text-xs font-semibold border border-dark-700 transition">
                      Details <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
