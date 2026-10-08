from unittest.mock import AsyncMock, patch

from app.services.ollama import ModelNotFoundError, OllamaUnavailableError


def test_inference_successful(client):
    mock_gen = {
        "model": "llama3.2:1b",
        "response": "RAG combines retrieval with generation.",
        "latency_ms": 150.2,
        "token_count": 25,
        "prompt_tokens": 10,
        "tokens_per_second": 35.5,
    }
    with patch("app.services.ollama.ollama_service.generate", new=AsyncMock(return_value=mock_gen)):
        payload = {
            "model": "llama3.2:1b",
            "prompt": "Explain RAG in simple terms",
            "temperature": 0.2,
            "max_tokens": 128,
            "stream": False,
        }
        response = client.post("/api/v1/inference", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["model"] == "llama3.2:1b"
        assert data["response"] == "RAG combines retrieval with generation."
        assert data["latency_ms"] == 150.2
        assert data["token_count"] == 25
        assert data["tokens_per_second"] == 35.5
        assert data["estimated_cost"] is not None


def test_inference_ollama_unavailable(client):
    with patch(
        "app.services.ollama.ollama_service.generate",
        side_effect=OllamaUnavailableError("Ollama is not reachable."),
    ):
        payload = {
            "model": "llama3.2:1b",
            "prompt": "Test prompt",
        }
        response = client.post("/api/v1/inference", json=payload)
        assert response.status_code == 503
        data = response.json()
        assert data["error"]["code"] == "OLLAMA_UNAVAILABLE"


def test_inference_model_not_installed(client):
    with patch(
        "app.services.ollama.ollama_service.generate",
        side_effect=ModelNotFoundError("gemma2:2b"),
    ):
        payload = {
            "model": "gemma2:2b",
            "prompt": "Test prompt",
        }
        response = client.post("/api/v1/inference", json=payload)
        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "MODEL_NOT_INSTALLED"
