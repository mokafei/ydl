from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="LICENSE_",
        env_file=".env",
        extra="ignore",
    )

    database_url: str = Field(default="sqlite+aiosqlite:///./license.db")
    secret_key: str = Field(default="change-me")
    trial_duration_days: int = Field(default=15, ge=1)
    latest_version: str = Field(default="1.0.0")
    minimum_version: str = Field(default="1.0.0")
    download_url: str = Field(default="https://example.com/downloads/ydl/latest")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
