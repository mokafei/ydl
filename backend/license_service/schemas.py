from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .models import UserType


class ActivationRequest(BaseModel):
    license_key: str = Field(min_length=4, max_length=128)
    device_id: str = Field(min_length=4, max_length=128)
    device_name: str | None = Field(default=None, max_length=128)
    current_version: str | None = Field(default=None, max_length=32)


class ValidateRequest(BaseModel):
    license_key: str = Field(min_length=4, max_length=128)
    device_id: str = Field(min_length=4, max_length=128)
    current_version: str | None = Field(default=None, max_length=32)


class UpdateCheckRequest(BaseModel):
    license_key: str = Field(min_length=4, max_length=128)
    device_id: str = Field(min_length=4, max_length=128)
    current_version: str = Field(min_length=1, max_length=32)


class LicensePayload(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    license_key: str
    user_type: UserType
    expire_at: datetime | None
    max_devices: int
    latest_version: str
    minimum_version: str
    download_url: str
    issued_at: datetime
    trial_remaining_days: int | None


class LicenseEnvelope(BaseModel):
    payload: LicensePayload
    signature: str


class LicenseResponse(BaseModel):
    status: Literal["ok"] = "ok"
    license: LicenseEnvelope


class UpdateCheckResponse(BaseModel):
    status: Literal["ok"] = "ok"
    has_update: bool
    mandatory: bool
    latest_version: str
    download_url: str
    license: LicenseEnvelope


class TrialStartRequest(BaseModel):
    device_id: str = Field(min_length=4, max_length=128)
    device_name: str | None = Field(default=None, max_length=128)
    current_version: str | None = Field(default=None, max_length=32)


class TrialStartResponse(BaseModel):
    status: Literal["ok"] = "ok"
    license: LicenseEnvelope


class RedeemRequest(BaseModel):
    activation_code: str = Field(min_length=4, max_length=64)
    device_id: str = Field(min_length=4, max_length=128)
    device_name: str | None = Field(default=None, max_length=128)
    current_version: str | None = Field(default=None, max_length=32)


class DeviceInfo(BaseModel):
    device_id: str
    device_name: str | None
    activated_at: datetime
    last_seen_at: datetime


class DeviceListResponse(BaseModel):
    status: Literal["ok"] = "ok"
    devices: list[DeviceInfo]
