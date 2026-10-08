from typing import Literal

from app.core.config import settings
from app.services.providers.base import BaseModelProvider
from app.services.providers.ollama_provider import OllamaProvider
from app.services.providers.public_provider import PublicFreeProvider

ProviderType = Literal["ollama", "public_free"]


def get_model_provider(provider_type: ProviderType | None = None) -> BaseModelProvider:
    """Instantiate and return the appropriate inference provider."""
    # Default to ollama if not specified, or use settings
    selected = provider_type or getattr(settings, "model_provider", "ollama")
    if selected == "public_free":
        return PublicFreeProvider(
            api_key=getattr(settings, "public_provider_api_key", None),
            base_url=getattr(
                settings, "public_provider_base_url", "https://api.groq.com/openai/v1"
            ),
        )
    return OllamaProvider()
