"""Command-line entry point."""

from __future__ import annotations

import argparse
import logging
import sys

from .config import DEFAULT_CONFIG_PATH, AgentConfig, pair_agent
from .service import Connector


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="erp-biometric-agent", description="Connect local ZKTeco terminals to ERP SaaS")
    commands = parser.add_subparsers(dest="command", required=True)
    pair = commands.add_parser("pair", help="redeem a one-time code from ERP settings")
    pair.add_argument("--api-url", required=True, help="ERP tenant API base URL, e.g. https://acsa.professionalacademyedu.com/api")
    pair.add_argument("--code", required=True, help="short-lived, single-use code generated in ERP")
    pair.add_argument("--tenant-slug", default=None, help="workspace slug; inferred from a tenant subdomain when omitted")
    commands.add_parser("check-config", help="validate the local paired-agent config")
    once = commands.add_parser("sync-once", help="read devices and send attendance once")
    once.add_argument("--interval", type=int, default=None)
    run = commands.add_parser("run", help="run continuously as a service")
    run.add_argument("--interval", type=int, default=None, help="poll interval in seconds (minimum 10)")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    try:
        if args.command == "pair":
            paired = pair_agent(args.api_url, args.code, tenant_slug=args.tenant_slug)
            tenant = f" for tenant {paired['tenant_slug']}" if paired.get("tenant_slug") else ""
            print(f"Paired successfully: agent {paired['agent_id']}{tenant} at {paired['api_url']}")
            print(f"Secret saved with owner-only permissions at {DEFAULT_CONFIG_PATH}")
            return
        config = AgentConfig.load()
        if args.command == "check-config":
            print(f"Configuration is valid for agent {config.agent_id}")
            print(f"ERP API: {config.api_url}")
            print(f"Local queue: {config.state_path}")
            return
        connector = Connector(config)
        try:
            if args.command == "sync-once":
                print(connector.run_once())
            elif args.command == "run":
                connector.run_forever(args.interval)
        finally:
            connector.close()
    except KeyboardInterrupt:
        print("\nConnector stopped")
    except Exception as exc:
        logging.error("%s", exc)
        sys.exit(1)
