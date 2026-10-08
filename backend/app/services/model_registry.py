import logging
from pathlib import Path

import yaml

from app.core.config import settings
from app.schemas.model import ModelBase

logger = logging.getLogger(__name__)


class ModelRegistryService:
    def __init__(self, pricing_file_path: str | None = None):
        self.pricing_file_path = Path(pricing_file_path or settings.pricing_file_path)
        self._cache: dict[str, dict] = {}
        self.reload_pricing()

    def reload_pricing(self) -> None:
        """Loads or reloads the pricing.yaml file into memory."""
        self._cache = {}
        if not self.pricing_file_path.exists():
            # Check relative to parent directory if running from backend/
            alt_path = Path("..") / self.pricing_file_path
            if alt_path.exists():
                self.pricing_file_path = alt_path

        if not self.pricing_file_path.exists():
            logger.warning(
                "Pricing configuration not found at %s. Cost estimations will be marked unavailable.",
                self.pricing_file_path,
            )
            return

        try:
            with open(self.pricing_file_path, encoding="utf-8") as f:
                content = yaml.safe_load(f) or {}
                self._cache = content.get("models", {})
                logger.info(
                    "Loaded pricing and metadata for %d models from %s",
                    len(self._cache),
                    self.pricing_file_path,
                )
        except Exception as e:
            logger.error("Failed to load pricing config: %s", e)
            self._cache = {}

    def get_registered_models(self) -> list[ModelBase]:
        """Returns all models defined in the registry."""
        models: list[ModelBase] = []
        for model_id, data in self._cache.items():
            models.append(
                ModelBase(
                    id=model_id,
                    name=data.get("name", model_id),
                    provider=data.get("provider", "Open Source"),
                    parameter_count=data.get("parameter_count"),
                    context_length=data.get("context_length"),
                    input_price=data.get("input_price"),
                    output_price=data.get("output_price"),
                    enabled=data.get("enabled", True),
                    metadata=data.get("metadata", {}),
                )
            )
        return models

    def get_model(self, model_id: str) -> ModelBase | None:
        """Retrieves a specific model specification if registered."""
        # Try exact match, or match without tags if needed
        data = self._cache.get(model_id)
        if not data:
            # Fallback search by base name
            base_id = model_id.split(":")[0]
            for k, v in self._cache.items():
                if k.startswith(base_id):
                    data = v
                    break

        if not data:
            return None

        return ModelBase(
            id=model_id,
            name=data.get("name", model_id),
            provider=data.get("provider", "Unknown"),
            parameter_count=data.get("parameter_count"),
            context_length=data.get("context_length"),
            input_price=data.get("input_price"),
            output_price=data.get("output_price"),
            enabled=data.get("enabled", True),
            metadata=data.get("metadata", {}),
        )

    def calculate_cost(
        self,
        model_name: str,
        prompt_tokens: int,
        completion_tokens: int,
    ) -> float | None:
        """
        Calculates estimated cost in USD based on input_price and output_price per 1M tokens.
        If pricing is unavailable, returns None (DO NOT invent a price).
        """
        model = self.get_model(model_name)
        if not model or model.input_price is None or model.output_price is None:
            return None

        # Pricing is specified in USD per 1,000,000 tokens
        input_cost = (max(0, prompt_tokens) / 1_000_000.0) * model.input_price
        output_cost = (max(0, completion_tokens) / 1_000_000.0) * model.output_price
        total_cost = input_cost + output_cost
        return round(total_cost, 8)


model_registry_service = ModelRegistryService()
