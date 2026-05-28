# MoonshotsMates

MoonshotsMates is a small, production-oriented community system built around the MoonshotsMates site and Discord community. The repo combines a self-hosted Framer mirror, custom Framer/React code components, Vercel serverless APIs, and a Python Discord agent that uses AI to turn new episodes into community content and maintenance workflows.

The project is intentionally practical: it is not a demo app with a single happy path. It handles publishing, persistence, Discord automation, prompt fallbacks, Framer code sync, local service control, and production deploys from one repository.

## What This Repo Contains

- `public/` - Static mirror of the published Framer site deployed by Vercel.
- `api/` - Vercel Serverless API routes for simulator accounts and leaderboard persistence.
- `Website/Framer/Code/` - React/TypeScript code components used inside Framer.
- `Website/scripts/` - Framer API automation for syncing/publishing code components and generating latest-video data.
- `Discord Agent/` - Python Discord bot for episode recaps, discussion threads, daily memes, growth prompts, business idea posts, and video-carousel automation.
- `.github/workflows/` - GitHub Actions workflow that can keep the public static mirror in sync with the Framer publish.
- `scripts/` and `*.cmd` - Local publish helpers for pushing Framer/Vercel updates.

## Product Overview

MoonshotsMates has three connected surfaces:

1. The website, designed in Framer and deployed through Vercel.
2. A “Moonshot Simulator” with cross-device profiles, progression saves, and a leaderboard.
3. A Discord community agent that keeps the server active with recap posts, threads, memes, growth nudges, and business idea generation.

The goal was to make the community feel alive without requiring manual posting every day. New podcast/video activity can trigger AI-generated recap content, the latest-video carousel can update automatically, and the site can redeploy from GitHub.

## AI Usage

AI is used as a product feature and as a build accelerator.

In the product:

- Episode recaps are generated from RSS, YouTube, or Discord-posted episode links.
- Discussion questions are generated for each episode thread.
- Meme captions are generated, parsed into template fields, and rendered through external meme sources.
- Business idea prompts generate daily idea summaries and attached deeper plans.
- Growth prompts create non-spammy community calls to action.
- Each AI workflow has deterministic fallback copy so scheduled posts do not fail if an API provider is unavailable.

In the engineering workflow:

- The repo includes automation that turns agent-discovered episodes into Framer video carousel updates.
- The Discord bot can generate local data files, sync Framer code components, mirror the public Framer page, commit changed artifacts, and push updates.
- AI provider configuration is OpenAI-compatible, so the same code can use OpenAI, OpenRouter, Gemini-compatible endpoints, or local fallbacks.

The implementation is deliberately defensive: model calls have timeouts, retries, provider fallback behavior, parsing fallbacks, and admin alerts for failed automation.

## Architecture

### Website and Vercel

The Framer site is mirrored into `public/index.html` and served by Vercel. The API routes under `api/` provide persistence for the simulator:

- `POST /api/account` creates, loads, and saves profile progress.
- `GET /api/leaderboard` returns ranked simulator profiles.
- Vercel KV is used when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are configured.
- In-memory storage is used as a local/dev fallback.

### Framer Code Sync

The `Website/scripts` package uses the official `framer-api` package to:

- validate Framer API connectivity,
- sync local `.tsx` components into Framer,
- publish/deploy the Framer project,
- generate latest-video carousel data from the Discord agent SQLite state database.

### Discord Agent

The Discord agent is a Python service built with `discord.py`. It supports:

- RSS, YouTube page polling, or Discord-link-triggered episode detection,
- per-episode discussion threads,
- scheduled discussion, meme, growth, and business idea posts,
- configurable channel routing,
- SQLite-backed local state,
- file-lock based single-process protection,
- local macOS launchd and SwiftBar helper scripts.

## Security and Public Repo Notes

This repository is structured so secrets live in local `.env` files and deployment platform environment variables, not in Git.

Before making the repo public, I checked for:

- tracked `.env` files,
- token-shaped strings in the working tree,
- common private key patterns,
- API keys and Discord bot tokens,
- local runtime files such as `.db`, `.log`, and `.pid`.

The committed examples use placeholders. Real values should be configured through:

- `Discord Agent/.env` for local bot runs,
- `Website/.env` for Framer API sync,
- Vercel environment variables for production storage.

Important: the Git history contains earlier placeholder-style Discord invite/server examples. They are not bot tokens or API keys, but if any old invite URL is still active, revoke it before switching the GitHub repo to public.

## Running Locally

### Discord Agent

```bash
cd "Discord Agent"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python bot.py
```

### Website Automation

```bash
cd Website
npm install
npm run framer:check
npm run framer:sync
```

Required local environment variables are documented in `Website/README.md`.

## Deployment

This GitHub repository is connected to the `moonshotsmates` Vercel project. Pushing to `main` triggers a production deploy.

The helper scripts support two workflows:

- update the local public mirror from Framer without pushing,
- publish the mirror to production by committing and pushing changed files.

## Reviewer Guide

Good places to inspect:

- `Discord Agent/bot.py` for orchestration, scheduling, episode detection, AI fallbacks, and the auto-video pipeline.
- `Discord Agent/services/openai_client.py` for provider-agnostic AI helper logic and fallback content.
- `Discord Agent/services/config.py` for environment-driven configuration.
- `Website/scripts/framer-sync.mjs` for Framer API automation and retry behavior.
- `Website/scripts/generate-latest-videos.mjs` for turning bot state into Framer carousel data.
- `api/account.js` and `api/leaderboard.js` for the Vercel persistence layer.

## What This Demonstrates

- Building with AI as part of the product, not just as a coding assistant.
- Connecting Discord, Framer, GitHub, Vercel, and AI providers into one workflow.
- Designing fallbacks and operational controls for fragile external APIs.
- Keeping deployment and local automation simple enough to run without a large platform team.
- Using AI tooling to move quickly while still leaving a reviewable, understandable codebase.
