# Website Framer Sync

This folder syncs local code components to your Framer project using the official `framer-api` package.

## Commands

- `npm run framer:check`: Verify API connectivity and report unpublished changes.
- `npm run framer:sync`: Sync local files in `FRAMER_CODE_DIR` to Framer code files.
- `npm run framer:publish`: Publish and deploy the current Framer project state.

## Environment

Required:

- `FRAMER_PROJECT_URL`
- `FRAMER_API_KEY`

Optional:

- `FRAMER_CODE_DIR` (default: `Framer/Code`)
- `FRAMER_REMOTE_PREFIX` (default: empty)
- `FRAMER_PUBLISH` (`1` to auto-publish after `framer:sync`)
- `FRAMER_ALLOW_OVERWRITE` (`1` to update existing remote code files)
