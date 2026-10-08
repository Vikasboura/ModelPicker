from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from typing import Any

from pydantic import BaseModel


class ProviderModel(BaseModel):
    id: str
    name: str
    family: str
    parameter_size: str
    context_length: int
    provider_type: str = "ollama"  # "ollama" | "public_free"
    description: str | None = None
    input_price_per_million: float = 0.0
    output_price_per_million: float = 0.0


class InferenceOptions(BaseModel):
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 1024
    system_prompt: str | None = None


class InferenceOutput(BaseModel):
    model: str
    provider: str
    response: str
    latency_ms: float
    time_to_first_token_ms: float
    input_tokens: int
    output_tokens: int
    tokens_per_second: float
    estimated_cost_usd: float
    finish_reason: str = "stop"


class BaseModelProvider(ABC):
    """Abstract interface for LLM inference providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider identifier."""
        pass

    @property
    @abstractmethod
    def provider_type(self) -> str:
        """Provider type ('ollama' or 'public_free')."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if provider daemon/endpoint is reachable."""
        pass

    @abstractmethod
    async def list_models(self) -> list[ProviderModel]:
        """Enumerate available models from the provider."""
        pass

    @abstractmethod
    async def generate(
        self, model: str, prompt: str, options: InferenceOptions | None = None
    ) -> InferenceOutput:
        """Execute single non-streaming generation."""
        pass

    @abstractmethod
    async def stream(
        self, model: str, prompt: str, options: InferenceOptions | None = None
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Execute streaming generation yielding chunk dictionaries."""
        pass
