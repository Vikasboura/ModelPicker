export interface Model {
  id: string;
  name: string;
  provider: string;
  parameter_count?: string | null;
  context_length?: number | null;
  input_price?: number | null;
  output_price?: number | null;
  enabled: boolean;
  installed: boolean;
  size_bytes?: number | null;
  modified_at?: string | null;
  metadata?: Record<string, any>;
}

export interface DatasetItem {
  id: string;
  prompt: string;
  expected?: string | null;
  category?: string | null;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string | null;
  row_count: number;
  items?: DatasetItem[];
  created_at: string;
}

export interface ScoringWeights {
  quality_weight: number;
  latency_weight: number;
  cost_weight: number;
}

export interface ModelMetricSummary {
  model_name: string;
  rank: number;
  final_score: number;
  quality_score: number;
  latency_score: number;
  cost_score: number;
  avg_latency_ms: number;
  avg_ttft_ms?: number | null;
  avg_tokens_per_second: number;
  total_tokens: number;
  total_cost?: number | null;
  success_rate: number;
  is_recommended: boolean;
  is_fastest: boolean;
  is_cheapest: boolean;
  is_highest_quality: boolean;
  recommendation_reasons: string[];
}

export interface BenchmarkSummary {
  rankings: ModelMetricSummary[];
  recommended_model?: string | null;
  fastest_model?: string | null;
  cheapest_model?: string | null;
  highest_quality_model?: string | null;
  weights_used: ScoringWeights;
}

export interface BenchmarkResult {
  id: string;
  model_name: string;
  prompt_id: string;
  prompt_text?: string | null;
  expected_output?: string | null;
  response?: string | null;
  latency_ms?: number | null;
  ttft_ms?: number | null;
  token_count?: number | null;
  tokens_per_second?: number | null;
  estimated_cost?: number | null;
  quality_score?: number | null;
  final_score?: number | null;
  error?: string | null;
  created_at: string;
}

export interface BenchmarkRun {
  id: string;
  dataset_id?: string | null;
  dataset_name?: string | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  configuration: {
    models: string[];
    temperature: number;
    max_tokens: number;
    warmup_requests: number;
    weights: ScoringWeights;
    judge_model?: string | null;
  };
  error_message?: string | null;
  summary?: BenchmarkSummary | null;
  created_at: string;
  results?: BenchmarkResult[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded';
  app: string;
  version: string;
  database: {
    connected: boolean;
    engine: string;
  };
  ollama: {
    available: boolean;
    version?: string;
    error?: string;
    base_url: string;
  };
}

export interface InferenceResult {
  model: string;
  response: string;
  latency_ms: number;
  ttft_ms?: number | null;
  token_count: number;
  prompt_tokens: number;
  tokens_per_second: number;
  estimated_cost?: number | null;
  timestamp: string;
}

export type InferenceMode = 'public' | 'local';
