from __future__ import annotations

import argparse
import asyncio
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .database import SessionLocal
from .models import License, UserType


async def _create_license(
    session: AsyncSession,
    *,
    license_key: str,
    user_type: UserType,
    expire_at: datetime | None,
    max_devices: int,
    notes: str | None,
) -> License:
    license_obj = License(
        license_key=license_key,
        user_type=user_type,
        expire_at=expire_at,
        max_devices=max_devices,
        notes=notes,
    )
    session.add(license_obj)
    await session.commit()
    await session.refresh(license_obj)
    return license_obj


async def create_license(
    *,
    license_key: str | None,
    user_type: UserType,
    trial_days: int,
    max_devices: int,
    notes: str | None,
) -> License:
    key = license_key or secrets.token_urlsafe(16)
    expire_at: datetime | None = None
    if user_type == UserType.TRIAL:
        expire_at = datetime.now(UTC) + timedelta(days=trial_days)

    async with SessionLocal() as session:
        license_obj = await _create_license(
            session,
            license_key=key,
            user_type=user_type,
            expire_at=expire_at,
            max_devices=max_devices,
            notes=notes,
        )
    return license_obj


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="YDL License Service CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_parser = subparsers.add_parser("create", help="Create a new license")
    create_parser.add_argument("type", choices=[UserType.TRIAL.value, UserType.PRO.value], help="License type")
    create_parser.add_argument("--key", dest="license_key", help="Custom license key")
    create_parser.add_argument(
        "--trial-days",
        type=int,
        default=get_settings().trial_duration_days,
        help="Trial duration in days (for trial license)",
    )
    create_parser.add_argument(
        "--max-devices",
        type=int,
        default=1,
        help="Maximum number of devices allowed",
    )
    create_parser.add_argument("--notes", help="Optional notes")

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.command == "create":
        user_type = UserType(args.type)
        license_obj = asyncio.run(
            create_license(
                license_key=args.license_key,
                user_type=user_type,
                trial_days=args.trial_days,
                max_devices=args.max_devices,
                notes=args.notes,
            )
        )
        expire = license_obj.expire_at.isoformat() if license_obj.expire_at else "None"
        print("License created:")
        print(f"  Key: {license_obj.license_key}")
        print(f"  Type: {license_obj.user_type.value}")
        print(f"  Expire at: {expire}")
        print(f"  Max devices: {license_obj.max_devices}")
    else:
        raise ValueError(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    main()
