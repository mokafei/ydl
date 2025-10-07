from __future__ import annotations

from datetime import UTC, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud
from ..config import get_settings
from ..database import get_session
from ..models import License, UserType
from ..schemas import (
    ActivationRequest,
    DeviceInfo,
    DeviceListResponse,
    LicenseEnvelope,
    LicensePayload,
    LicenseResponse,
    RedeemRequest,
    TrialStartRequest,
    TrialStartResponse,
    ValidateRequest,
)
from ..security import sign_payload
from ..utils import calculate_trial_remaining, ensure_aware, now_utc

router = APIRouter()


async def _ensure_license(session: AsyncSession, license_key: str) -> License:
    license_obj = await crud.get_license(session, license_key)
    if license_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="license_not_found")
    return license_obj


def _build_license_payload(license_obj: License) -> LicensePayload:
    settings = get_settings()
    issued_at = now_utc()
    latest_version = license_obj.latest_version or settings.latest_version
    minimum_version = license_obj.minimum_version or settings.minimum_version
    download_url = license_obj.download_url or settings.download_url
    remaining_days = calculate_trial_remaining(license_obj.expire_at)

    return LicensePayload(
        license_key=license_obj.license_key,
        user_type=license_obj.user_type,
        expire_at=license_obj.expire_at,
        max_devices=license_obj.max_devices,
        latest_version=latest_version,
        minimum_version=minimum_version,
        download_url=download_url,
        issued_at=issued_at,
        trial_remaining_days=remaining_days,
    )


def _wrap_payload(payload: LicensePayload) -> LicenseEnvelope:
    data = payload.model_dump()
    signature = sign_payload(data)
    return LicenseEnvelope(payload=payload, signature=signature)


@router.post("/trial/start", response_model=TrialStartResponse)
async def start_trial(
    request: TrialStartRequest,
    session: AsyncSession = Depends(get_session),
) -> TrialStartResponse:
    settings = get_settings()
    trial_days = settings.trial_duration_days
    now = now_utc()

    license_key = f"trial-{request.device_id}"
    license_obj = await crud.get_license(session, license_key)
    if license_obj is None:
        expire_at = now + timedelta(days=trial_days)
        license_obj = await crud.create_license(
            session,
            license_key=license_key,
            user_type=UserType.TRIAL,
            expire_at=expire_at,
            trial_started_at=now,
            max_devices=1,
            notes="auto trial",
            activation_code_id=None,
        )
        await session.commit()
    payload = _build_license_payload(license_obj)
    envelope = _wrap_payload(payload)
    return TrialStartResponse(license=envelope)


@router.post("/activate", response_model=LicenseResponse)
async def activate_license(
    request: ActivationRequest,
    session: AsyncSession = Depends(get_session),
) -> LicenseResponse:
    license_obj = await _ensure_license(session, request.license_key)
    now = now_utc()

    expire_at = ensure_aware(license_obj.expire_at)
    if license_obj.user_type == UserType.TRIAL and expire_at and expire_at <= now:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="trial_expired")

    activation = await crud.get_activation(
        session, license_id=license_obj.id, device_id=request.device_id
    )
    if activation is None:
        count = await crud.count_activations(session, license_id=license_obj.id)
        if count >= license_obj.max_devices:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="device_limit_exceeded")
        await crud.create_activation(
            session,
            license_id=license_obj.id,
            device_id=request.device_id,
            device_name=request.device_name,
            activated_at=now,
        )
    else:
        await crud.update_activation_seen(session, activation, seen_at=now)

    await session.commit()

    payload = _build_license_payload(license_obj)
    envelope = _wrap_payload(payload)
    return LicenseResponse(license=envelope)


