from unittest.mock import AsyncMock, patch

import pytest

from app.models.benchmark import BenchmarkRun
from app.schemas.benchmark import BenchmarkStartRequest, ScoringWeights
from app.services.benchmark import benchmark_service


@pytest.mark.asyncio
async def test_benchmark_execution_and_persistence(db_session):
    # Setup test run in DB
    run = BenchmarkRun(
        configuration={
            "models": ["llama3.2:1b", "qwen2.5:1.5b"],
            "temperature": 0.2,
            "max_tokens": 128,
            "warmup_requests": 1,
            "weights": {"quality_weight": 0.5, "latency_weight": 0.3, "cost_weight": 0.2},
        },
        status="PENDING",
    )
    db_session.add(run)
    db_session.commit()
    db_session.refresh(run)

    mock_gen_llama = {
        "model": "llama3.2:1b",
        "response": "Supervised learning uses labeled pairs.",
        "latency_ms": 200.0,
        "token_count": 30,
        "prompt_tokens": 15,
        "tokens_per_second": 40.0,
    }
    mock_gen_qwen = {
        "model": "qwen2.5:1.5b",
        "response": "Supervised learning needs labels to train.",
        "latency_ms": 150.0,
        "token_count": 28,
        "prompt_tokens": 15,
        "tokens_per_second": 45.0,
    }

    async def mock_generate(model, prompt, **kwargs):
        if "llama" in model:
            return mock_gen_llama
        return mock_gen_qwen

    with (
        patch("app.services.ollama.ollama_service.generate", side_effect=mock_generate),
        patch("app.services.ollama.ollama_service.is_model_installed", return_value=True),
    ):
        req = BenchmarkStartRequest(
            models=["llama3.2:1b", "qwen2.5:1.5b"],
            temperature=0.2,
            max_tokens=128,
            warmup_requests=1,
            weights=ScoringWeights(quality_weight=0.5, latency_weight=0.3, cost_weight=0.2),
        )

        await benchmark_service.execute_benchmark(run.id, req)

    # Check updated run
    db_session.expire_all()
    updated_run = db_session.query(BenchmarkRun).filter(BenchmarkRun.id == run.id).first()
    assert updated_run.status == "COMPLETED"
    assert updated_run.summary is not None
    assert len(updated_run.summary["rankings"]) == 2
    assert updated_run.summary["recommended_model"] is not None
    assert len(updated_run.results) > 0


def test_api_benchmark_routes(client):
    with patch(
        "app.services.ollama.ollama_service.check_health",
        new=AsyncMock(return_value={"available": True}),
    ):
        payload = {
            "models": ["llama3.2:1b"],
            "temperature": 0.2,
            "max_tokens": 64,
            "warmup_requests": 0,
        }
        res = client.post("/api/v1/benchmarks", json=payload)
        assert res.status_code == 201
        run_data = res.json()
        assert "id" in run_data
        run_id = run_data["id"]

        # List runs
        list_res = client.get("/api/v1/benchmarks")
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # Get run details
        get_res = client.get(f"/api/v1/benchmarks/{run_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == run_id
