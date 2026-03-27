#!/usr/bin/env bash
set -euo pipefail

BOT_DIR="/Users/citadel/Projects/MoonshotsMates/Discord Agent"
SCRIPTS_DIR="$BOT_DIR/scripts"
LOG_FILE="$BOT_DIR/data/bot.log"
STATUS="$("$SCRIPTS_DIR/status_bot.sh" || echo "stopped")"

if [[ "$STATUS" == "running" ]]; then
  echo "🚀 First Mate: ON | color=#22c55e"
else
  echo "🛑 First Mate: OFF | color=#ef4444"
fi

echo "---"
echo "Start Bot | bash='$SCRIPTS_DIR/start_bot.sh' terminal=false refresh=true"
echo "Stop Bot | bash='$SCRIPTS_DIR/stop_bot.sh' terminal=false refresh=true"
echo "Restart Bot | bash='$SCRIPTS_DIR/restart_bot.sh' terminal=false refresh=true"
echo "---"
echo "Open Log File | bash='open' param1='$LOG_FILE' terminal=false"
echo "Tail Log In Terminal | bash='osascript' param1='-e' param2='tell application \"Terminal\" to do script \"tail -f \\\"$LOG_FILE\\\"\"' terminal=false"
echo "Open Bot Folder | bash='open' param1='$BOT_DIR' terminal=false"
echo "---"
echo "Refresh Now | refresh=true"
