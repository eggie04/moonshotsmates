# MoonshotsMates Discord Agent

This bot automates core community actions for MoonshotsMates:

- Posts an episode recap when a new item appears in your RSS feed
- Or polls a YouTube channel `/videos` page and recaps the newest upload
- Or posts recap when a new episode link is posted in your Discord episode channel
- Creates a dedicated thread for each episode recap and posts discussion questions in that thread
- Posts a daily meme
- Tracks daily joins and posts a growth update targeting 3 new users/day
- Posts a daily business idea generation summary with attached deep plans

## Important note on "adding 3 users per day"

Discord bots should not auto-add users or DM/spam people. This agent uses a compliant growth workflow instead:

- Tracks how many users joined today
- Posts a daily call-to-action to invite one friend
- Optionally includes a reusable invite link

## 1. Create Discord bot

1. Go to Discord Developer Portal and create an application + bot.
2. Enable `SERVER MEMBERS INTENT` in bot settings.
3. Invite bot to your server with permissions:
   - View Channels
   - Send Messages
   - Create Instant Invite (optional, for invite link generation)
   - Read Message History

## 2. Configure project

```bash
cd "Discord Agent"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill `.env`:

- `DISCORD_TOKEN` from Discord portal
- `DISCORD_INVITE_URL` (optional, used in growth prompts)
- Optional channel IDs for discussion/meme/growth/business ideas/admin alerts (defaults to `episode-discussion` where applicable)
- `EPISODE_SOURCE_MODE=discord` is recommended for your setup
- If `EPISODE_SOURCE_MODE=rss`, set `EPISODE_FEED_URL`
- If `EPISODE_SOURCE_MODE=youtube`, set `YOUTUBE_CHANNEL_URL` (example: `https://www.youtube.com/@peterdiamandis`)
- `AI_API_KEY` (optional; works with OpenAI-compatible providers)

### Free-tier API key option (recommended)

You can run AI generation with a free-tier key via OpenRouter:

1. Create key: https://openrouter.ai/keys
2. Set in `.env`:

```bash
AI_API_KEY=<your_openrouter_key>
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=openrouter/free
MEME_AI_MODEL=openrouter/free
IDEA_AI_MODEL=openrouter/free
```

If no AI key is set, bot still runs using built-in fallback templates.

### Optional: Increase Meme Template Pool (Imgflip + Giphy)

Meme source rotation always includes MemeGen + Imgflip.
You can expand the yearly no-repeat pool by adding:

```bash
GIPHY_API_KEY=your_giphy_key
```

If these keys are unset, the bot simply skips those sources.

### Alternative free-tier: Gemini

Gemini has an official API free tier with API key auth. Use:

```bash
AI_API_KEY=<your_google_ai_studio_key>
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
AI_MODEL=gemini-2.0-flash-lite
```

## 3. Run

```bash
python bot.py
```

## 4. Slash commands for testing

- `/post_recap_check`
- `/post_discussion_now`
- `/post_meme_now`
- `/post_growth_now`
- `/post_business_ideas_now`

## Schedule defaults

Timezone and schedule are configurable via `.env`:

- Discussion: `09:00`
- Meme: `12:00`
- Growth: `18:00`
- Business ideas: `11:00`
- Episode polling: every `30` minutes

## Intents required

In Discord Developer Portal, enable:

- `SERVER MEMBERS INTENT`
- `MESSAGE CONTENT INTENT` (needed for link-triggered recap in Discord mode)

## Deployment options

- Keep it simple: run on a small VPS with `tmux` or `systemd`
- Containerize later once prompts/workflows are stable

## Next upgrades

- Pull episode source from YouTube API if RSS is unavailable
- Add moderation-safe auto-replies in selected channels
- A/B test growth message templates and track conversion
