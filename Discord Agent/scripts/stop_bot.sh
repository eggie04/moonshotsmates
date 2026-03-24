#!/usr/bin/env bash
set -euo pipefail

SERVICE="gui/$(id -u)/com.moonshots.firstmate"
launchctl bootout "$SERVICE" >/dev/null 2>&1 || true

echo "stopped"
