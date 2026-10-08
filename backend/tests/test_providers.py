from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.schemas.inference import InferenceRequest
from app.services.inference import InferenceService
from app.services.providers import get_model_provider
from app.services.providers.base import InferenceOptions
from app.services.providers.ollama_provider import OllamaProvider
from app.services.providers.public_provider import PublicFreeProvider


@pytest.mark.asyncio
async def test_provider_factory_selection():
    ollama_p = get_model_provider("ollama")
    assert isinstance(ollama_p, OllamaProvider)
    assert ollama_p.provider_type == "ollama"

    public_p = get_model_provider("public_free")
    assert isinstance(public_p, PublicFreeProvider)
    assert public_p.provider_type == "public_free"


@pytest.mark.asyncio
async def test_public_provider_list_models():
    provider = PublicFreeProvider(api_key="test-key")
    models = await provider.list_models()
    assert len(models) >= 3
    model_ids = [m.id for m in models]
    assert "llama-3.1-8b-instant" in model_ids
    assert "llama-3.3-70b-versatile" in model_ids


@pytest.mark.asyncio
async def test_public_provider_missing_key():
    provider = PublicFreeProvider(api_key=None)
    with pytest.raises(ValueError, match="API key is not configured"):
        await provider.generate(model="llama-3.1-8b-instant", prompt="Hello")


@pytest.mark.asyncio
async def test_public_provider_generate_success():
    provider = PublicFreeProvider(api_key="gsk-test-key")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {"content": "Test response from Groq"},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 20,
        },
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        result = await provider.generate(
            model="llama-3.1-8b-instant",
            prompt="Hello world",
            options=InferenceOptions(temperature=0.5, max_tokens=100),
        )

        assert result.model == "llama-3.1-8b-instant"
        assert result.response == "Test response from Groq"
        assert result.input_tokens == 10
        assert result.output_tokens == 20
        assert result.latency_ms > 0
        assert result.finish_reason == "stop"


@pytest.mark.asyncio
async def test_public_provider_rate_limit_error():
    provider = PublicFreeProvider(api_key="gsk-test-key")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 429
    mock_response.text = "Rate limit exceeded"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        with pytest.raises(RuntimeError, match="rate limit"):
            await provider.generate(model="llama-3.1-8b-instant", prompt="Hello")


@pytest.mark.asyncio
async def test_inference_service_routing():
    svc = InferenceService()

    # Public free routing
    with patch(
        "app.services.providers.public_provider.PublicFreeProvider.generate",
        new_callable=AsyncMock,
    ) as mock_gen:
        mock_output = MagicMock()
        mock_output.model = "llama-3.1-8b-instant"
        mock_output.response = "Fast response"
        mock_output.latency_ms = 150.0
        mock_output.time_to_first_token_ms = 40.0
        mock_output.output_tokens = 25
        mock_output.input_tokens = 8
        mock_output.tokens_per_second = 166.7
        mock_output.estimated_cost_usd = 0.000002
        mock_gen.return_value = mock_output

        req = InferenceRequest(
            model="llama-3.1-8b-instant",
            prompt="Test prompt",
            provider="public_free",
        )
        res = await svc.execute_inference(req)
        assert res.model == "llama-3.1-8b-instant"
        assert res.response == "Fast response"
        assert res.token_count == 25
