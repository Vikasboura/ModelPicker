from unittest.mock import AsyncMock, patch

from app.services.model_registry import model_registry_service


def test_model_registry_pricing_loaded():
    model = model_registry_service.get_model("llama3.2:1b")
    assert model is not None
    assert model.provider == "Meta"
    assert model.input_price == 0.04
    assert model.output_price == 0.04


def test_cost_calculation_known_model():
    # 1000 input tokens at $0.04/M = $0.00004
    # 2000 output tokens at $0.04/M = $0.00008
    # Total = 0.00012
    cost = model_registry_service.calculate_cost("llama3.2:1b", 1000, 2000)
    assert cost is not None
    assert cost == 0.00012


def test_cost_calculation_unregistered_model():
    cost = model_registry_service.calculate_cost("unknown-model:99b", 1000, 2000)
    # Must be None, NEVER invent a price
    assert cost is None


def test_api_list_models(client):
    mock_installed = [
        {"name": "llama3.2:1b", "size": 1300000000, "modified_at": "2026-10-01T00:00:00Z"},
        {"name": "qwen2.5:1.5b", "size": 1600000000, "modified_at": "2026-10-01T00:00:00Z"},
    ]
    with patch(
        "app.services.ollama.ollama_service.list_installed_models",
        new=AsyncMock(return_value=mock_installed),
    ):
        response = client.get("/api/v1/models")
        assert response.status_code == 200
        models = response.json()
        assert len(models) >= 3

        llama = next((m for m in models if m["id"] == "llama3.2:1b"), None)
        assert llama is not None
        assert llama["installed"] is True
        assert llama["size_bytes"] == 1300000000
