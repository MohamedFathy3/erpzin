"""Small JSON-over-HTTPS client; keeps runtime dependencies minimal."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any


class ApiError(RuntimeError):
    pass


def request_json(method: str, url: str, *, timeout: int = 20, token: str | None = None, body: dict | None = None) -> dict[str, Any]:
    payload = None if body is None else json.dumps(body, separators=(",", ":")).encode("utf-8")
    headers = {"Accept": "application/json", "User-Agent": "erp-biometric-agent/0.1.0"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=payload, headers=headers, method=method.upper())
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read(2_000_000)
    except urllib.error.HTTPError as exc:
        detail = exc.read(4096).decode("utf-8", errors="replace")
        raise ApiError(f"ERP API returned HTTP {exc.code}: {detail}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise ApiError(f"ERP API connection failed: {exc}") from exc
    try:
        value = json.loads(raw or b"{}")
    except json.JSONDecodeError as exc:
        raise ApiError("ERP API returned invalid JSON") from exc
    if not isinstance(value, dict):
        raise ApiError("ERP API returned an unexpected response")
    return value
