import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Search,
  DollarSign,
  HardDrive,
} from 'lucide-react';
import { api } from '../services/api';
import type { Model, SystemHealth } from '../types';

export const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullInput, setPullInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, h] = await Promise.all([api.getModels(), api.getHealth()]);
      setModels(m);
      setHealth(h);
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Failed to fetch models' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('modelpicker_mode_changed', loadData);
    return () => window.removeEventListener('modelpicker_mode_changed', loadData);
  }, []);

  const handlePullModel = async (modelName: string) => {
    if (!modelName.trim()) return;
    setPullingModel(modelName);
    setFeedback(null);
    try {
      const res = await api.pullModel(modelName);
      setFeedback({
        type: 'success',
        message: `${res.message} Background pull started. Check back in a few moments.`,
      });
      setPullInput('');
      setTimeout(loadData, 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Pull request failed.' });
    } finally {
      setPullingModel(null);
    }
  };

  const filteredModels = models.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-brand-400" />
            Model Registry & Serving
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage open-weight LLMs, inspect pricing configurations, and verify local Ollama installations.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-dark-800 hover:bg-dark-700 text-slate-300 rounded-lg border border-dark-700 transition"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Refresh Models
        </button>
      </div>

      {/* Live Ollama Serving Status Bar */}
      <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              health?.ollama?.available ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-rose-500'
            }`}
          />
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span>Ollama Engine:</span>
              <span className={health?.ollama?.available ? 'text-emerald-400' : 'text-rose-400'}>
                {health?.ollama?.available ? 'Available & Serving' : 'Unreachable'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Host: <code className="text-slate-300">{health?.ollama?.base_url || 'http://localhost:11434'}</code>
            </p>
          </div>
        </div>

        {/* Pull Custom Model Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={pullInput}
            onChange={(e) => setPullInput(e.target.value)}
            placeholder="e.g. llama3.2:1b"
            className="px-3 py-1.5 bg-dark-950 border border-dark-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 w-48"
          />
          <button
            onClick={() => handlePullModel(pullInput)}
            disabled={!pullInput.trim() || pullingModel !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            Pull Model
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter models by name, family, or provider..."
          className="w-full pl-9 pr-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
        />
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RotateCw className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      ) : (
        /* Model Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-base tracking-tight">{m.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{m.id}</p>
                  </div>
                  {m.installed ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Installed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      Not Downloaded
                    </span>
                  )}
                </div>

                {/* Specs & Pricing */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-dark-950/60 border border-dark-800/80">
                    <span className="text-slate-400 text-[11px] block">Provider</span>
                    <span className="font-medium text-slate-200 truncate block">{m.provider}</span>
                  </div>
                  <div className="p-2 rounded bg-dark-950/60 border border-dark-800/80">
                    <span className="text-slate-400 text-[11px] block">Parameters</span>
                    <span className="font-medium text-slate-200">{m.parameter_count || 'Unknown'}</span>
                  </div>
                  <div className="p-2 rounded bg-dark-950/60 border border-dark-800/80">
                    <span className="text-slate-400 text-[11px] block">Context Window</span>
                    <span className="font-medium text-slate-200">
                      {m.context_length ? `${(m.context_length / 1024).toFixed(0)}k tokens` : 'Standard'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-dark-950/60 border border-dark-800/80">
                    <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-400" /> Pricing / 1M
                    </span>
                    <span className="font-medium text-emerald-400 font-mono">
                      {m.input_price !== null && m.input_price !== undefined
                        ? `$${m.input_price.toFixed(2)}`
                        : 'Unavailable'}
                    </span>
                  </div>
                </div>

                {m.metadata?.description && (
                  <p className="mt-3 text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {m.metadata.description}
                  </p>
                )}
              </div>

              {/* Action Bar */}
              <div className="mt-4 pt-3 border-t border-dark-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                  {m.size_bytes ? (
                    <>
                      <HardDrive className="w-3 h-3" />
                      {(m.size_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                    </>
                  ) : (
                    'Ready to pull'
                  )}
                </span>

                {!m.installed && (
                  <button
                    onClick={() => handlePullModel(m.id)}
                    disabled={pullingModel === m.id}
                    className="flex items-center gap-1 px-3 py-1 bg-dark-800 hover:bg-dark-700 text-slate-200 rounded text-xs font-medium border border-dark-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {pullingModel === m.id ? 'Pulling...' : 'Pull'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
