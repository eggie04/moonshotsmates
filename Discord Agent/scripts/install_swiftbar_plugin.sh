#!/usr/bin/env bash
set -euo pipefail

BOT_DIR="/Users/citadel/MoonshotsMates/Discord Agent"
PLUGIN_SRC="$BOT_DIR/scripts/moonshots-bot.15s.sh"
SWIFTBAR_DIR="$HOME/Library/Application Support/SwiftBar/Plugins"
PLUGIN_DST="$SWIFTBAR_DIR/moonshots-bot.15s.sh"

mkdir -p "$SWIFTBAR_DIR"
ln -sf "$PLUGIN_SRC" "$PLUGIN_DST"

echo "installed:$PLUGIN_DST"
