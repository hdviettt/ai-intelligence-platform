"""Central settings. Reads from environment / .env (never committed)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database — DATABASE_URL is injected by Railway in prod; locally we pass the
    # public proxy URL via the environment.
    database_url: str = ""

    # Embeddings
    voyage_api_key: str = ""
    voyage_model: str = "voyage-3-lite"
    embedding_dim: int = 512

    # Synthesis — Groq is the cheap streaming default; Anthropic optional upgrade.
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"
    synthesis_provider: str = "groq"  # "groq" | "anthropic"

    # Ingestion
    user_agent: str = "ai-search-experience/0.1 (+https://github.com/hdviettt/ai-search-experience)"
    request_timeout: float = 30.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
