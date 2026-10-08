from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DatasetItem(BaseModel):
    id: str = Field(..., description="Unique prompt id in dataset")
    prompt: str = Field(..., min_length=1, description="Prompt text")
    expected: str | None = Field(None, description="Expected or reference response")
    category: str | None = Field(None, description="Optional domain or task category")


class DatasetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)
    items: list[DatasetItem] = Field(..., min_length=1)


class DatasetResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    row_count: int
    items: list[DatasetItem] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DatasetValidationResult(BaseModel):
    is_valid: bool
    total_rows: int
    valid_rows: int
    errors: list[str] = Field(default_factory=list)
    preview: list[DatasetItem] = Field(default_factory=list)
