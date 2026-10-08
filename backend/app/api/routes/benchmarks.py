import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.benchmark import BenchmarkRun
from app.schemas.benchmark import (
    BenchmarkRunResponse,
    BenchmarkStartRequest,
)
from app.services.benchmark import benchmark_service
from app.services.ollama import ollama_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/benchmarks", tags=["Benchmarks"])


@router.post(
    "",
    response_model=BenchmarkRunResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start new benchmark run",
)
async def start_benchmark(
    req: BenchmarkStartRequest,
    db: Session = Depends(get_db),
) -> BenchmarkRun:
    """
    Creates a new benchmark run and kicks off the execution workflow asynchronously.
    """
    health = await ollama_service.check_health()
    if not health.get("available"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "OLLAMA_UNAVAILABLE",
                "message": "Ollama service is currently unreachable. Start Ollama to run benchmarks.",
            },
        )

    # Create run record in database
    run = BenchmarkRun(
        dataset_id=req.dataset_id,
        configuration={
            "models": req.models,
            "temperature": req.temperature,
            "max_tokens": req.max_tokens,
            "warmup_requests": req.warmup_requests,
            "weights": req.weights.model_dump(),
            "judge_model": req.judge_model,
        },
        status="PENDING",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Spawn background task to execute benchmark asynchronously
    asyncio.create_task(benchmark_service.execute_benchmark(run.id, req))

    return run


@router.get("", response_model=list[BenchmarkRunResponse], summary="List benchmark runs")
def list_benchmark_runs(
    db: Session = Depends(get_db),
    limit: int = 50,
) -> list[BenchmarkRun]:
    """
    Lists historical benchmark runs ordered by creation date descending.
    """
    runs = db.query(BenchmarkRun).order_by(BenchmarkRun.created_at.desc()).limit(limit).all()
    return runs


@router.get("/{run_id}", response_model=BenchmarkRunResponse, summary="Get benchmark run details")
def get_benchmark_run(
    run_id: str,
    db: Session = Depends(get_db),
) -> BenchmarkRun:
    """
    Retrieves full details of a benchmark run, including model rankings and prompt-level results.
    """
    run = (
        db.query(BenchmarkRun)
        .options(joinedload(BenchmarkRun.results))
        .filter(BenchmarkRun.id == run_id)
        .first()
    )
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "BENCHMARK_NOT_FOUND", "message": f"Run '{run_id}' does not exist."},
        )
    return run


@router.delete("/{run_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete benchmark run")
def delete_benchmark_run(
    run_id: str,
    db: Session = Depends(get_db),
) -> None:
    """
    Deletes a benchmark run and all associated results.
    """
    run = db.query(BenchmarkRun).filter(BenchmarkRun.id == run_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "BENCHMARK_NOT_FOUND", "message": f"Run '{run_id}' does not exist."},
        )
    db.delete(run)
    db.commit()
