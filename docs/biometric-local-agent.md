# ERP Local Biometric Agent (MVP)

This connector runs **inside the customer's private network**, reads ZKTeco attendance logs locally, and sends attendance events to that tenant's ERP API over HTTPS. The SaaS host does not open connections to `192.168.x.x` terminals. It does not read or upload fingerprint/face templates; only attendance punches are synced.

## Repository boundary

This Git repository contains the ERP web frontend and the Python connector. It does **not** contain the Laravel/API backend source. The UI and connector below rely on the API contract in this document; the backend routes, persistence, tenant authorization, and migrations must be implemented in the separate ERP backend before pairing or live sync can work. Do not mistake a successful frontend build or connector pairing for a production-ready server implementation.

The other supplied repository, `bakora28/student-system`, is the Quizaty exams application and is unrelated; it is not modified by this change.

## Install on a computer inside the LAN

Requirements: Python 3.10+, outbound HTTPS to the ERP URL, and TCP/UDP access from this computer to the configured ZKTeco terminal(s). Do not expose the terminal or agent to the public internet.

1. In **HR → Biometric Attendance → Local Agent**, generate a single-use pairing code. The code should expire after 10 minutes and be usable once only.
2. Copy the `agent/` folder to a computer that can reach the attendance device.
3. Install and pair (replace the URL with the company's actual ERP origin):

   ```bash
   python -m pip install ./agent
   erp-biometric-agent pair --api-url https://erp.example.com/api --code ONE_TIME_CODE
   erp-biometric-agent check-config
   erp-biometric-agent sync-once
   erp-biometric-agent run
   ```

4. In ERP → HR → Biometric Attendance → Devices, configure the terminal IP, port (normally `4370`), and TCP/UDP protocol. The paired agent discovers active devices through the tenant API.
5. Map each terminal's **User ID** to an ERP employee. Check sync status and queued events in the Local Agent tab.

The agent stores its bearer credential at `~/.config/erp-biometric-agent/config.json` with owner-only file permissions and stores a local SQLite retry queue under `~/.local/state/erp-biometric-agent/`, also with owner-only permissions. The queue is **not encrypted at rest**; protect the host and its backups. Revoke the agent token in ERP if that computer is lost or decommissioned. Never put the agent token in a browser, source control, or shared config file.

To run it unattended, use the operating system's service manager (for example, a dedicated Windows service wrapper or a Linux `systemd` unit) to run `erp-biometric-agent run` as a restricted service account. The agent itself does not install a service or elevate privileges.

## API contract required on the ERP backend

All paths below are relative to `/api`. JSON follows the Laravel app's usual `{ "data": ... }` envelope. All routes must be tenant-scoped from the authenticated ERP user or the paired agent credential; never trust a tenant ID supplied in request JSON.

| Method and path | Auth | Required behavior |
|---|---|---|
| `GET /biometric/agents` | ERP user session; HR/admin permission | List this tenant's agents with `id`, `name`, `status` (`online`, `degraded`, `offline`), `last_seen_at`, `version`, and `pending_events`. |
| `DELETE /biometric/agents/{id}` | ERP user session; HR/admin permission | Revoke only an agent belonging to this tenant; invalidate its token immediately and mark it revoked. |
| `POST /biometric/agents/pairing-codes` | ERP user session; HR/admin permission | Accept `{ "name": "..." }`; return `{ "data": { "code": "...", "expires_at": "ISO-8601" } }`. Generate high-entropy random code, persist only a hash, expire within 10 minutes, single-use, tenant-bound. |
| `POST /biometric/agents/pair` | One-time code only | Accept `{ "code": "..." }`; atomically redeem once; return `{ "data": { "agent_id": "...", "agent_token": "..." } }`. Return the random bearer token once; persist only its hash. |
| `GET /biometric/agents/devices` | Paired agent bearer | Return active devices for that same tenant as `{ "data": { "devices": [{ "id": "...", "name": "...", "ip_address": "...", "port": 4370, "protocol": "tcp", "is_active": true, "password": null }] } }`. Only send a device password if actually needed, and protect/log-redact it. |
| `POST /biometric/agents/events` | Paired agent bearer | Accept `{ "events": [...] }`; validate event count/size, ownership of each device and user mapping, then idempotently persist the accepted punches and update the ERP attendance view. Return `{ "data": { "accepted_event_keys": ["..."] } }`. Repeating a key must be harmless. |
| `POST /biometric/agents/heartbeat` | Paired agent bearer | Accept agent ID/version/status/device count/pending count and bounded per-device error summaries; derive tenant from token. Update `last_seen_at`. |

Expected event shape:

```json
{
  "event_key": "sha256-hex",
  "device_id": "tenant-device-id",
  "device_user_id": "1001",
  "timestamp": "2026-09-29T08:01:00",
  "status": 0,
  "punch": 0,
  "device_uid": 17
}
```

A production backend implementation should store agents, one-time pairing-code hashes, token hashes/scopes, and punch events; apply a unique constraint on `(tenant_id, event_key)` (or equivalent); authorize event/device/employee mappings within the same tenant; rate-limit pairing and ingestion; redact credentials; and expose no public unauthenticated device routes. The existing attendance table is a daily summary, so preserve raw punch events or use an equivalent idempotent event store before aggregating first-in/last-out. Do not overwrite a full day based on the order events arrive.

## Reliability and support notes

- Polling defaults to 30 seconds (minimum 10 seconds). After an API/device failure, the agent backs off up to five minutes.
- Punches are written to a local SQLite spool before upload; acknowledged records are removed only when the API explicitly returns their `accepted_event_keys`.
- A tenant should provision one agent on a stable always-on computer, preferably on wired LAN. Multiple agents may be used for separate isolated networks after backend support is implemented.
- Current device adapter is for ZKTeco terminals supported by `pyzk`. Other brands need a distinct driver/adapter.
- Test first with a non-production device and confirm timezone, duplicate handling, user mappings, and attendance aggregation in the ERP backend.
