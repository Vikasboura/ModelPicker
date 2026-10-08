from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ScoringWeights(BaseModel):
    quality_weight: float = Field(0.5, ge=0.0, le=100.0)
    latency_weight: float = Field(0.3, ge=0.0, le=100.0)
    cost_weight: float = Field(0.2, ge=0.0, le=100.0)

    @model_validator(mode="after")
    def normalize_or_validate(self) -> "ScoringWeights":
        total = self.quality_weight + self.latency_weight + self.cost_weight
        if total <= 0:
            self.quality_weight = 0.5
            self.latency_weight = 0.3
            self.cost_weight = 0.2
        elif abs(total - 1.0) > 1e-4:
            # Auto-normalize if not summing to exactly 1.0
            self.quality_weight = round(self.quality_weight / total, 4)
            self.latency_weight = round(self.latency_weight / total, 4)
            self.cost_weight = round(1.0 - (self.quality_weight + self.latency_weight), 4)
        return self


class BenchmarkStartRequest(BaseModel):
    dataset_id: str | None = Field(None, description="ID of stored dataset or uses default")
    models: list[str] = Field(..., min_length=1, description="List of model IDs to benchmark")
    temperature: float = Field(0.2, ge=0.0, le=2.0)
    max_tokens: int = Field(512, ge=1, le=8192)
    warmup_requests: int = Field(1, ge=0, le=5)
    weights: ScoringWeights = Field(default_factory=ScoringWeights)
    judge_model: str | None = Field(
        None, description="Optional distinct model to use for LLM judge evaluation"
    )


class ModelMetricSummary(BaseModel):
    model_name: str
    rank: int = 1
    final_score: float = 0.0
    quality_score: float = 0.0
    latency_score: float = 0.0
    cost_score: float = 0.0
    avg_latency_ms: float = 0.0
    avg_ttft_ms: float | None = None
    avg_tokens_per_second: float = 0.0
    total_tokens: int = 0
    total_cost: float | None = None
    success_rate: float = 1.0
    is_recommended: bool = False
    is_fastest: bool = False
    is_cheapest: bool = False
    is_highest_quality: bool = False
    recommendation_reasons: list[str] = Field(default_factory=list)


class BenchmarkSummary(BaseModel):
    rankings: list[ModelMetricSummary] = Field(default_factory=list)
    recommended_model: str | None = None
    fastest_model: str | None = None
    cheapest_model: str | None = None
    highest_quality_model: str | None = None
    weights_used: ScoringWeights = Field(default_factory=ScoringWeights)


class BenchmarkResultResponse(BaseModel):
    id: str
    model_name: str
    prompt_id: str
    prompt_text: str | None = None
    expected_output: str | None = None
    response: str | None = None
    latency_ms: float | None = None
    ttft_ms: float | None = None
    token_count: int | None = None
    tokens_per_second: float | None = None
    estimated_cost: float | None = None
    quality_score: float | None = None
    final_score: float | None = None
    error: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BenchmarkRunResponse(BaseModel):
    id: str
    dataset_id: str | None = None
    dataset_name: str | None = None
    status: str
    configuration: dict = Field(default_factory=dict)
    error_message: str | None = None
    summary: BenchmarkSummary | None = None
    created_at: datetime
    results: list[BenchmarkResultResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
