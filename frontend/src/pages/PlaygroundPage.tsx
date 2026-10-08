import React, { useEffect, useState } from 'react';
import {
  Terminal,
  Send,
  RotateCw,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import type { Model } from '../types';

interface ModelOutput {
  model: string;
  response: string;
  latency_ms: number;
  ttft_ms?: number | null;
  token_count: number;
  tokens_per_second: number;
  estimated_cost?: number | null;
  quality_score?: number | null;
  loading: boolean;
  error?: string | null;
}

export const PlaygroundPage: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('Explain Retrieval-Augmented Generation (RAG) and its key advantages.');
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(512);
  const [outputs, setOutputs] = useState<Record<string, ModelOutput>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const m = await api.getModels();
        setModels(m);
        // Default select up to 2 installed models or first registered
        const installed = m.filter((item) => item.installed).map((item) => item.id);
        if (installed.length > 0) {
          setSelectedModels(installed.slice(0, 2));
        } else if (m.length > 0) {
          setSelectedModels([m[0].id]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load models.');
      }
    };
    fetchModels();
    window.addEventListener('modelpicker_mode_changed', fetchModels);
    return () => window.removeEventListener('modelpicker_mode_changed', fetchModels);
  }, []);

  const toggleModel = (id: string) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleRun = async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;
    setIsRunning(true);
    setError(null);

    // Initialize loading states for all selected models
    const initialOutputs: Record<string, ModelOutput> = {};
    selectedModels.forEach((m) => {
      initialOutputs[m] = {
        model: m,
        response: '',
        latency_ms: 0,
        token_count: 0,
        tokens_per_second: 0,
        loading: true,
      };
    });
    setOutputs(initialOutputs);

    // Run parallel inference on each selected model
    const promises = selectedModels.map(async (modelName) => {
      try {
        const res = await api.runInference({
          model: modelName,
          prompt,
          temperature,
          max_tokens: maxTokens,
        });

        // Also run rule-based evaluation on prompt and response
        let qualScore: number | null = null;
        try {
          const evalJson = await api.scoreEvaluation({ prompt, response: res.response });
          qualScore = evalJson.overall_quality_score;
        } catch {
          // ignore evaluation failure in playground
        }

        setOutputs((prev) => ({
          ...prev,
          [modelName]: {
            model: modelName,
            response: res.response,
            latency_ms: res.latency_ms,
            ttft_ms: res.ttft_ms,
            token_count: res.token_count,
            tokens_per_second: res.tokens_per_second,
            estimated_cost: res.estimated_cost,
            quality_score: qualScore,
            loading: false,
          },
        }));
      } catch (err: any) {
        setOutputs((prev) => ({
          ...prev,
          [modelName]: {
            model: modelName,
            response: '',
            latency_ms: 0,
            token_count: 0,
            tokens_per_second: 0,
            loading: false,
            error: err.message || 'Generation failed.',
          },
        }));
      }
    });

    await Promise.all(promises);
    setIsRunning(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Terminal className="w-6 h-6 text-brand-400" />
          Interactive Multi-Model Playground
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Send a single prompt to multiple open-weight models simultaneously and evaluate responses side-by-side in real-time.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Model Selection bar */}
      <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-brand-400" />
            Select Competing Models ({selectedModels.length} chosen)
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {models.map((m) => {
            const isSelected = selectedModels.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleModel(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-600 border-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'bg-dark-950 border-dark-700 text-slate-400 hover:text-white'
                }`}
              >
                <span>{m.name}</span>
                {m.installed && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Installed" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompt Input Box */}
      <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 space-y-4 shadow-xl">
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt to evaluate across selected models..."
          className="w-full p-3.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-sans"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-dark-800">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>Temp:</span>
              <input
                type="number"
                min="0.0"
                max="1.5"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-14 px-2 py-1 bg-dark-950 border border-dark-700 rounded text-white"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>Max Tokens:</span>
              <input
                type="number"
                min="64"
                max="4096"
                step="64"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-16 px-2 py-1 bg-dark-950 border border-dark-700 rounded text-white"
              />
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={isRunning || !prompt.trim() || selectedModels.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-500 hover:from-brand-500 hover:to-indigo-400 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 transition"
          >
            {isRunning ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Send to {selectedModels.length} Models
              </>
            )}
          </button>
        </div>
      </div>

      {/* Side-by-Side Outputs Grid */}
      {selectedModels.length > 0 && Object.keys(outputs).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedModels.map((mId) => {
            const out = outputs[mId];
            return (
              <div
                key={mId}
                className="p-5 rounded-2xl bg-dark-900 border border-dark-800 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-dark-800">
                    <span className="font-bold text-sm text-white">{mId}</span>
                    {out?.quality_score !== null && out?.quality_score !== undefined && (
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        {out.quality_score}/100 Qual
                      </span>
                    )}
                  </div>

                  {out?.loading ? (
                    <div className="p-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                      <RotateCw className="w-5 h-5 animate-spin text-brand-500" />
                      <span>Generating response...</span>
                    </div>
                  ) : out?.error ? (
                    <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs font-mono">
                      {out.error}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                      {out?.response}
                    </div>
                  )}
                </div>

                {out && !out.loading && !out.error && (
                  <div className="pt-3 border-t border-dark-800 grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                    <div className="p-1.5 rounded bg-dark-950 border border-dark-800">
                      <span className="text-slate-500 block text-[10px]">Latency</span>
                      <strong className="text-amber-300">{out.latency_ms} ms</strong>
                    </div>
                    <div className="p-1.5 rounded bg-dark-950 border border-dark-800">
                      <span className="text-slate-500 block text-[10px]">Speed</span>
                      <strong className="text-slate-200">{out.tokens_per_second} tok/s</strong>
                    </div>
                    <div className="p-1.5 rounded bg-dark-950 border border-dark-800">
                      <span className="text-slate-500 block text-[10px]">Cost</span>
                      <strong className="text-emerald-400">
                        {out.estimated_cost !== null && out.estimated_cost !== undefined
                          ? `$${out.estimated_cost.toFixed(6)}`
                          : '$0.00'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
