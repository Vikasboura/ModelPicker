import os
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ModelPicker"
    app_version: str = "1.0.0"
    app_env: str = "development"
    log_level: str = "INFO"
    cors_origins: str = Field(
        default="*",
        validation_alias="CORS_ORIGINS",
    )

    # LLM Serving
    ollama_base_url: str = Field(
        default="http://localhost:11434",
        validation_alias="OLLAMA_BASE_URL",
    )
    ollama_timeout_seconds: float = 120.0

    # Database
    database_url: str = Field(
        default="sqlite:///./data/modelpicker.db",
        validation_alias="DATABASE_URL",
    )

    # File Paths
    pricing_file_path: str = Field(
        default="./data/pricing.yaml",
        validation_alias="PRICING_FILE_PATH",
    )
    default_eval_file_path: str = Field(
        default="./data/eval.json",
        validation_alias="DEFAULT_EVAL_FILE_PATH",
    )

    # Benchmark & Concurrency
    max_concurrent_requests: int = Field(
        default=2,
        ge=1,
        le=16,
        validation_alias="MAX_CONCURRENT_REQUESTS",
    )
    warmup_requests: int = Field(
        default=1,
        ge=0,
        le=5,
        validation_alias="WARMUP_REQUESTS",
    )

    # Scoring & Weights
    quality_weight: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        validation_alias="QUALITY_WEIGHT",
    )
    latency_weight: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        validation_alias="LATENCY_WEIGHT",
    )
    cost_weight: float = Field(
        default=0.2,
        ge=0.0,
        le=1.0,
        validation_alias="COST_WEIGHT",
    )

    # Judge model (must be distinct from benchmarked models unless explicitly allowed)
    judge_model: str | None = Field(
        default=None,
        validation_alias="JUDGE_MODEL",
    )

    @field_validator("database_url")
    @classmethod
    def ensure_database_dir(cls, v: str) -> str:
        if v.startswith("sqlite:///") and not v.startswith("sqlite:///:memory:"):
            db_path = v.replace("sqlite:///", "")
            parent_dir = Path(db_path).parent
            if parent_dir and not parent_dir.exists():
                os.makedirs(parent_dir, exist_ok=True)
        return v


settings = Settings()
