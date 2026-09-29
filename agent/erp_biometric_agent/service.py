"""Polling service for ZKTeco terminals on the customer's private LAN."""

from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any

from . import __version__
from .config import AgentConfig
from .http_client import request_json
from .state import EventSpool

log = logging.getLogger("erp_biometric_agent")


def _normalize_timestamp(value: Any) -> str:
    if isinstance(value, datetime):
        # Device timestamps are local wall time. Preserve the wall-clock value;
        # tenant timezone conversion belongs to the ERP backend.
        return value.isoformat(timespec="seconds")
    return str(value)


class Connector:
    def __init__(self, config: AgentConfig):
        self.config = config
        self.spool = EventSpool(config.state_path)

    def api(self, method: str, path: str, body: dict | None = None) -> dict:
        return request_json(
            method,
            f"{self.config.api_url}{path}",
            timeout=self.config.request_timeout,
            token=self.config.agent_token,
            body=body,
            tenant_slug=self.config.tenant_slug,
        )

    def list_devices(self) -> list[dict[str, Any]]:
        result = self.api("GET", "/biometric/agents/devices")
        data = result.get("data", result)
        if isinstance(data, dict):
            data = data.get("devices", [])
        if not isinstance(data, list):
            raise RuntimeError("ERP agent devices response must contain a list")
        return data

    def sync_device(self, device: dict[str, Any]) -> tuple[int, str | None]:
        device_id = str(device["id"])
        try:
            from zk import ZK
        except ImportError as exc:
            raise RuntimeError("Install the pyzk dependency to communicate with ZKTeco devices") from exc

        zk = ZK(
            str(device["ip_address"]),
            port=int(device.get("port", 4370)),
            timeout=int(device.get("timeout", 10)),
            force_udp=str(device.get("protocol", "tcp")).lower() == "udp",
            ommit_ping=True,
            password=int(device.get("password") or 0),
        )
        connection = None
        try:
            connection = zk.connect()
            connection.disable_device()
            records = connection.get_attendance() or []
            for item in records:
                record = {
                    "uid": getattr(item, "uid", None),
                    "user_id": getattr(item, "user_id", ""),
                    "timestamp": _normalize_timestamp(getattr(item, "timestamp", "")),
                    "status": getattr(item, "status", None),
                    "punch": getattr(item, "punch", None),
                }
                self.spool.enqueue(device_id, record)
            return len(records), None
        except Exception as exc:  # device SDK errors vary by model/firmware
            return 0, f"{type(exc).__name__}: {exc}"[:500]
        finally:
            if connection is not None:
                try:
                    connection.enable_device()
                except Exception:
                    log.warning("Could not re-enable device %s", device_id)
                try:
                    connection.disconnect()
                except Exception:
                    pass

    def flush(self, batch_size: int = 250) -> int:
        batch = self.spool.pending(batch_size)
        if not batch:
            return 0
        result = self.api("POST", "/biometric/agents/events", {"events": batch})
        data = result.get("data", result)
        # The server must explicitly acknowledge durable, idempotent inserts.
        accepted = data.get("accepted_event_keys") if isinstance(data, dict) else None
        if not isinstance(accepted, list):
            raise RuntimeError("ERP event response must include accepted_event_keys")
        valid_keys = {item["event_key"] for item in batch}
        safe_keys = [str(key) for key in accepted if str(key) in valid_keys]
        self.spool.acknowledge(safe_keys)
        return len(safe_keys)

    def run_once(self) -> dict[str, int]:
        devices = self.list_devices()
        results = {"devices": len(devices), "read": 0, "uploaded": 0, "pending": 0}
        errors = []
        for device in devices:
            if not device.get("is_active", True):
                continue
            count, error = self.sync_device(device)
            results["read"] += count
            if error:
                errors.append({"device_id": str(device.get("id")), "message": error})
        results["uploaded"] = self.flush()
        results["pending"] = self.spool.pending_count()
        self.api("POST", "/biometric/agents/heartbeat", {
            "agent_id": self.config.agent_id,
            "agent_version": __version__,
            "status": "degraded" if errors else "online",
            "devices_count": results["devices"],
            "pending_events": results["pending"],
            "errors": errors,
        })
        return results

    def run_forever(self, interval: int | None = None) -> None:
        delay = interval or self.config.poll_interval
        log.info("ERP biometric connector started; polling every %ss", delay)
        while True:
            started = time.monotonic()
            try:
                result = self.run_once()
                log.info("Cycle complete: %s", result)
                delay = interval or self.config.poll_interval
            except KeyboardInterrupt:
                raise
            except Exception:
                log.exception("Connector cycle failed; queued events are retained")
                delay = min(max(delay * 2, 10), 300)
            time.sleep(max(1, delay - (time.monotonic() - started)))

    def close(self) -> None:
        self.spool.close()
