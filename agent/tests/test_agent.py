import tempfile
import unittest
from pathlib import Path

from erp_biometric_agent.config import AgentConfig, normalize_api_url, save_config
from erp_biometric_agent.state import EventSpool, event_key


class AgentTests(unittest.TestCase):
    def test_api_url_requires_https_except_localhost(self):
        self.assertEqual(normalize_api_url(" https://erp.example.com/api/ "), "https://erp.example.com/api")
        self.assertEqual(normalize_api_url("http://127.0.0.1:8000/api"), "http://127.0.0.1:8000/api")
        with self.assertRaises(ValueError):
            normalize_api_url("http://erp.example.com/api")

    def test_event_key_is_stable_and_device_scoped(self):
        record = {"uid": 2, "user_id": "1001", "timestamp": "2026-09-29T08:00:00", "status": 0, "punch": 0}
        self.assertEqual(event_key("device-a", record), event_key("device-a", dict(record)))
        self.assertNotEqual(event_key("device-a", record), event_key("device-b", record))

    def test_config_is_owner_only_and_loadable(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "private" / "config.json"
            save_config({"api_url": "https://erp.example.com/api", "agent_id": "agent-1", "agent_token": "secret"}, path)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            config = AgentConfig.load(path)
            self.assertEqual(config.agent_id, "agent-1")
            self.assertEqual(config.api_url, "https://erp.example.com/api")

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
