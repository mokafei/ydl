from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud
from ..config import get_settings
from ..database import get_session
from ..models import License
from ..schemas import LicenseEnvelope, LicensePayload, LicenseResponse, UpdateCheckRequest, UpdateCheckResponse
from ..security import sign_payload
from ..utils import calculate_trial_remaining, now_utc

router = APIRouter()


def _build_license_payload(license_obj: License) -> LicensePayload:
    settings = get_settings()
    issued_at = now_utc()
    latest_version = license_obj.latest_version or settings.latest_version
    minimum_version = license_obj.minimum_version or settings.minimum_version
    download_url = license_obj.download_url or settings.download_url

    return LicensePayload(
        license_key=license_obj.license_key,
        user_type=license_obj.user_type,
        expire_at=license_obj.expire_at,
        max_devices=license_obj.max_devices,
        latest_version=latest_version,
        minimum_version=minimum_version,
        download_url=download_url,
        issued_at=issued_at,
        trial_remaining_days=calculate_trial_remaining(license_obj.expire_at),
    )


def _wrap_payload(payload: LicensePayload) -> LicenseEnvelope:
    data = payload.model_dump()
    signature = sign_payload(data)
    return LicenseEnvelope(payload=payload, signature=signature)


@router.post("/check", response_model=UpdateCheckResponse)
async def check_update(
    request: UpdateCheckRequest,
    session: AsyncSession = Depends(get_session),
) -> UpdateCheckResponse:
    license_obj = await crud.get_license(session, request.license_key)
    if license_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="license_not_found")

    activation = await crud.get_activation(
        session, license_id=license_obj.id, device_id=request.device_id
    )
    if activation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="activation_not_found")

    settings = get_settings()
    latest_version = license_obj.latest_version or settings.latest_version
    minimum_version = license_obj.minimum_version or settings.minimum_version
    download_url = license_obj.download_url or settings.download_url

    has_update = request.current_version < latest_version
    mandatory = request.current_version < minimum_version

    payload = _build_license_payload(license_obj)
    envelope = _wrap_payload(payload)

    return UpdateCheckResponse(
        has_update=has_update,
        mandatory=mandatory,
        latest_version=latest_version,
        download_url=download_url,
        license=envelope,
    )
