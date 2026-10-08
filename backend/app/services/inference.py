import json
import logging
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from app.schemas.inference import InferenceRequest, InferenceResponse
from app.services.model_registry import model_registry_service
from app.services.ollama import OllamaService, ollama_service

logger = logging.getLogger(__name__)


class InferenceService:
    def __init__(
        self,
        ollama_client: OllamaService | None = None,
    ):
        self.ollama = ollama_client or ollama_service

    async def execute_inference(self, req: InferenceRequest) -> InferenceResponse:
        """Runs non-streaming inference, measuring wall latency and calculating cost."""
        logger.info("Executing inference on model '%s'", req.model)
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
