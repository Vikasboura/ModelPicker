import json
import logging
import time
from collections.abc import AsyncGenerator
from typing import Any

import httpx

from app.core.config import settings
from app.services.providers.base import (
    BaseModelProvider,
    InferenceOptions,
    InferenceOutput,
    ProviderModel,
)

logger = logging.getLogger(__name__)

# Standard public free open-weight models available on free tiers
DEFAULT_FREE_MODELS = [
    ProviderModel(
        id="llama-3.1-8b-instant",
        name="Llama 3.1 8B Instant",
        family="llama",
        parameter_size="8B",
        context_length=131072,
        provider_type="public_free",
        description="High-speed Meta open-weight model on Groq free tier",
        input_price_per_million=0.05,
        output_price_per_million=0.08,
    ),
    ProviderModel(
        id="llama-3.3-70b-versatile",
        name="Llama 3.3 70B Versatile",
        family="llama",
        parameter_size="70B",
        context_length=131072,
        provider_type="public_free",
        description="Flagship open-weight 70B reasoning model on free tier",
        input_price_per_million=0.59,
        output_price_per_million=0.79,
    ),
    ProviderModel(
        id="mixtral-8x7b-32768",
        name="Mixtral 8x7B",
        family="mistral",
        parameter_size="46.7B",
        context_length=32768,
        provider_type="public_free",
        description="Sparse Mixture-of-Experts architecture on free tier",
        input_price_per_million=0.24,
        output_price_per_million=0.24,
    ),
    ProviderModel(
        id="gemma2-9b-it",
        name="Gemma 2 9B IT",
        family="gemma",
        parameter_size="9B",
        context_length=8192,
        provider_type="public_free",
        description="Google open-weight instruction-tuned model on free tier",
        input_price_per_million=0.20,
        output_price_per_million=0.20,
    ),
]


class PublicFreeProvider(BaseModelProvider):
    """Public free-tier inference provider (Groq / OpenRouter / OpenAI-compatible)."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://api.groq.com/openai/v1",
        timeout_seconds: float = 30.0,
    ):
        self.api_key = api_key or getattr(settings, "public_provider_api_key", None)
        self.base_url = (base_url or "https://api.groq.com/openai/v1").rstrip("/")
        self.timeout_seconds = timeout_seconds

    @property
    def provider_name(self) -> str:
        return "Public Demo (Free Cloud)"

    @property
    def provider_type(self) -> str:
        return "public_free"

    async def is_available(self) -> bool:
        if not self.api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(
                    f"{self.base_url}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                return res.status_code == 200
        except Exception as e:
            logger.warning(f"Public provider health check failed: {e}")
            return False

    async def list_models(self) -> list[ProviderModel]:
        # Return curated free-tier open models
        return DEFAULT_FREE_MODELS

    async def generate(
        self, model: str, prompt: str, options: InferenceOptions | None = None
    ) -> InferenceOutput:
        if not self.api_key:
            raise ValueError(
                "Public provider API key is not configured. Set PUBLIC_PROVIDER_API_KEY."
            )

        opts = options or InferenceOptions()

        # Enforce free-tier limits: max prompt length 4000 chars, max tokens 1024
        truncated_prompt = prompt[:4000]
        max_tokens = min(opts.max_tokens, 1024)

        messages = []
        if opts.system_prompt:
            messages.append({"role": "system", "content": opts.system_prompt})
        messages.append({"role": "user", "content": truncated_prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": opts.temperature,
            "max_tokens": max_tokens,
            "top_p": opts.top_p,
            "stream": False,
        }

        start_time = time.perf_counter()
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        duration_ms = (time.perf_counter() - start_time) * 1000.0

        if resp.status_code == 429:
            raise RuntimeError(
                "Public inference rate limit reached. Please wait a moment and try again."
            )
        if resp.status_code != 200:
            raise RuntimeError(f"Public provider error ({resp.status_code}): {resp.text}")

        data = resp.json()
        choice = data["choices"][0]
        text = choice["message"]["content"]
        usage = data.get("usage", {})

        input_tokens = usage.get("prompt_tokens", len(prompt) // 4)
        output_tokens = usage.get("completion_tokens", len(text) // 4)
        finish_reason = choice.get("finish_reason", "stop")

        # Throughput
        secs = duration_ms / 1000.0
        tok_sec = round(output_tokens / secs, 1) if secs > 0 else 0.0

        # Estimated theoretical commercial cost based on pricing
        model_meta = next((m for m in DEFAULT_FREE_MODELS if m.id == model), None)
        in_p = model_meta.input_price_per_million if model_meta else 0.1
        out_p = model_meta.output_price_per_million if model_meta else 0.2
        cost_usd = round((input_tokens / 1_000_000 * in_p) + (output_tokens / 1_000_000 * out_p), 6)

        return InferenceOutput(
            model=model,
            provider=self.provider_name,
            response=text,
            latency_ms=round(duration_ms, 2),
            time_to_first_token_ms=round(duration_ms * 0.35, 2),  # Estimated TTFT in non-streaming
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            tokens_per_second=tok_sec,
            estimated_cost_usd=cost_usd,
            finish_reason=finish_reason,
        )

    async def stream(
        self, model: str, prompt: str, options: InferenceOptions | None = None
    ) -> AsyncGenerator[dict[str, Any], None]:
        if not self.api_key:
            yield {"error": "Public provider API key is not configured."}
            return

        opts = options or InferenceOptions()
        truncated_prompt = prompt[:4000]
        max_tokens = min(opts.max_tokens, 1024)

        messages = []
        if opts.system_prompt:
            messages.append({"role": "system", "content": opts.system_prompt})
        messages.append({"role": "user", "content": truncated_prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": opts.temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

        start_time = time.perf_counter()
        first_token_time = None
        full_text = ""
        total_tokens = 0

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            ) as response:
                if response.status_code == 429:
                    yield {"error": "Public inference rate limit reached. Please try again later."}
                    return
                if response.status_code != 200:
                    yield {"error": f"Public provider returned HTTP {response.status_code}"}
                    return

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    line_data = line[6:].strip()
                    if line_data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(line_data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        token = delta.get("content", "")
                        if token:
                            if first_token_time is None:
                                first_token_time = time.perf_counter()
                            full_text += token
                            total_tokens += 1
                            yield {
                                "token": token,
                                "done": False,
                            }
                    except Exception:
                        continue

        end_time = time.perf_counter()
        total_latency_ms = (end_time - start_time) * 1000.0
        ttft_ms = (first_token_time - start_time) * 1000.0 if first_token_time else total_latency_ms

        yield {
            "token": "",
            "done": True,
            "response": full_text,
            "latency_ms": round(total_latency_ms, 2),
            "time_to_first_token_ms": round(ttft_ms, 2),
            "tokens_generated": total_tokens,
            "tokens_per_second": round(total_tokens / (total_latency_ms / 1000.0), 1)
            if total_latency_ms > 0
            else 0.0,
        }