@router.get("/devices", response_model=DeviceListResponse)
async def list_devices(
    license_key: str,
    session: AsyncSession = Depends(get_session),
) -> DeviceListResponse:
    license_obj = await _ensure_license(session, license_key)
    activations = await crud.list_activations(session, license_id=license_obj.id)
    devices = [
        DeviceInfo(
            device_id=a.device_id,
            device_name=a.device_name,
            activated_at=a.activated_at,
            last_seen_at=a.last_seen_at,
        )
        for a in activations
    ]
    return DeviceListResponse(devices=devices)


@router.get("/profile", response_model=LicenseResponse)
async def get_profile(
    license_key: str,
    device_id: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> LicenseResponse:
    license_obj = await _ensure_license(session, license_key)
    if device_id:
        activation = await crud.get_activation(
            session, license_id=license_obj.id, device_id=device_id
        )
        if activation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="activation_not_found"
            )

    payload = _build_license_payload(license_obj)
    envelope = _wrap_payload(payload)
    return LicenseResponse(license=envelope)


@router.delete("/devices/{device_id}", response_model=DeviceListResponse)
async def remove_device(
    device_id: str,
    license_key: str,
    session: AsyncSession = Depends(get_session),
) -> DeviceListResponse:
    license_obj = await _ensure_license(session, license_key)
    await crud.remove_activation(session, license_id=license_obj.id, device_id=device_id)
    await session.commit()
    activations = await crud.list_activations(session, license_id=license_obj.id)
    devices = [
        DeviceInfo(
            device_id=a.device_id,
            device_name=a.device_name,
            activated_at=a.activated_at,
            last_seen_at=a.last_seen_at,
        )
        for a in activations
    ]
    return DeviceListResponse(devices=devices)


@router.post("/redeem", response_model=LicenseResponse)
async def redeem_activation_code(
    request: RedeemRequest,
    session: AsyncSession = Depends(get_session),
) -> LicenseResponse:
    code_obj = await crud.get_activation_code(session, request.activation_code)
    if code_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="activation_code_not_found")

    if code_obj.expires_at and ensure_aware(code_obj.expires_at) <= now_utc():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="activation_code_expired")

    if code_obj.usage_limit is not None and code_obj.used_count >= code_obj.usage_limit:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="activation_code_depleted")

    license_obj = await crud.get_license(session, request.activation_code)
    if license_obj is None:
        expire_at = None
        if code_obj.valid_days is not None:
            expire_at = now_utc() + timedelta(days=code_obj.valid_days)
        license_obj = await crud.create_license(
            session,
            license_key=request.activation_code,
            user_type=code_obj.user_type,
            expire_at=expire_at,
            trial_started_at=None,
            max_devices=code_obj.max_devices,
            notes="redeemed",
            activation_code_id=code_obj.id,
        )
    else:
        await crud.update_license(
            session,
            license_obj,
            user_type=code_obj.user_type,
            expire_at=now_utc() + timedelta(days=code_obj.valid_days)
            if code_obj.valid_days is not None
            else None,
            max_devices=code_obj.max_devices,
            activation_code_id=code_obj.id,
        )

    await crud.increment_activation_code_usage(session, code_obj)
    await session.commit()

    payload = _build_license_payload(license_obj)
    envelope = _wrap_payload(payload)
    return LicenseResponse(license=envelope)


@router.post("/validate", response_model=LicenseResponse)
async def validate_license(
    request: ValidateRequest,
    session: AsyncSession = Depends(get_session),
) -> LicenseResponse:
    license_obj = await _ensure_license(session, request.license_key)

    activation = await crud.get_activation(
        session, license_id=license_obj.id, device_id=request.device_id
    )
    if activation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="activation_not_found")

    now = now_utc()
    expire_at = ensure_aware(license_obj.expire_at)
    if license_obj.user_type == UserType.TRIAL and expire_at and expire_at <= now:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="trial_expired")

    activation.last_seen_at = now
    await session.commit()

    payload = _build_license_payload(license_obj)
    envelope = _wrap_payload(payload)
    return LicenseResponse(license=envelope)
