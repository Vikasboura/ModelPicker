from unittest.mock import AsyncMock, patch


def test_health_endpoint_healthy(client):
    with patch(
        "app.services.ollama.ollama_service.check_health",
        new=AsyncMock(return_value={"available": True, "version": "0.3.12"}),
    ):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"]["connected"] is True
        assert data["ollama"]["available"] is True
        assert data["ollama"]["version"] == "0.3.12"


def test_health_endpoint_ollama_down(client):
    with patch(
        "app.services.ollama.ollama_service.check_health",
        new=AsyncMock(return_value={"available": False, "error": "Connection refused"}),
    ):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["ollama"]["available"] is False
