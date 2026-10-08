import asyncio
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.schemas.model import (
    ModelPullRequest,
    ModelPullResponse,
    ModelResponse,
)
from app.services.model_registry import model_registry_service
from app.services.ollama import OllamaUnavailableError, ollama_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/models", tags=["Models"])


@router.get("", response_model=list[ModelResponse], summary="List all models")
async def list_models() -> list[ModelResponse]:
    """
    Returns registered models enriched with live Ollama installation status and size.
    """
    registered = model_registry_service.get_registered_models()

    installed_map: dict[str, dict[str, Any]] = {}
    try:
        installed_list = await ollama_service.list_installed_models()
        for item in installed_list:
            name = item.get("name", "")
            installed_map[name] = item
            # Also map base name without tag
            if ":" in name:
                installed_map[name.split(":")[0]] = item
    except OllamaUnavailableError:
        logger.warning("Ollama unavailable while listing models")
    except Exception as e:
        logger.warning("Failed to query installed models: %s", e)

    results: list[ModelResponse] = []
    seen_ids = set()

    for m in registered:
        seen_ids.add(m.id)
        # Check installed status
        is_inst = m.id in installed_map or m.id.split(":")[0] in installed_map
        inst_info = installed_map.get(m.id) or installed_map.get(m.id.split(":")[0])

        results.append(
            ModelResponse(
                id=m.id,
                name=m.name,
                provider=m.provider,
                parameter_count=m.parameter_count,
                context_length=m.context_length,
                input_price=m.input_price,
                output_price=m.output_price,
                enabled=m.enabled,
                metadata=m.metadata,
                installed=is_inst,
                size_bytes=inst_info.get("size") if inst_info else None,
                modified_at=inst_info.get("modified_at") if inst_info else None,
            )
        )

    # Also include any models installed in Ollama that are not in pricing.yaml
    for inst_name, inst_info in installed_map.items():
        if inst_name not in seen_ids and ":" in inst_name:
            seen_ids.add(inst_name)
            results.append(
                ModelResponse(
                    id=inst_name,
                    name=inst_name,
                    provider="Local / Ollama",
                    parameter_count=None,
                    context_length=None,
                    input_price=None,  # Price unavailable
                    output_price=None,
                    enabled=True,
                    metadata={"source": "ollama_local"},
                    installed=True,
                    size_bytes=inst_info.get("size"),
                    modified_at=inst_info.get("modified_at"),
                )
            )

    return results


@router.get("/{model_id:path}", response_model=ModelResponse, summary="Get model details")
async def get_model_details(model_id: str) -> ModelResponse:
    """
    Retrieves details for a specific model including pricing and installation state.
    """
    m = model_registry_service.get_model(model_id)

    is_installed = False
    size_bytes = None
    modified_at = None

    try:
        is_installed = await ollama_service.is_model_installed(model_id)
        if is_installed:
            installed_list = await ollama_service.list_installed_models()
            for item in installed_list:
                if item.get("name") == model_id:
                    size_bytes = item.get("size")
                    modified_at = item.get("modified_at")
                    break
    except Exception:
        pass

    if not m:
        if is_installed:
            return ModelResponse(
                id=model_id,
                name=model_id,
                provider="Local / Ollama",
                installed=True,
                size_bytes=size_bytes,
                modified_at=modified_at,
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_id}' not found in registry or local installation.",
        )

    return ModelResponse(
        id=m.id,
        name=m.name,
        provider=m.provider,
        parameter_count=m.parameter_count,
        context_length=m.context_length,
        input_price=m.input_price,
        output_price=m.output_price,
        enabled=m.enabled,
        metadata=m.metadata,
        installed=is_installed,
        size_bytes=size_bytes,
        modified_at=modified_at,
    )


@router.post("/pull", response_model=ModelPullResponse, summary="Pull model into Ollama")
async def pull_model(req: ModelPullRequest) -> ModelPullResponse:
    """
    Triggers an asynchronous pull for a model in Ollama.
    """
    health = await ollama_service.check_health()
    if not health.get("available"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "OLLAMA_UNAVAILABLE",
                "message": "Ollama service is unreachable. Ensure the Ollama container is running.",
            },
        )

    # Initiate pull asynchronously
    asyncio.create_task(ollama_service.pull_model(req.name))

    return ModelPullResponse(
        status="initiated",
        message=f"Pull initiated for '{req.name}'. This may take a few minutes depending on network.",
        model=req.name,
    )
