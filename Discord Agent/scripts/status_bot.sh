#!/usr/bin/env bash
set -euo pipefail

SERVICE="gui/$(id -u)/com.moonshots.firstmate"
if launchctl print "$SERVICE" 2>/dev/null | grep -q 'pid = '; then
  echo "running"
else
  echo "stopped"
fi
