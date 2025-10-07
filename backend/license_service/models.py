from __future__ import annotations

import enum
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class UserType(str, enum.Enum):
    TRIAL = "trial"
    PRO = "pro"


class ActivationCode(Base):
    __tablename__ = "activation_codes"
    __table_args__ = (UniqueConstraint("code", name="uq_activation_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    user_type: Mapped[UserType] = mapped_column(Enum(UserType), default=UserType.PRO, nullable=False)
    valid_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_devices: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    usage_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    licenses: Mapped[list["License"]] = relationship("License", back_populates="activation_code")


class License(Base):
    __tablename__ = "licenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    license_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    user_type: Mapped[UserType] = mapped_column(Enum(UserType), default=UserType.TRIAL, nullable=False)
    expire_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    trial_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_devices: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latest_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    minimum_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    download_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    activation_code_id: Mapped[int | None] = mapped_column(ForeignKey("activation_codes.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    activation_code: Mapped[ActivationCode | None] = relationship("ActivationCode", back_populates="licenses")
    activations: Mapped[list[LicenseActivation]] = relationship(
        "LicenseActivation", back_populates="license", cascade="all, delete-orphan"
    )


class LicenseActivation(Base):
    __tablename__ = "license_activations"
    __table_args__ = (UniqueConstraint("license_id", "device_id", name="uq_license_device"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    license_id: Mapped[int] = mapped_column(ForeignKey("licenses.id", ondelete="CASCADE"), nullable=False)
    device_id: Mapped[str] = mapped_column(String(128), nullable=False)
    device_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    activated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    license: Mapped[License] = relationship("License", back_populates="activations")
