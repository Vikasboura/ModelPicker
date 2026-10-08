from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.services.ollama import ollama_service

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=dict[str, Any], summary="System Health & Status")
async def health_check(db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Checks status of backend, database connectivity, and Ollama serving engine.
    """
    # 1. Database check
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # 2. Ollama check
    ollama_info = await ollama_service.check_health()

    return {
        "status": "healthy" if db_ok else "degraded",
        "app": settings.app_name,
        "version": settings.app_version,
        "database": {"connected": db_ok, "engine": "sqlite"},
        "ollama": ollama_info,
    }
