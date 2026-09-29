import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from erp_biometric_agent.config import (
    AgentConfig,
    normalize_api_url,
    save_config,
    tenant_slug_from_api_url,
)
from erp_biometric_agent.http_client import request_json
from erp_biometric_agent.state import EventSpool, event_key


class AgentTests(unittest.TestCase):
    def test_api_url_requires_https_except_localhost(self):
        self.assertEqual(normalize_api_url(" https://erp.example.com/api/ "), "https://erp.example.com/api")
        self.assertEqual(normalize_api_url("http://127.0.0.1:8000/api"), "http://127.0.0.1:8000/api")
        with self.assertRaises(ValueError):
            normalize_api_url("http://erp.example.com/api")

    def test_tenant_slug_is_inferred_from_tenant_subdomain(self):
        self.assertEqual(
            tenant_slug_from_api_url("https://acsa.professionalacademyedu.com/api"),
            "acsa",
        )
        self.assertIsNone(tenant_slug_from_api_url("https://api.example.com/api"))
        self.assertIsNone(tenant_slug_from_api_url("https://erp.example.com/api"))

    def test_agent_api_requests_send_tenant_slug_header(self):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"status":true}'
        with patch("urllib.request.urlopen", return_value=response) as urlopen:
            result = request_json("GET", "https://acsa.professionalacademyedu.com/api/ping", tenant_slug="acsa")
        request = urlopen.call_args.args[0]
        self.assertEqual(request.get_header("X-tenant-slug"), "acsa")
        self.assertTrue(result["status"])

    def test_event_key_is_stable_and_device_scoped(self):
        record = {"uid": 2, "user_id": "1001", "timestamp": "2026-09-29T08:00:00", "status": 0, "punch": 0}
        self.assertEqual(event_key("device-a", record), event_key("device-a", dict(record)))
        self.assertNotEqual(event_key("device-a", record), event_key("device-b", record))

    def test_config_is_owner_only_and_loadable(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "private" / "config.json"
            save_config({
                "api_url": "https://acsa.professionalacademyedu.com/api",
                "agent_id": "agent-1",
                "agent_token": "secret",
                "tenant_slug": "acsa",
            }, path)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            config = AgentConfig.load(path)
            self.assertEqual(config.agent_id, "agent-1")
            self.assertEqual(config.api_url, "https://acsa.professionalacademyedu.com/api")
            self.assertEqual(config.tenant_slug, "acsa")

    def test_spool_persists_until_acknowledged(self):
        with tempfile.TemporaryDirectory() as temp:
            path = str(Path(temp) / "state.sqlite3")
            spool = EventSpool(path)
            record = {"uid": 2, "user_id": "1001", "timestamp": "2026-09-29T08:00:00", "status": 0, "punch": 0}
            self.assertTrue(spool.enqueue("device-a", record))
            self.assertFalse(spool.enqueue("device-a", record))
            batch = spool.pending()
            self.assertEqual(len(batch), 1)
            key = batch[0]["event_key"]
            spool.close()

            spool = EventSpool(path)
            self.assertEqual(spool.pending_count(), 1)
            spool.acknowledge(["not-a-real-key"])
            self.assertEqual(spool.pending_count(), 1)
            spool.acknowledge([key])
            self.assertEqual(spool.pending_count(), 0)
            self.assertFalse(spool.enqueue("device-a", record))
            spool.close()


if __name__ == "__main__":
    unittest.main()
