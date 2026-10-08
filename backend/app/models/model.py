from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ModelEntity(Base):
    __tablename__ = "models"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    provider: Mapped[str] = mapped_column(String(100), default="Unknown")
    parameter_count: Mapped[str | None] = mapped_column(String(50), nullable=True)
    context_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    input_price: Mapped[float | None] = mapped_column(Float, nullable=True)  # USD / 1M tokens
    output_price: Mapped[float | None] = mapped_column(Float, nullable=True)  # USD / 1M tokens
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
