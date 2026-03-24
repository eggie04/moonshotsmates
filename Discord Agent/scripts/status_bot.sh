#!/usr/bin/env bash
set -euo pipefail

SERVICE="gui/$(id -u)/com.moonshots.firstmate"
if launchctl print "$SERVICE" >/dev/null 2>&1; then
  echo "running"
else
  echo "stopped"
fi
