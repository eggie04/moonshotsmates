#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_SRC="$BOT_DIR/scripts/moonshots-bot.15s.sh"
SWIFTBAR_DIR="$HOME/Library/Application Support/SwiftBar/Plugins"
PLUGIN_DST="$SWIFTBAR_DIR/moonshots-bot.15s.sh"

mkdir -p "$SWIFTBAR_DIR"
ln -sf "$PLUGIN_SRC" "$PLUGIN_DST"

echo "installed:$PLUGIN_DST"
