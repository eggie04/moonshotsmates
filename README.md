# Moonshotsmates Deployment Repo

This repo is configured for the `moonshotsmates` Vercel project.

## What deploys

- `public/` contains the self-hosted static mirror of your Framer site.
- `vercel.json` contains routing/headers for Vercel.

Because this GitHub repo is connected to Vercel, pushes to `main` trigger production deploys.

## Moonshot simulator persistence

The simulator now uses Vercel Serverless API routes:

- `POST /api/account` for profile sign-in and profile progress saves (cross-device).
- `GET /api/leaderboard` for ranked signed-in users (paged, 10 per page by default).

Cross-device progress and leaderboard work with a simple profile model:

- Enter `Profile Name` + `PIN` in the widget.
- New profile names are auto-created on first sign-in.
- Reuse the same name+PIN on another device to load the same progress.
- Leaderboard updates automatically from signed-in account progress (`ideas` and `ideas/sec`).

For durable storage across deploys and instances, configure Vercel KV environment variables:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Without those variables, the API falls back to in-memory storage (not durable).

## One-click publish to prod

Double-click:

- `Publish Moonshots To Prod.cmd`

This does end-to-end:

1. Syncs latest published Framer output into `public/`.
2. Commits only when there are actual changes.
3. Pushes to `main` so Vercel auto-deploys prod.

## Update only (no git push)

Double-click:

- `Update Moonshots Site.cmd`

or run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update-moonshots-site.ps1
```

This does:

1. Runs your local `self-hosted-framer.exe` to stage from Framer URL.
2. Mirrors staged output into `public/`.
3. Copies staged `vercel.json` into repo root.

Then commit and push manually:

```powershell
git add public vercel.json scripts\update-moonshots-site.ps1 "Update Moonshots Site.cmd"
git commit -m "Update moonshotsmates mirror"
git push
```

Vercel will auto-deploy from the connected repo.
