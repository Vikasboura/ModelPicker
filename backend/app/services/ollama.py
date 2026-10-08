import json
import logging
import time
from collections.abc import AsyncGenerator
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class OllamaServiceError(Exception):
    def __init__(self, message: str, code: str = "OLLAMA_ERROR", status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class OllamaUnavailableError(OllamaServiceError):
    def __init__(
        self, message: str = "Ollama is not reachable. Ensure the Ollama service is running."
    ):
        super().__init__(
            message=message,
            code="OLLAMA_UNAVAILABLE",
            status_code=503,
        )


class ModelNotFoundError(OllamaServiceError):
    def __init__(self, model_name: str):
        super().__init__(
            message=(
                f"Model '{model_name}' is not installed in Ollama. "
                f"Please pull it first using 'ollama pull {model_name}' or via the Models page."
            ),
            code="MODEL_NOT_INSTALLED",
            status_code=404,
        )


class OllamaTimeoutError(OllamaServiceError):
    def __init__(self, timeout_sec: float):
        super().__init__(
            message=f"Request to Ollama timed out after {timeout_sec:.1f} seconds.",
            code="OLLAMA_TIMEOUT",
            status_code=504,
        )


class OllamaService:
    def __init__(self, base_url: str | None = None, timeout: float | None = None):
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.timeout = timeout or settings.ollama_timeout_seconds

    async def get_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.timeout, connect=5.0),
        )

    async def check_health(self) -> dict[str, Any]:
        """Checks if Ollama is accessible and returns server details."""
        try:
            async with httpx.AsyncClient(
                base_url=self.base_url, timeout=httpx.Timeout(3.0, connect=2.0)
            ) as client:
                resp = await client.get("/api/version")
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "available": True,
                        "version": data.get("version", "unknown"),
                        "base_url": self.base_url,
                    }
                return {
                    "available": False,
                    "error": f"Ollama returned HTTP {resp.status_code}",
                    "base_url": self.base_url,
                }
        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            logger.debug("Ollama health check connection failed: %s", e)
            return {
                "available": False,
                "error": "Connection refused or unreachable",
                "base_url": self.base_url,
            }
        except Exception as e:
            logger.debug("Ollama health check exception: %s", e)
            return {
                "available": False,
                "error": str(e),
                "base_url": self.base_url,
            }

    async def list_installed_models(self) -> list[dict[str, Any]]:
        """Returns list of models installed in Ollama."""
        try:
            async with httpx.AsyncClient(
                base_url=self.base_url, timeout=httpx.Timeout(5.0, connect=3.0)
            ) as client:
                resp = await client.get("/api/tags")
                if resp.status_code != 200:
                    raise OllamaServiceError(
                        f"Failed to list models: HTTP {resp.status_code} - {resp.text}"
                    )
                data = resp.json()
                models = data.get("models", [])
                return [
                    {
                        "name": m.get("name"),
                        "model": m.get("model", m.get("name")),
                        "size": m.get("size", 0),
                        "modified_at": m.get("modified_at"),
                        "digest": m.get("digest"),
                    }
                    for m in models
                ]
        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            raise OllamaUnavailableError() from e
        except OllamaServiceError:
            raise
        except Exception as e:
            raise OllamaServiceError(f"Error communicating with Ollama: {e!s}") from e

    async def is_model_installed(self, model_name: str) -> bool:
        """Checks if a specific model tag or name is present in Ollama."""
        try:
            models = await self.list_installed_models()
            clean_target = model_name.strip()
            for m in models:
                installed_name = m.get("name", "")
                if installed_name == clean_target:
                    return True
                # e.g. "llama3.2:1b" vs "llama3.2:1b-instruct-q4_K_M"
                if installed_name.startswith(clean_target + ":") or clean_target.startswith(
                    installed_name + ":"
                ):
                    return True
                # Match "llama3.2" with "llama3.2:latest"
                if (":" not in clean_target and installed_name.split(":")[0] == clean_target) or (
                    ":" not in installed_name and clean_target.split(":")[0] == installed_name
                ):
                    return True
            return False
        except OllamaUnavailableError:
            return False

    async def pull_model(self, model_name: str) -> dict[str, Any]:
        """Pulls a model asynchronously via Ollama's pull endpoint."""
        try:
            async with httpx.AsyncClient(
                base_url=self.base_url, timeout=httpx.Timeout(600.0, connect=5.0)
            ) as client:
                resp = await client.post(
                    "/api/pull",
                    json={"name": model_name, "stream": False},
                )
                if resp.status_code != 200:
                    raise OllamaServiceError(
                        f"Ollama pull failed: {resp.status_code} - {resp.text}",
                        code="MODEL_PULL_FAILED",
                    )
                return resp.json()
        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            raise OllamaUnavailableError() from e
        except Exception as e:
            raise OllamaServiceError(f"Failed to pull model '{model_name}': {e!s}") from e

    async def generate(
        self,
        model: str,
        prompt: str,
        temperature: float = 0.2,
        max_tokens: int | None = 512,
    ) -> dict[str, Any]:
        """
        Executes non-streaming generation with actual wall-clock timing and token counts.
        """
        installed = await self.is_model_installed(model)
        if not installed:
            # Check if ollama is reachable first
            health = await self.check_health()
            if not health.get("available"):
                raise OllamaUnavailableError()
            raise ModelNotFoundError(model)

        options: dict[str, Any] = {
            "temperature": temperature,
        }
        if max_tokens:
            options["num_predict"] = max_tokens

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": options,
        }

        start_time = time.perf_counter()
        try:
            async with httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout, connect=5.0),
            ) as client:
                resp = await client.post("/api/generate", json=payload)
                end_time = time.perf_counter()

                if resp.status_code != 200:
                    raise OllamaServiceError(
                        f"Inference failed with status {resp.status_code}: {resp.text}",
                        code="INFERENCE_FAILED",
                        status_code=resp.status_code,
                    )

                data = resp.json()
                total_latency_ms = (end_time - start_time) * 1000.0

                # Extract token metrics from Ollama response or calculate
                eval_count = data.get("eval_count", 0)
                prompt_eval_count = data.get("prompt_eval_count", 0)
                response_text = data.get("response", "")

                # Fallback token estimate if Ollama returns 0
                if eval_count == 0 and response_text:
                    eval_count = max(1, len(response_text.split()))

                tokens_per_sec = (
                    (eval_count / (total_latency_ms / 1000.0)) if total_latency_ms > 0 else 0.0
                )

                return {
                    "model": model,
                    "response": response_text,
                    "latency_ms": round(total_latency_ms, 2),
                    "ttft_ms": None,  # Not directly measured on non-streaming
                    "token_count": eval_count,
                    "prompt_tokens": prompt_eval_count,
                    "tokens_per_second": round(tokens_per_sec, 2),
                }

        except httpx.TimeoutException as e:
            raise OllamaTimeoutError(self.timeout) from e
        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            raise OllamaUnavailableError() from e
        except OllamaServiceError:
            raise
        except Exception as e:
            raise OllamaServiceError(f"Unexpected generation error: {e!s}") from e

    async def generate_stream(
        self,
        model: str,
        prompt: str,
        temperature: float = 0.2,
        max_tokens: int | None = 512,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Executes streaming generation yielding token chunks, measuring TTFT and final statistics.
        """
        installed = await self.is_model_installed(model)
        if not installed:
            health = await self.check_health()
            if not health.get("available"):
                raise OllamaUnavailableError()
            raise ModelNotFoundError(model)

        options: dict[str, Any] = {"temperature": temperature}
        if max_tokens:
            options["num_predict"] = max_tokens

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": True,
            "options": options,
        }

        start_time = time.perf_counter()
        first_token_time: float | None = None
        accumulated_text: list[str] = []

        try:
            async with httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout, connect=5.0),
            ) as client:
                async with client.stream("POST", "/api/generate", json=payload) as stream_resp:
                    if stream_resp.status_code != 200:
                        body = await stream_resp.aread()
                        raise OllamaServiceError(
                            f"Streaming error HTTP {stream_resp.status_code}: {body.decode()}",
                            code="INFERENCE_FAILED",
                            status_code=stream_resp.status_code,
                        )

                    async for line in stream_resp.aiter_lines():
                        if not line.strip():
                            continue

                        chunk_data = json.loads(line)
                        chunk_text = chunk_data.get("response", "")
                        done = chunk_data.get("done", False)

                        now = time.perf_counter()
                        if first_token_time is None and chunk_text:
                            first_token_time = now

                        accumulated_text.append(chunk_text)

                        if not done:
                            yield {
                                "type": "token",
                                "chunk": chunk_text,
                                "done": False,
                            }
                        else:
                            end_time = now
                            total_latency_ms = (end_time - start_time) * 1000.0
                            ttft_ms = (
                                (first_token_time - start_time) * 1000.0
                                if first_token_time
                                else None
                            )

                            eval_count = chunk_data.get("eval_count", 0)
                            prompt_eval_count = chunk_data.get("prompt_eval_count", 0)
                            full_text = "".join(accumulated_text)

                            if eval_count == 0 and full_text:
                                eval_count = max(1, len(full_text.split()))

                            tokens_per_sec = (
                                (eval_count / (total_latency_ms / 1000.0))
                                if total_latency_ms > 0
                                else 0.0
                            )

                            yield {
                                "type": "done",
                                "done": True,
                                "response": full_text,
                                "latency_ms": round(total_latency_ms, 2),
                                "ttft_ms": round(ttft_ms, 2) if ttft_ms else None,
                                "token_count": eval_count,
                                "prompt_tokens": prompt_eval_count,
                                "tokens_per_second": round(tokens_per_sec, 2),
                            }
        except httpx.TimeoutException as e:
            raise OllamaTimeoutError(self.timeout) from e
        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            raise OllamaUnavailableError() from e
        except OllamaServiceError:
            raise
        except Exception as e:
            raise OllamaServiceError(f"Unexpected streaming error: {e!s}") from e


ollama_service = OllamaService()
