from fastapi import APIRouter

from app.api.routes import benchmarks, datasets, evaluations, health, inference, models

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(models.router)
api_router.include_router(inference.router)
api_router.include_router(evaluations.router)
api_router.include_router(benchmarks.router)
api_router.include_router(datasets.router)
