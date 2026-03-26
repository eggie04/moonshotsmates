# Moonshotsmates Deployment Repo

This repo is configured for the `moonshotsmates` Vercel project.

## What deploys

- `public/` contains the self-hosted static mirror of your Framer site.
- `vercel.json` contains routing/headers for Vercel.

Because this GitHub repo is connected to Vercel, pushes to `main` trigger production deploys.

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
