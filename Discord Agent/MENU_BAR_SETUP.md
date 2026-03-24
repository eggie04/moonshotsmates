# Menu Bar Command Center (SwiftBar)

This project includes a SwiftBar plugin to control the Discord bot from the macOS top bar.

## Installed files

- `scripts/moonshots-bot.15s.sh` (menu bar plugin)
- `scripts/start_bot.sh`
- `scripts/stop_bot.sh`
- `scripts/restart_bot.sh`
- `scripts/status_bot.sh`
- `scripts/install_swiftbar_plugin.sh`
- `scripts/uninstall_swiftbar_plugin.sh`

## One-time setup

1. Install SwiftBar:

```bash
brew install --cask swiftbar
```

2. Install plugin symlink:

```bash
"/Users/citadel/MoonshotsMates/Discord Agent/scripts/install_swiftbar_plugin.sh"
```

3. Open SwiftBar app.

You should see a `First Mate` icon in your menu bar with Start/Stop/Restart actions.

## Reinstall / remove plugin

- Reinstall plugin link:

```bash
"/Users/citadel/MoonshotsMates/Discord Agent/scripts/install_swiftbar_plugin.sh"
```

- Remove plugin link:

```bash
"/Users/citadel/MoonshotsMates/Discord Agent/scripts/uninstall_swiftbar_plugin.sh"
```
