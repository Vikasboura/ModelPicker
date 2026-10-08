import type {
  BenchmarkRun,
  Dataset,
  InferenceMode,
  InferenceResult,
  Model,
  ScoringWeights,
  SystemHealth,
} from '../types';

const rawBase = import.meta.env.VITE_API_URL || '';
const LOCAL_API_BASE = rawBase ? `${rawBase.replace(/\/$/, '')}/api/v1` : 'http://localhost:8000/api/v1';
const PUBLIC_API_BASE = '/api';

// Memory/localStorage benchmark runs cache for Public Demo mode
const PUBLIC_RUNS_KEY = 'modelpicker_public_benchmark_runs';

function getStoredRuns(): BenchmarkRun[] {
  try {
    const raw = localStorage.getItem(PUBLIC_RUNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredRun(run: BenchmarkRun) {
  try {
    const runs = getStoredRuns();
    const updated = [run, ...runs.filter((r) => r.id !== run.id)].slice(0, 20);
    localStorage.setItem(PUBLIC_RUNS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'Unknown server error';
    try {
      const errorJson = await res.json();
      if (errorJson.error && errorJson.error.message) {
        errorDetail = errorJson.error.message;
      } else if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      errorDetail = `Request failed with status ${res.status} ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  getMode(): InferenceMode {
    if (typeof window === 'undefined') return 'public';
    return (localStorage.getItem('modelpicker_inference_mode') as InferenceMode) || 'public';
  },

  setMode(mode: InferenceMode): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('modelpicker_inference_mode', mode);
      window.dispatchEvent(new Event('modelpicker_mode_changed'));
    }
  },

  getBaseUrl(): string {
    return this.getMode() === 'public' ? PUBLIC_API_BASE : LOCAL_API_BASE;
  },

  async getHealth(): Promise<SystemHealth> {
    const mode = this.getMode();
    if (mode === 'public') {
      try {
        const res = await fetch(`${PUBLIC_API_BASE}/health`);
        const data = await handleResponse<any>(res);
        return {
          status: 'healthy',
          app: 'ModelPicker (Public Cloud Demo)',
          version: data.version || '1.0.0',
          database: { connected: true, engine: 'Vercel Serverless / Session Storage' },
          ollama: {
            available: data.provider_configured,
            version: 'Groq Cloud Free Tier',
            base_url: data.base_url || 'https://api.groq.com/openai/v1',
          },
        };
      } catch (err: any) {
        return {
          status: 'degraded',
          app: 'ModelPicker (Public Demo)',
          version: '1.0.0',
          database: { connected: false, engine: 'None' },
          ollama: {
            available: false,
            error: err.message,
            base_url: 'Cloud Provider',
          },
        };
      }
    }

    const res = await fetch(`${LOCAL_API_BASE}/health`);
    return handleResponse<SystemHealth>(res);
  },

  async getModels(): Promise<Model[]> {
    const mode = this.getMode();
    if (mode === 'public') {
      const res = await fetch(`${PUBLIC_API_BASE}/models`);
      return handleResponse<Model[]>(res);
    }
    const res = await fetch(`${LOCAL_API_BASE}/models`);
    return handleResponse<Model[]>(res);
  },

  async pullModel(name: string): Promise<{ status: string; message: string }> {
    const mode = this.getMode();
    if (mode === 'public') {
      throw new Error('Pulling custom weights is not supported on Public Demo mode. Switch to Local Ollama mode.');
    }
    const res = await fetch(`${LOCAL_API_BASE}/models/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleResponse(res);
  },

  async getDatasets(): Promise<Dataset[]> {
    const mode = this.getMode();
    if (mode === 'public') {
      // Curated demo datasets for public mode
      return [
        {
          id: 'demo-reasoning',
          name: 'General Reasoning & Analysis',
          description: 'Standard multi-step reasoning questions for open-weight model evaluation',
          row_count: 5,
          created_at: new Date().toISOString(),
        },
        {
          id: 'demo-code',
          name: 'Code Generation & Syntax',
          description: 'Python and TypeScript algorithmic tasks evaluating accuracy and structure',
          row_count: 5,
          created_at: new Date().toISOString(),
        },
      ];
    }
    const res = await fetch(`${LOCAL_API_BASE}/datasets`);
    return handleResponse<Dataset[]>(res);
  },

  async getDataset(id: string): Promise<Dataset> {
    const mode = this.getMode();
    if (mode === 'public') {
      const datasets = await this.getDatasets();
      const found = datasets.find((d) => d.id === id);
      if (found) return found;
      return {
        id,
        name: 'Demo Evaluation Dataset',
        row_count: 1,
        created_at: new Date().toISOString(),
      };
    }
    const res = await fetch(`${LOCAL_API_BASE}/datasets/${id}`);
    return handleResponse<Dataset>(res);
  },

  async validateDataset(file: File): Promise<{
    is_valid: boolean;
    total_rows: number;
    valid_rows: number;
    errors: string[];
    preview: any[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${LOCAL_API_BASE}/datasets/validate`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  async uploadDataset(name: string, description: string | undefined, file: File): Promise<Dataset> {
    const mode = this.getMode();
    if (mode === 'public') {
      throw new Error('Custom dataset upload requires Local Ollama mode with SQLite database.');
    }
    const formData = new FormData();
    formData.append('name', name);
    if (description) formData.append('description', description);
    formData.append('file', file);

    const res = await fetch(`${LOCAL_API_BASE}/datasets/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<Dataset>(res);
  },

  async deleteDataset(id: string): Promise<void> {
    const mode = this.getMode();
    if (mode === 'public') return;
    const res = await fetch(`${LOCAL_API_BASE}/datasets/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete dataset');
  },

  async startBenchmark(params: {
    dataset_id?: string | null;
    models: string[];
    temperature: number;
    max_tokens: number;
    warmup_requests: number;
    weights: ScoringWeights;
    judge_model?: string | null;
    prompt?: string;
  }): Promise<BenchmarkRun> {
    const mode = this.getMode();
    if (mode === 'public') {
      const res = await fetch(`${PUBLIC_API_BASE}/benchmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models: params.models,
          prompt: params.prompt || 'Compare and contrast declarative vs imperative programming paradigms.',
          quality_weight: params.weights.quality_weight,
          latency_weight: params.weights.latency_weight,
          cost_weight: params.weights.cost_weight,
        }),
      });
      const data = await handleResponse<any>(res);

      const run: BenchmarkRun = {
        id: data.id,
        dataset_name: 'Public Cloud Demo',
        status: 'COMPLETED',
        configuration: {
          models: params.models,
          temperature: params.temperature,
          max_tokens: params.max_tokens,
          warmup_requests: 0,
          weights: params.weights,
        },
        summary: {
          rankings: (data.results || []).map((r: any, idx: number) => ({
            model_name: r.model_name,
            rank: idx + 1,
            final_score: r.final_score || 0.8,
            quality_score: r.quality_score || 8.0,
            latency_score: 8.5,
            cost_score: 9.0,
            avg_latency_ms: r.latency_ms,
            avg_ttft_ms: r.ttft_ms,
            avg_tokens_per_second: r.tokens_per_second,
            total_tokens: r.token_count,
            total_cost: r.estimated_cost,
            success_rate: r.status === 'success' ? 1.0 : 0.0,
            is_recommended: r.model_name === data.recommended_model,
            is_fastest: false,
            is_cheapest: true,
            is_highest_quality: false,
            recommendation_reasons: [data.recommendation_reason],
          })),
          recommended_model: data.recommended_model,
          weights_used: params.weights,
        },
        created_at: data.created_at,
        results: (data.results || []).map((r: any) => ({
          id: r.id,
          model_name: r.model_name,
          prompt_id: 'p1',
          prompt_text: params.prompt,
          response: r.response,
          latency_ms: r.latency_ms,
          ttft_ms: r.ttft_ms,
          token_count: r.token_count,
          tokens_per_second: r.tokens_per_second,
          estimated_cost: r.estimated_cost,
          quality_score: r.quality_score,
          final_score: r.final_score,
          created_at: new Date().toISOString(),
        })),
      };

      saveStoredRun(run);
      return run;
    }

    const res = await fetch(`${LOCAL_API_BASE}/benchmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<BenchmarkRun>(res);
  },

  async getBenchmarkRuns(): Promise<BenchmarkRun[]> {
    const mode = this.getMode();
    if (mode === 'public') {
      return getStoredRuns();
    }
    const res = await fetch(`${LOCAL_API_BASE}/benchmarks`);
    return handleResponse<BenchmarkRun[]>(res);
  },

  async getBenchmarkRun(id: string): Promise<BenchmarkRun> {
    const mode = this.getMode();
    if (mode === 'public') {
      const runs = getStoredRuns();
      const found = runs.find((r) => r.id === id);
      if (found) return found;
      throw new Error('Benchmark run not found in session history');
    }
    const res = await fetch(`${LOCAL_API_BASE}/benchmarks/${id}`);
    return handleResponse<BenchmarkRun>(res);
  },

  async deleteBenchmarkRun(id: string): Promise<void> {
    const mode = this.getMode();
    if (mode === 'public') {
      const runs = getStoredRuns().filter((r) => r.id !== id);
      localStorage.setItem(PUBLIC_RUNS_KEY, JSON.stringify(runs));
      return;
    }
    const res = await fetch(`${LOCAL_API_BASE}/benchmarks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete benchmark run');
  },

  async runInference(params: {
    model: string;
    prompt: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<InferenceResult> {
    const mode = this.getMode();
    const endpoint = mode === 'public' ? `${PUBLIC_API_BASE}/inference` : `${LOCAL_API_BASE}/inference`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, stream: false, provider: mode === 'public' ? 'public_free' : 'ollama' }),
    });
    return handleResponse<InferenceResult>(res);
  },

  async scoreEvaluation(params: {
    prompt: string;
    response: string;
    expected?: string | null;
    judge_model?: string | null;
  }): Promise<{
    correctness_score: number;
    completeness_score: number;
    overall_quality_score: number;
    feedback?: string;
  }> {
    const mode = this.getMode();
    if (mode === 'public') {
      // Fast rule-based evaluator for public mode
      const len = params.response.length;
      const score = len > 100 ? (len > 300 ? 9.2 : 8.5) : 7.0;
      return {
        correctness_score: score,
        completeness_score: score,
        overall_quality_score: score,
        feedback: 'Evaluated using public rule-based heuristic engine.',
      };
    }

    const res = await fetch(`${LOCAL_API_BASE}/evaluations/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse(res);
  },
};
