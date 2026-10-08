import json
import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.dataset import DatasetEntity
from app.schemas.dataset import (
    DatasetCreate,
    DatasetItem,
    DatasetResponse,
    DatasetValidationResult,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/datasets", tags=["Datasets"])


def _parse_dataset_content(content_str: str) -> tuple[list[DatasetItem], list[str]]:
    """
    Parses JSON or JSONL content and returns valid DatasetItems and any errors.
    """
    items: list[DatasetItem] = []
    errors: list[str] = []

    content_str = content_str.strip()
    if not content_str:
        return [], ["File or content is empty."]

    # Try parsing as standard JSON array first
    if content_str.startswith("["):
        try:
            raw_list = json.loads(content_str)
            if not isinstance(raw_list, list):
                return [], ["JSON root must be an array of prompt items."]

            for idx, raw_item in enumerate(raw_list, start=1):
                try:
                    if not isinstance(raw_item, dict):
                        errors.append(f"Row {idx}: item must be a JSON object.")
                        continue
                    if "id" not in raw_item:
                        raw_item["id"] = f"item-{idx}"
                    item = DatasetItem(**raw_item)
                    items.append(item)
                except ValidationError as ve:
                    errors.append(f"Row {idx} validation error: {ve.errors()[0]['msg']}")
            return items, errors
        except json.JSONDecodeError as jde:
            errors.append(f"JSON syntax error: {jde.msg} at line {jde.lineno}")
            return [], errors

    # Fallback parse as JSONL (one JSON object per line)
    lines = content_str.splitlines()
    for idx, line in enumerate(lines, start=1):
        clean_line = line.strip()
        if not clean_line:
            continue
        try:
            raw_item = json.loads(clean_line)
            if not isinstance(raw_item, dict):
                errors.append(f"Line {idx}: must be a JSON object.")
                continue
            if "id" not in raw_item:
                raw_item["id"] = f"item-{idx}"
            item = DatasetItem(**raw_item)
            items.append(item)
        except json.JSONDecodeError:
            errors.append(f"Line {idx}: Invalid JSON syntax.")
        except ValidationError as ve:
            errors.append(f"Line {idx} validation error: {ve.errors()[0]['msg']}")

    return items, errors


@router.post("/validate", response_model=DatasetValidationResult, summary="Validate dataset file")
async def validate_dataset(
    file: UploadFile = File(...),
) -> DatasetValidationResult:
    """
    Validates an uploaded JSON or JSONL dataset file, checking required fields and returning a 10-row preview.
    """
    try:
        content = await file.read()
        content_str = content.decode("utf-8")
    except UnicodeDecodeError:
        return DatasetValidationResult(
            is_valid=False,
            total_rows=0,
            valid_rows=0,
            errors=["Uploaded file must be UTF-8 encoded text."],
            preview=[],
        )

    items, errors = _parse_dataset_content(content_str)
    preview = items[:10]
    is_valid = len(items) > 0 and len(errors) == 0

    return DatasetValidationResult(
        is_valid=is_valid,
        total_rows=len(items) + len(errors),
        valid_rows=len(items),
        errors=errors[:20],  # Limit error report
        preview=preview,
    )


@router.post(
    "/upload",
    response_model=DatasetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and save dataset",
)
async def upload_dataset(
    name: str = Form(...),
    description: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> DatasetEntity:
    """
    Uploads, validates, and stores a JSON or JSONL dataset file into the database.
    """
    try:
        content = await file.read()
        content_str = content.decode("utf-8")
    except UnicodeDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_ENCODING", "message": "File must be valid UTF-8 text."},
        ) from e

    items, errors = _parse_dataset_content(content_str)
    if not items:
        error_msg = errors[0] if errors else "No valid prompts found in dataset."
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_DATASET", "message": error_msg},
        )

    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "VALIDATION_FAILED",
                "message": f"Dataset contains {len(errors)} errors. First error: {errors[0]}",
            },
        )

    ds = DatasetEntity(
        name=name.strip(),
        description=description.strip() if description else None,
        row_count=len(items),
        data=[item.model_dump() for item in items],
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return ds


@router.post(
    "",
    response_model=DatasetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create dataset from JSON payload",
)
def create_dataset(
    req: DatasetCreate,
    db: Session = Depends(get_db),
) -> DatasetEntity:
    """Creates a new dataset from structured JSON."""
    ds = DatasetEntity(
        name=req.name,
        description=req.description,
        row_count=len(req.items),
        data=[item.model_dump() for item in req.items],
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return ds


@router.get("", response_model=list[DatasetResponse], summary="List all datasets")
def list_datasets(
    db: Session = Depends(get_db),
) -> list[DatasetEntity]:
    """Returns all available evaluation datasets."""
    return db.query(DatasetEntity).order_by(DatasetEntity.created_at.desc()).all()


@router.get("/{dataset_id}", response_model=DatasetResponse, summary="Get dataset by ID")
def get_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
) -> DatasetEntity:
    """Retrieves dataset details and prompt rows."""
    ds = db.query(DatasetEntity).filter(DatasetEntity.id == dataset_id).first()
    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DATASET_NOT_FOUND", "message": f"Dataset '{dataset_id}' not found."},
        )
    return ds


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete dataset")
def delete_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
) -> None:
    """Deletes a dataset."""
    ds = db.query(DatasetEntity).filter(DatasetEntity.id == dataset_id).first()
    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DATASET_NOT_FOUND", "message": f"Dataset '{dataset_id}' not found."},
        )
    db.delete(ds)
    db.commit()
