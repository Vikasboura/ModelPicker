import type {
  BenchmarkRun,
  Dataset,
  InferenceResult,
  Model,
  ScoringWeights,
  SystemHealth,
} from '../types';

const rawBase = import.meta.env.VITE_API_URL || '';
const API_BASE = rawBase ? `${rawBase.replace(/\/$/, '')}/api/v1` : '/api/v1';

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
  async getHealth(): Promise<SystemHealth> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse<SystemHealth>(res);
  },

  async getModels(): Promise<Model[]> {
    const res = await fetch(`${API_BASE}/models`);
    return handleResponse<Model[]>(res);
  },

  async pullModel(name: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/models/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleResponse(res);
  },

  async getDatasets(): Promise<Dataset[]> {
    const res = await fetch(`${API_BASE}/datasets`);
    return handleResponse<Dataset[]>(res);
  },

  async getDataset(id: string): Promise<Dataset> {
    const res = await fetch(`${API_BASE}/datasets/${id}`);
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
    const res = await fetch(`${API_BASE}/datasets/validate`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  async uploadDataset(name: string, description: string | undefined, file: File): Promise<Dataset> {
    const formData = new FormData();
    formData.append('name', name);
    if (description) formData.append('description', description);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/datasets/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<Dataset>(res);
  },

  async deleteDataset(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/datasets/${id}`, {
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
  }): Promise<BenchmarkRun> {
    const res = await fetch(`${API_BASE}/benchmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<BenchmarkRun>(res);
  },

  async getBenchmarkRuns(): Promise<BenchmarkRun[]> {
    const res = await fetch(`${API_BASE}/benchmarks`);
    return handleResponse<BenchmarkRun[]>(res);
  },

  async getBenchmarkRun(id: string): Promise<BenchmarkRun> {
    const res = await fetch(`${API_BASE}/benchmarks/${id}`);
    return handleResponse<BenchmarkRun>(res);
  },

  async deleteBenchmarkRun(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/benchmarks/${id}`, {
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
    const res = await fetch(`${API_BASE}/inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, stream: false }),
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
    const res = await fetch(`${API_BASE}/evaluations/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse(res);
  },
};
