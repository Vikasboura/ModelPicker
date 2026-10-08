import json
import logging
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from app.schemas.inference import InferenceRequest, InferenceResponse
from app.services.model_registry import model_registry_service
from app.services.ollama import OllamaService, ollama_service
from app.services.providers import get_model_provider
from app.services.providers.base import InferenceOptions
from app.services.providers.public_provider import DEFAULT_FREE_MODELS

logger = logging.getLogger(__name__)


class InferenceService:
    def __init__(
        self,
        ollama_client: OllamaService | None = None,
    ):
        self.ollama = ollama_client or ollama_service

    async def execute_inference(self, req: InferenceRequest) -> InferenceResponse:
        """Runs non-streaming inference, measuring wall latency and calculating cost."""
        is_public = req.provider == "public_free" or req.model in [
            m.id for m in DEFAULT_FREE_MODELS
        ]
        if is_public:
            logger.info("Executing public free inference on model '%s'", req.model)
            provider = get_model_provider("public_free")
            output = await provider.generate(
                model=req.model,
                prompt=req.prompt,
                options=InferenceOptions(
                    temperature=req.temperature,
                    max_tokens=req.max_tokens or 512,
                ),
            )
            return InferenceResponse(
                model=output.model,
                response=output.response,
                latency_ms=output.latency_ms,
                ttft_ms=output.time_to_first_token_ms,
                token_count=output.output_tokens,
                prompt_tokens=output.input_tokens,
                tokens_per_second=output.tokens_per_second,
                estimated_cost=output.estimated_cost_usd,
                timestamp=datetime.now(timezone.utc),
            )

        logger.info("Executing Ollama inference on model '%s'", req.model)
        result = await self.ollama.generate(
            model=req.model,
            prompt=req.prompt,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
        )

        cost = model_registry_service.calculate_cost(
            model_name=req.model,
            prompt_tokens=result.get("prompt_tokens", 0),
            completion_tokens=result.get("token_count", 0),
        )

        return InferenceResponse(
            model=req.model,
            response=result["response"],
            latency_ms=result["latency_ms"],
            ttft_ms=result.get("ttft_ms"),
            token_count=result["token_count"],
            prompt_tokens=result.get("prompt_tokens", 0),
            tokens_per_second=result["tokens_per_second"],
            estimated_cost=cost,
            timestamp=datetime.now(timezone.utc),
        )

    async def execute_streaming_inference(self, req: InferenceRequest) -> AsyncGenerator[str, None]:
        """
        Runs streaming inference yielding Server-Sent Events formatted data.
        """
        is_public = req.provider == "public_free" or req.model in [
            m.id for m in DEFAULT_FREE_MODELS
        ]
        if is_public:
            logger.info("Starting public free streaming inference on model '%s'", req.model)
            provider = get_model_provider("public_free")
            async for chunk in provider.stream(
                model=req.model,
                prompt=req.prompt,
                options=InferenceOptions(
                    temperature=req.temperature,
                    max_tokens=req.max_tokens or 512,
                ),
            ):
                if not chunk.get("done"):
                    payload = {
                        "type": "token",
                        "chunk": chunk.get("token", ""),
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
                else:
                    final_payload = {
                        "type": "done",
                        "model": req.model,
                        "response": chunk.get("response", ""),
                        "latency_ms": chunk.get("latency_ms", 0),
                        "ttft_ms": chunk.get("time_to_first_token_ms", 0),
                        "token_count": chunk.get("tokens_generated", 0),
                        "prompt_tokens": len(req.prompt) // 4,
                        "tokens_per_second": chunk.get("tokens_per_second", 0),
                        "estimated_cost": 0.0,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    yield f"data: {json.dumps(final_payload)}\n\n"
            return

        logger.info("Starting streaming inference on model '%s'", req.model)
        async for chunk in self.ollama.generate_stream(
            model=req.model,
            prompt=req.prompt,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
        ):
            if chunk["type"] == "token":
                payload = {
                    "type": "token",
                    "chunk": chunk["chunk"],
                }
                yield f"data: {json.dumps(payload)}\n\n"
            elif chunk["type"] == "done":
                cost = model_registry_service.calculate_cost(
                    model_name=req.model,
                    prompt_tokens=chunk.get("prompt_tokens", 0),
                    completion_tokens=chunk.get("token_count", 0),
                )
                final_payload = {
                    "type": "done",
                    "model": req.model,
                    "response": chunk["response"],
                    "latency_ms": chunk["latency_ms"],
                    "ttft_ms": chunk["ttft_ms"],
                    "token_count": chunk["token_count"],
                    "prompt_tokens": chunk.get("prompt_tokens", 0),
                    "tokens_per_second": chunk["tokens_per_second"],
                    "estimated_cost": cost,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                yield f"data: {json.dumps(final_payload)}\n\n"


inference_service = InferenceService()
