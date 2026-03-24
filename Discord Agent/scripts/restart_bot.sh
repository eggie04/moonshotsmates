#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/stop_bot.sh" >/dev/null 2>&1 || true
sleep 1
"$SCRIPT_DIR/start_bot.sh"
