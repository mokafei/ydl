from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    favorites = relationship("FavoriteVideo", back_populates="collection", cascade="all, delete-orphan")


class FavoriteVideo(Base):
    __tablename__ = "favorite_videos"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), nullable=False)
    video_id = Column(String(32), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    channel_title = Column(String(255), nullable=True)
    thumbnail = Column(String(500), nullable=True)
    duration_iso8601 = Column(String(32), nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)

    collection = relationship("Collection", back_populates="favorites")


class WordFrequency(Base):
    __tablename__ = "word_frequencies"

    id = Column(Integer, primary_key=True, index=True)
    lemma = Column(String(100), unique=True, nullable=False, index=True)
    pos = Column(String(10), nullable=True)
    rank = Column(Integer, nullable=False)
    frequency = Column(Integer, nullable=False)
    per_million = Column(Float, nullable=True)
