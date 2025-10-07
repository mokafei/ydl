from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, Field


class FavoriteVideoBase(BaseModel):
    video_id: str = Field(..., max_length=32)
    title: str = Field(..., max_length=255)
    channel_title: Optional[str] = Field(None, max_length=255)
    thumbnail: Optional[str] = Field(None, max_length=500)
    duration_iso8601: Optional[str] = Field(None, max_length=32)


class FavoriteVideoCreate(FavoriteVideoBase):
    pass


class FavoriteVideo(FavoriteVideoBase):
    id: int
    collection_id: int
    added_at: datetime

    class Config:
        orm_mode = True


class CollectionBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None

class CollectionCreate(CollectionBase):
    pass


class Collection(BaseModel):
    id: int
    created_at: datetime
    favorites: list[FavoriteVideo] = []

    class Config:
        orm_mode = True


class DownloadRequest(BaseModel):
    video_id: str
    format_code: Optional[str] = None
    audio_only: bool = False


class DownloadResponse(BaseModel):
    message: str
    data: dict[str, Any]
