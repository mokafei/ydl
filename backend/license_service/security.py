from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime

from .config import get_settings


def _get_secret() -> bytes:
    return get_settings().secret_key.encode("utf-8")


def sign_payload(payload: dict) -> str:
    serialized = json.dumps(payload, separators=(",", ":"), sort_keys=True, default=_json_serializer)
    digest = hmac.new(_get_secret(), serialized.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8")


def verify_signature(payload: dict, signature: str) -> bool:
    expected = sign_payload(payload)
    return hmac.compare_digest(expected, signature)


def _json_serializer(obj):
    if isinstance(obj, datetime):
        return obj.astimezone(UTC).isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")
