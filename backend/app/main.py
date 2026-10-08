import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.api.routes import health
from app.core.config import settings
from app.core.database import init_db
from app.services.model_registry import model_registry_service
from app.services.ollama import OllamaServiceError

# Configure root logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("modelpicker")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing ModelPicker backend services...")
    init_db()
    model_registry_service.reload_pricing()
    logger.info("Database initialized and pricing loaded.")
    yield
    logger.info("Shutting down ModelPicker backend.")


app = FastAPI(
    title="ModelPicker API",
    description=(
        "Production-quality LLM inference and evaluation platform helping developers "
        "benchmark open-weight LLMs on response quality, latency, cost, and weighted overall score."
    ),
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
allowed_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if not allowed_origins or "*" in allowed_origins:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(OllamaServiceError)
async def ollama_service_exception_handler(request: Request, exc: OllamaServiceError):
    logger.error("Ollama service error: %s (code: %s)", exc.message, exc.code)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": f"HTTP_{exc.status_code}", "message": str(exc.detail)}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_messages = [f"{err['loc'][-1]}: {err['msg']}" for err in exc.errors()]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "; ".join(error_messages),
                "details": exc.errors(),
            }
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Please check server logs.",
            }
        },
    )


# Mount API Routers
app.include_router(api_router)
app.include_router(health.router, prefix="/api", tags=["Health"])


@app.get("/", tags=["Root"])
def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "api_v1": "/api/v1",
    }
