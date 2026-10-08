from datetime import datetime

from pydantic import BaseModel, Field


class InferenceRequest(BaseModel):
    model: str = Field(..., description="Target model name, e.g. llama3.2:1b")
    prompt: str = Field(..., min_length=1, max_length=100000, description="Input prompt")
    temperature: float = Field(0.2, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: int | None = Field(512, ge=1, le=8192, description="Maximum tokens to generate")
    stream: bool = Field(False, description="Whether to stream response")


class InferenceResponse(BaseModel):
    model: str
    response: str
    latency_ms: float = Field(..., description="Total wall-clock generation time in ms")
    ttft_ms: float | None = Field(
        None, description="Time to first token in ms (available when streaming)"
    )
    token_count: int = Field(..., description="Tokens generated")
    prompt_tokens: int = Field(0, description="Prompt tokens evaluated")
    tokens_per_second: float = Field(..., description="Generation throughput (tokens/sec)")
    estimated_cost: float | None = Field(
        None, description="Total estimated USD cost (or None if pricing not available)"
    )
    timestamp: datetime = Field(..., description="Completion timestamp")
