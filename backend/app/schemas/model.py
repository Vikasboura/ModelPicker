from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ModelMetadata(BaseModel):
    family: str | None = None
    description: str | None = None
    architecture: str | None = None
    license: str | None = None


class ModelBase(BaseModel):
    id: str = Field(..., description="Unique model identifier, e.g. llama3.2:1b")
    name: str = Field(..., description="Display name of the model")
    provider: str = Field("Unknown", description="Model creator or provider")
    parameter_count: str | None = Field(None, description="e.g. 1.24B")
    context_length: int | None = Field(None, description="Maximum context window")
    input_price: float | None = Field(
        None, description="Price per 1M input tokens in USD. None if unavailable"
    )
    output_price: float | None = Field(
        None, description="Price per 1M output tokens in USD. None if unavailable"
    )
    enabled: bool = Field(True, description="Whether the model is enabled for selection")
    metadata: dict | None = Field(default_factory=dict)


class ModelResponse(ModelBase):
    installed: bool = Field(False, description="Whether the model is downloaded in Ollama")
    size_bytes: int | None = Field(None, description="Model file size in bytes if installed")
    modified_at: str | None = Field(None, description="Last modified timestamp in Ollama")
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ModelPullRequest(BaseModel):
    name: str = Field(..., description="Model name to pull, e.g. llama3.2:1b")


class ModelPullResponse(BaseModel):
    status: str
    message: str
    model: str
