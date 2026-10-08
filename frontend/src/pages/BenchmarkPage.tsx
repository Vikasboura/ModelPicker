import React, { useEffect, useState } from 'react';
import {
  Play,
  RotateCw,
  Sliders,
  Check,
  AlertCircle,
  Database,
  Layers,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { api } from '../services/api';
import type { BenchmarkRun, Dataset, Model, ScoringWeights } from '../types';

interface BenchmarkPageProps {
  onNavigateToRun: (runId: string) => void;
}

export const BenchmarkPage: React.FC<BenchmarkPageProps> = ({ onNavigateToRun }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [selectedModels, setSelectedModels] = useState<string[]>([
    'llama3.2:1b',
    'qwen2.5:1.5b',
    'gemma2:2b',
  ]);

  // Parameters
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(512);
  const [warmupRequests, setWarmupRequests] = useState(1);

  // Scoring weights
  const [weights, setWeights] = useState<ScoringWeights>({
    quality_weight: 0.5,
    latency_weight: 0.3,
    cost_weight: 0.2,
  });

  // Execution state
  const [activeRun, setActiveRun] = useState<BenchmarkRun | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResources = async () => {
      try {
        const [mList, dList] = await Promise.all([api.getModels(), api.getDatasets()]);
        setModels(mList);
        setDatasets(dList);

        // Pre-select models available
        const installed = mList.filter((m) => m.installed).map((m) => m.id);
        if (installed.length > 0) {
          setSelectedModels(installed.slice(0, 3));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load options.');
      }
    };
    loadResources();
    window.addEventListener('modelpicker_mode_changed', loadResources);
    return () => window.removeEventListener('modelpicker_mode_changed', loadResources);
  }, []);

  // Poll active run
  useEffect(() => {
    if (!activeRun || activeRun.status === 'COMPLETED' || activeRun.status === 'FAILED') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await api.getBenchmarkRun(activeRun.id);
        setActiveRun(updated);
      } catch (err) {
        console.error('Error polling run:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeRun]);

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  const updateWeight = (key: keyof ScoringWeights, val: number) => {
    setWeights((prev) => {
      const next = { ...prev, [key]: val };
      return next;
    });
  };

  // Normalization preview
  const totalWeight = weights.quality_weight + weights.latency_weight + weights.cost_weight || 1;
  const normQ = (weights.quality_weight / totalWeight).toFixed(2);
  const normL = (weights.latency_weight / totalWeight).toFixed(2);
  const normC = (weights.cost_weight / totalWeight).toFixed(2);

  const handleStartBenchmark = async () => {
    if (selectedModels.length === 0) {
      setError('Please select at least one model to benchmark.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const run = await api.startBenchmark({
        dataset_id: selectedDatasetId || null,
        models: selectedModels,
        temperature,
        max_tokens: maxTokens,
        warmup_requests: warmupRequests,
        weights: {
          quality_weight: Number(normQ),
          latency_weight: Number(normL),
          cost_weight: Number(normC),
        },
      });
      setActiveRun(run);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger benchmark run.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Sliders className="w-6 h-6 text-brand-400" />
          Benchmark Configuration
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure test parameters, select datasets and models, and initiate multi-model evaluation.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Benchmark Status Banner (if running or just finished) */}
      {activeRun && (
        <div className="p-6 rounded-2xl bg-dark-900 border border-brand-500/30 shadow-xl shadow-brand-500/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeRun.status === 'RUNNING' || activeRun.status === 'PENDING' ? (
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400">
                  <RotateCw className="w-5 h-5 animate-spin" />
                </div>
              ) : activeRun.status === 'COMPLETED' ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-white">
                  {activeRun.status === 'RUNNING' && 'Benchmark Running in Background...'}
                  {activeRun.status === 'PENDING' && 'Initializing Benchmark Run...'}
                  {activeRun.status === 'COMPLETED' && 'Benchmark Completed Successfully!'}
                  {activeRun.status === 'FAILED' && 'Benchmark Encountered an Error'}
                </h3>
                <p className="text-xs text-slate-400">
                  Run ID: <code className="text-slate-300">{activeRun.id}</code>
                </p>
              </div>
            </div>

            {activeRun.status === 'COMPLETED' && (
              <button
                onClick={() => onNavigateToRun(activeRun.id)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-brand-500/20 transition"
              >
                View Detailed Results <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Model progress checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-dark-800">
            {activeRun.configuration?.models?.map((mName: string) => {
              const isCompleted = activeRun.status === 'COMPLETED';
              return (
                <div
                  key={mName}
                  className="flex items-center justify-between p-3 rounded-lg bg-dark-950/60 border border-dark-800 text-xs"
                >
                  <span className="font-semibold text-white truncate">{mName}</span>
                  {isCompleted ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-mono font-medium">
                      <Check className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : activeRun.status === 'FAILED' ? (
                    <span className="text-rose-400">Failed</span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-mono">
                      <RotateCw className="w-3.5 h-3.5 animate-spin" /> In Progress
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Configuration Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Model & Dataset Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Dataset Selection */}
          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-brand-400" />
              1. Select Evaluation Dataset
            </h2>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Default Evaluation Dataset (Built-in General Reasoning & Code)</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.row_count} prompts)
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              Every selected model receives the exact same set of prompts under identical conditions.
            </p>
          </div>

          {/* 2. Model Selection */}
          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400" />
                2. Select Models to Benchmark
              </h2>
              <span className="text-xs text-slate-400">
                {selectedModels.length} selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {models.map((m) => {
                const isSelected = selectedModels.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleModel(m.id)}
                    className={`p-3 rounded-lg border cursor-pointer select-none transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-brand-950/30 border-brand-500/50 text-white'
                        : 'bg-dark-950/40 border-dark-800 text-slate-400 hover:border-dark-700'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-xs text-white">{m.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{m.id}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                        isSelected
                          ? 'bg-brand-600 border-brand-500 text-white'
                          : 'border-dark-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Generation Settings & Scoring Weights */}
        <div className="space-y-6">
          {/* Generation Settings */}
          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              Generation Settings
            </h2>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Temperature</span>
                <span className="font-mono text-white">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Max Tokens</span>
                <span className="font-mono text-white">{maxTokens}</span>
              </div>
              <input
                type="range"
                min="128"
                max="2048"
                step="64"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Warmup Requests</span>
                <span className="font-mono text-white">{warmupRequests}</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="1"
                value={warmupRequests}
                onChange={(e) => setWarmupRequests(parseInt(e.target.value))}
                className="w-full accent-brand-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Preloads weights into memory. Discarded from benchmark stats.
              </p>
            </div>
          </div>

          {/* Weighted Scoring Configuration */}
          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-400" />
              Scoring Weights
            </h2>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Quality Weight ({(Number(normQ) * 100).toFixed(0)}%)</span>
                <span className="font-mono text-white">{weights.quality_weight}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={weights.quality_weight}
                onChange={(e) => updateWeight('quality_weight', parseFloat(e.target.value))}
                className="w-full accent-rose-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Latency Weight ({(Number(normL) * 100).toFixed(0)}%)</span>
                <span className="font-mono text-white">{weights.latency_weight}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={weights.latency_weight}
                onChange={(e) => updateWeight('latency_weight', parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Cost Weight ({(Number(normC) * 100).toFixed(0)}%)</span>
                <span className="font-mono text-white">{weights.cost_weight}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={weights.cost_weight}
                onChange={(e) => updateWeight('cost_weight', parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-dark-950/60 border border-dark-800 text-[11px] text-slate-400">
              Final Score = (Quality × {normQ}) + (Latency × {normL}) + (Cost × {normC})
            </div>
          </div>

          {/* Trigger Button */}
          <button
            onClick={handleStartBenchmark}
            disabled={isSubmitting || selectedModels.length === 0}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-600 to-indigo-500 hover:from-brand-500 hover:to-indigo-400 disabled:opacity-50 text-white shadow-xl shadow-brand-500/20 transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                Starting Benchmark...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Benchmark ({selectedModels.length} Models)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
