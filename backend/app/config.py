from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    youtube_api_key: str = Field(default="")
    youtube_api_base: str = "https://www.googleapis.com/youtube/v3"

    class Config:
        env_file = (
            Path.cwd() / ".env",
            Path(__file__).resolve().parent.parent / ".env",
        )
        env_file_encoding = "utf-8"


settings = Settings()
