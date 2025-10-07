from __future__ import annotations

from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import ActivationCode, License, LicenseActivation, UserType
from .utils import now_utc


async def get_license(session: AsyncSession, license_key: str) -> License | None:
    stmt = select(License).where(License.license_key == license_key)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_activation(
    session: AsyncSession, *, license_id: int, device_id: str
) -> LicenseActivation | None:
    stmt = select(LicenseActivation).where(
        LicenseActivation.license_id == license_id,
        LicenseActivation.device_id == device_id,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def count_activations(session: AsyncSession, *, license_id: int) -> int:
    stmt = select(func.count(LicenseActivation.id)).where(
        LicenseActivation.license_id == license_id
    )
    result = await session.execute(stmt)
    return result.scalar_one()


async def create_activation(
    session: AsyncSession,
    *,
    license_id: int,
    device_id: str,
    device_name: str | None,
    activated_at: datetime,
) -> LicenseActivation:
    activation = LicenseActivation(
        license_id=license_id,
        device_id=device_id,
        device_name=device_name,
        activated_at=activated_at,
        last_seen_at=activated_at,
    )
    session.add(activation)
    await session.flush()
    return activation


async def update_activation_seen(
    session: AsyncSession, activation: LicenseActivation, seen_at: datetime
) -> None:
    activation.last_seen_at = seen_at
    await session.flush()


async def list_activations(session: AsyncSession, *, license_id: int) -> list[LicenseActivation]:
    stmt = select(LicenseActivation).where(LicenseActivation.license_id == license_id)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def remove_activation(
    session: AsyncSession, *, license_id: int, device_id: str
) -> int:
    stmt = (
        delete(LicenseActivation)
        .where(
            LicenseActivation.license_id == license_id,
            LicenseActivation.device_id == device_id,
        )
    )
    result = await session.execute(stmt)
    return result.rowcount or 0


async def create_license(
    session: AsyncSession,
    *,
    license_key: str,
    user_type: UserType,
    expire_at: datetime | None,
    trial_started_at: datetime | None,
    max_devices: int,
    notes: str | None,
    activation_code_id: int | None,
) -> License:
    license_obj = License(
        license_key=license_key,
        user_type=user_type,
        expire_at=expire_at,
        trial_started_at=trial_started_at,
        max_devices=max_devices,
        notes=notes,
        activation_code_id=activation_code_id,
    )
    session.add(license_obj)
    await session.flush()
    return license_obj


async def update_license(
    session: AsyncSession,
    license_obj: License,
    *,
    user_type: UserType | None = None,
    expire_at: datetime | None = None,
    max_devices: int | None = None,
    notes: str | None = None,
    activation_code_id: int | None = None,
) -> License:
    if user_type is not None:
        license_obj.user_type = user_type
    if expire_at is not None:
        license_obj.expire_at = expire_at
    if max_devices is not None:
        license_obj.max_devices = max_devices
    if notes is not None:
        license_obj.notes = notes
    if activation_code_id is not None:
        license_obj.activation_code_id = activation_code_id
    license_obj.updated_at = now_utc()
    await session.flush()
    return license_obj


async def get_activation_code(session: AsyncSession, code: str) -> ActivationCode | None:
    stmt = select(ActivationCode).where(ActivationCode.code == code)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def increment_activation_code_usage(
    session: AsyncSession, activation_code: ActivationCode
) -> None:
    activation_code.used_count += 1
    activation_code.updated_at = now_utc()
    await session.flush()


async def create_activation_code(
    session: AsyncSession,
    *,
    code: str,
    user_type: UserType,
    valid_days: int | None,
    max_devices: int,
    usage_limit: int | None,
    expires_at: datetime | None,
    notes: str | None,
) -> ActivationCode:
    activation_code = ActivationCode(
        code=code,
        user_type=user_type,
        valid_days=valid_days,
        max_devices=max_devices,
        usage_limit=usage_limit,
        expires_at=expires_at,
        notes=notes,
    )
    session.add(activation_code)
    await session.flush()
    return activation_code


async def revoke_activation_code(session: AsyncSession, code: str) -> int:
    stmt = delete(ActivationCode).where(ActivationCode.code == code)
    result = await session.execute(stmt)
    return result.rowcount or 0


async def deactivate_expired_trials(session: AsyncSession) -> int:
    now = now_utc()
    stmt = (
        update(License)
        .where(
            License.user_type == UserType.TRIAL,
            License.expire_at.isnot(None),
            ensure_aware(License.expire_at) <= now,
        )
        .values(updated_at=now)
    )
    result = await session.execute(stmt)
    return result.rowcount or 0
