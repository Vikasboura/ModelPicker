from collections.abc import AsyncGenerator
from typing import Any

from app.services.model_registry import model_registry_service
from app.services.ollama import ollama_service
from app.services.providers.base import (
    BaseModelProvider,
    InferenceOptions,
    InferenceOutput,
    ProviderModel,
)


class OllamaProvider(BaseModelProvider):
    """Local Ollama-backed inference provider."""

    @property
    def provider_name(self) -> str:
        return "Ollama (Local)"

    @property
    def provider_type(self) -> str:
        return "ollama"

    async def is_available(self) -> bool:
        return await ollama_service.is_healthy()

    async def list_models(self) -> list[ProviderModel]:
        raw_models = await ollama_service.list_local_models()
        result: list[ProviderModel] = []
        for m in raw_models:
            pricing = model_registry_service.get_pricing(m.id)
            result.append(
                ProviderModel(
                    id=m.id,
                    name=m.name,
                    family=m.family or "unknown",
                    parameter_size=m.parameter_size or "unknown",
                    context_length=m.context_length or 4096,
                    provider_type="ollama",
                    description=f"Local open-weight model ({m.parameter_size})",
                    input_price_per_million=pricing.input_price_per_million,
                    output_price_per_million=pricing.output_price_per_million,
                )
            )
        return result

    async def generate(
        self, model: str, prompt: str, options: InferenceOptions | None = None
    ) -> InferenceOutput:
        opts = options or InferenceOptions()
        resp = await ollama_service.generate(
            model=model,
            prompt=prompt,
            temperature=opts.temperature,
            max_tokens=opts.max_tokens,
            system_prompt=opts.system_prompt,
        )

        cost = model_registry_service.calculate_cost(
            model_id=model,
            prompt_tokens=resp.prompt_tokens,
            completion_tokens=resp.completion_tokens,
        )

        return InferenceOutput(
            model=resp.model,
            provider=self.provider_name,
            response=resp.response,
            latency_ms=resp.latency_ms,
            time_to_first_token_ms=resp.time_to_first_token_ms or 0.0,
            input_tokens=resp.prompt_tokens,
            output_tokens=resp.completion_tokens,
            tokens_per_second=resp.tokens_per_second,
            estimated_cost_usd=cost,
            finish_reason="stop",
        )

    async def stream(
        self, model: str, prompt: str, options: InferenceOptions | None = None
    ) -> AsyncGenerator[dict[str, Any], None]:
        opts = options or InferenceOptions()
        async for chunk in ollama_service.generate_stream(
            model=model,
            prompt=prompt,
            temperature=opts.temperature,
            max_tokens=opts.max_tokens,
            system_prompt=opts.system_prompt,
        ):
            yield chunk
