"""Agent configuration and pairing helpers."""

from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse


DEFAULT_CONFIG_PATH = Path.home() / ".config" / "erp-biometric-agent" / "config.json"
DEFAULT_STATE_PATH = Path.home() / ".local" / "state" / "erp-biometric-agent" / "state.sqlite3"


@dataclass(frozen=True)
class AgentConfig:
    api_url: str
    agent_id: str
    agent_token: str
    poll_interval: int = 30
    request_timeout: int = 20
    state_path: str = str(DEFAULT_STATE_PATH)

    @classmethod
    def load(cls, path: Path = DEFAULT_CONFIG_PATH) -> "AgentConfig":
        try:
            values = json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError as exc:
            raise RuntimeError(f"Agent is not paired. Run: erp-biometric-agent pair --api-url https://your-erp.example/api --code CODE") from exc
        required = ("api_url", "agent_id", "agent_token")
        missing = [key for key in required if not values.get(key)]
        if missing:
            raise RuntimeError(f"Invalid agent config; missing: {', '.join(missing)}")
        return cls(
            api_url=normalize_api_url(str(values["api_url"])),
            agent_id=str(values["agent_id"]),
            agent_token=str(values["agent_token"]),
            poll_interval=max(10, int(values.get("poll_interval", 30))),
            request_timeout=max(3, int(values.get("request_timeout", 20))),
            state_path=str(values.get("state_path", DEFAULT_STATE_PATH)),
        )


def normalize_api_url(value: str) -> str:
    url = value.strip().rstrip("/")
    parsed = urlparse(url)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        raise ValueError("ERP API URL must be an absolute http(s) URL")
    if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("ERP API URL must use HTTPS outside localhost")
    return url


def save_config(values: dict, path: Path = DEFAULT_CONFIG_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.parent.chmod(0o700)
    fd, temporary = tempfile.mkstemp(prefix="config-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(values, handle, indent=2)
            handle.write("\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
        path.chmod(0o600)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def pair_agent(api_url: str, code: str, timeout: int = 20) -> dict:
    """Redeem a short-lived, single-use code and store the returned agent token."""
    from .http_client import request_json

    normalized = normalize_api_url(api_url)
    response = request_json(
        "POST",
        f"{normalized}/biometric/agents/pair",
        timeout=timeout,
        body={"code": code.strip()},
    )
    data = response.get("data", response)
    if not data.get("agent_id") or not data.get("agent_token"):
        raise RuntimeError("ERP pairing response must include agent_id and agent_token")
    save_config({"api_url": normalized, "agent_id": str(data["agent_id"]), "agent_token": str(data["agent_token"])})
    return {"agent_id": str(data["agent_id"]), "api_url": normalized}
