from __future__ import annotations

from datetime import UTC, datetime, timedelta


def ensure_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def now_utc() -> datetime:
    return datetime.now(UTC)


def calculate_trial_remaining(expire_at: datetime | None) -> int | None:
    expire_at = ensure_aware(expire_at)
    if expire_at is None:
        return None
    now = now_utc()
    if expire_at <= now:
        return 0
    delta: timedelta = expire_at - now
    return max(delta.days, 0)
