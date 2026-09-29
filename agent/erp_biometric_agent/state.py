"""SQLite spool: attendance punches survive local or SaaS outages."""

from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path
from typing import Any


def event_key(device_id: str, record: dict[str, Any]) -> str:
    stable = {
        "device_id": str(device_id),
        "uid": record.get("uid"),
        "user_id": str(record.get("user_id", "")),
        "timestamp": str(record.get("timestamp", "")),
        "status": record.get("status"),
        "punch": record.get("punch"),
    }
    return hashlib.sha256(json.dumps(stable, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


class EventSpool:
    def __init__(self, path: str):
        file_path = Path(path).expanduser()
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.parent.chmod(0o700)
        self.db = sqlite3.connect(file_path)
        file_path.chmod(0o600)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("""CREATE TABLE IF NOT EXISTS seen_events (
            event_key TEXT PRIMARY KEY,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        self.db.execute("""CREATE TABLE IF NOT EXISTS events (
            event_key TEXT PRIMARY KEY,
            device_id TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        self.db.commit()

    def enqueue(self, device_id: str, record: dict[str, Any]) -> bool:
        key = event_key(device_id, record)
        payload = {
            "event_key": key,
            "device_id": str(device_id),
            "device_user_id": str(record.get("user_id", "")),
            "timestamp": record.get("timestamp"),
            "status": record.get("status"),
            "punch": record.get("punch"),
            "device_uid": record.get("uid"),
        }
        cursor = self.db.execute("INSERT OR IGNORE INTO seen_events (event_key) VALUES (?)", (key,))
        if cursor.rowcount == 0:
            return False
        self.db.execute(
            "INSERT INTO events (event_key, device_id, payload) VALUES (?, ?, ?)",
            (key, str(device_id), json.dumps(payload, separators=(",", ":"), default=str)),
        )
        self.db.commit()
        return cursor.rowcount == 1

    def pending(self, limit: int = 250) -> list[dict[str, Any]]:
        rows = self.db.execute("SELECT event_key, payload FROM events ORDER BY created_at, event_key LIMIT ?", (limit,)).fetchall()
        return [{"event_key": key, **json.loads(payload)} for key, payload in rows]

    def acknowledge(self, keys: list[str]) -> None:
        if keys:
            self.db.executemany("DELETE FROM events WHERE event_key = ?", [(key,) for key in keys])
            self.db.commit()

    def pending_count(self) -> int:
        return int(self.db.execute("SELECT COUNT(*) FROM events").fetchone()[0])

    def close(self) -> None:
        self.db.close()
