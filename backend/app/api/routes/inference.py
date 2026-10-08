from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.schemas.inference import InferenceRequest, InferenceResponse
from app.services.inference import inference_service
from app.services.ollama import ModelNotFoundError, OllamaServiceError, OllamaUnavailableError

router = APIRouter(prefix="/inference", tags=["Inference"])


@router.post("", response_model=InferenceResponse, summary="Execute non-streaming inference")
async def run_inference(req: InferenceRequest) -> InferenceResponse:
    """
    Sends a prompt to the specified model, measuring latency, token throughput, and estimated cost.
    """
    try:
        return await inference_service.execute_inference(req)
    except OllamaUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": e.code, "message": e.message},
        ) from e
    except ModelNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": e.code, "message": e.message},
        ) from e
    except OllamaServiceError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": e.code, "message": e.message},
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": str(e)},
        ) from e


@router.post("/stream", summary="Execute streaming inference via Server-Sent Events (SSE)")
async def run_streaming_inference(req: InferenceRequest):
    """
    Streams model response chunks via Server-Sent Events (SSE), calculating TTFT and final statistics.
    """
    try:
        # Validate model is ready before starting stream
        stream_gen = inference_service.execute_streaming_inference(req)
        return StreamingResponse(
            stream_gen,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except OllamaUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": e.code, "message": e.message},
        ) from e
    except ModelNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": e.code, "message": e.message},
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "STREAMING_ERROR", "message": str(e)},
        ) from e
