#!/usr/bin/env bash
set -euo pipefail

BOT_DIR="/Users/citadel/MoonshotsMates/Discord Agent"
PLIST_SRC="$BOT_DIR/launchd/com.moonshots.firstmate.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_DST="$LAUNCH_AGENTS_DIR/com.moonshots.firstmate.plist"
SERVICE="gui/$(id -u)/com.moonshots.firstmate"

mkdir -p "$BOT_DIR/data" "$LAUNCH_AGENTS_DIR"
cp "$PLIST_SRC" "$PLIST_DST"

launchctl bootout "$SERVICE" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
launchctl kickstart -k "$SERVICE"

echo "started:launchd"
