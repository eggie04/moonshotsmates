from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class Settings:
    discord_token: str
    guild_id: int
    episode_channel_id: int
    discussion_channel_id: int
    meme_channel_id: int
    growth_channel_id: int
    business_idea_channel_id: int | None
    admin_channel_id: int | None
    timezone: str
    discussion_hour: int
    meme_hour: int
    growth_check_hour: int
    business_idea_hour: int
    episode_source_mode: str
    episode_feed_url: str | None
    youtube_channel_url: str | None
    episode_poll_minutes: int
    ai_api_key: str | None
    ai_model: str
    meme_ai_model: str
    idea_ai_model: str
    ai_base_url: str | None
    giphy_api_key: str | None
    invite_channel_id: int | None
    discord_invite_url: str | None
    auto_video_pipeline_enabled: bool
    auto_video_push_enabled: bool
    auto_video_framer_sync_enabled: bool


@dataclass(frozen=True)
class InviteMetadata:
    guild_id: int | None
    channel_id: int | None
    invite_url: str | None



def _required_int(name: str) -> int:
    value = os.getenv(name)
    if value is None:
        raise ValueError(f"Missing required env var: {name}")
    return int(value)



def _optional_int(name: str) -> int | None:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return None
    return int(value)



def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return int(value)


def _get_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}



def _parse_invite_code(invite: str) -> str | None:
    invite = invite.strip()
    if not invite:
        return None

    if re.fullmatch(r"[A-Za-z0-9-]+", invite):
        return invite

    match = re.search(r"discord(?:app)?\.(?:gg|com/invite)/([A-Za-z0-9-]+)", invite)
    if match:
        return match.group(1)
    return None



def _resolve_invite_metadata(invite: str | None) -> InviteMetadata:
    if not invite:
        return InviteMetadata(guild_id=None, channel_id=None, invite_url=None)

    code = _parse_invite_code(invite)
    if not code:
        return InviteMetadata(guild_id=None, channel_id=None, invite_url=invite)

    api_url = f"https://discord.com/api/v10/invites/{code}?with_counts=true&with_expiration=true"
    request = Request(api_url, headers={"User-Agent": "MoonshotsMatesDiscordAgent/1.0"})

    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return InviteMetadata(guild_id=None, channel_id=None, invite_url=f"https://discord.gg/{code}")

    guild_id_raw = payload.get("guild_id") or (payload.get("guild") or {}).get("id")
    channel_id_raw = (payload.get("channel") or {}).get("id")

    guild_id = int(guild_id_raw) if guild_id_raw else None
    channel_id = int(channel_id_raw) if channel_id_raw else None
    invite_url = f"https://discord.gg/{code}"
    return InviteMetadata(guild_id=guild_id, channel_id=channel_id, invite_url=invite_url)



def load_settings() -> Settings:
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        raise ValueError("Missing required env var: DISCORD_TOKEN")

    invite_raw = os.getenv("DISCORD_INVITE_URL")
    invite_meta = _resolve_invite_metadata(invite_raw)

    guild_id = _optional_int("DISCORD_GUILD_ID") or invite_meta.guild_id
    if guild_id is None:
        raise ValueError("Set DISCORD_GUILD_ID or DISCORD_INVITE_URL")

    episode_channel_id = _optional_int("DISCORD_EPISODE_CHANNEL_ID") or invite_meta.channel_id
    if episode_channel_id is None:
        raise ValueError("Set DISCORD_EPISODE_CHANNEL_ID or provide DISCORD_INVITE_URL with a channel")

    discussion_channel_id = _optional_int("DISCORD_DISCUSSION_CHANNEL_ID") or episode_channel_id
    meme_channel_id = _optional_int("DISCORD_MEME_CHANNEL_ID") or discussion_channel_id
    growth_channel_id = _optional_int("DISCORD_GROWTH_CHANNEL_ID") or discussion_channel_id
    business_idea_channel_id = _optional_int("DISCORD_BUSINESS_IDEA_CHANNEL_ID")
    admin_channel_id = _optional_int("DISCORD_ADMIN_CHANNEL_ID")

    episode_source_mode = os.getenv("EPISODE_SOURCE_MODE", "discord").strip().lower()
    if episode_source_mode not in {"discord", "rss", "youtube"}:
        raise ValueError("EPISODE_SOURCE_MODE must be 'discord', 'rss', or 'youtube'")

    feed_url = os.getenv("EPISODE_FEED_URL", "").strip() or None
    if episode_source_mode == "rss" and not feed_url:
        raise ValueError("EPISODE_FEED_URL is required when EPISODE_SOURCE_MODE=rss")
    youtube_channel_url = os.getenv("YOUTUBE_CHANNEL_URL", "").strip() or None
    if episode_source_mode == "youtube" and not youtube_channel_url:
        raise ValueError("YOUTUBE_CHANNEL_URL is required when EPISODE_SOURCE_MODE=youtube")

    invite_channel_id = _optional_int("INVITE_CHANNEL_ID")

    return Settings(
        discord_token=token,
        guild_id=guild_id,
        episode_channel_id=episode_channel_id,
        discussion_channel_id=discussion_channel_id,
        meme_channel_id=meme_channel_id,
        growth_channel_id=growth_channel_id,
        business_idea_channel_id=business_idea_channel_id,
        admin_channel_id=admin_channel_id,
        timezone=os.getenv("TIMEZONE", "America/Chicago"),
        discussion_hour=_get_int("DISCUSSION_HOUR", default=9),
        meme_hour=_get_int("MEME_HOUR", default=12),
        growth_check_hour=_get_int("GROWTH_CHECK_HOUR", default=18),
        business_idea_hour=_get_int("BUSINESS_IDEA_HOUR", default=11),
        episode_source_mode=episode_source_mode,
        episode_feed_url=feed_url,
        youtube_channel_url=youtube_channel_url,
        episode_poll_minutes=_get_int("EPISODE_POLL_MINUTES", default=30),
        ai_api_key=(os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY") or "").strip() or None,
        ai_model=(os.getenv("AI_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4.1-mini").strip(),
        meme_ai_model=(os.getenv("MEME_AI_MODEL") or os.getenv("AI_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4.1-mini").strip(),
        idea_ai_model=(
            os.getenv("IDEA_AI_MODEL")
            or os.getenv("MEME_AI_MODEL")
            or os.getenv("AI_MODEL")
            or os.getenv("OPENAI_MODEL")
            or "gpt-4.1-mini"
        ).strip(),
        ai_base_url=(os.getenv("AI_BASE_URL") or "").strip() or None,
        giphy_api_key=(os.getenv("GIPHY_API_KEY") or "").strip() or None,
        invite_channel_id=invite_channel_id,
        discord_invite_url=invite_meta.invite_url,
        auto_video_pipeline_enabled=_get_bool("AUTO_VIDEO_PIPELINE_ENABLED", True),
        auto_video_push_enabled=_get_bool("AUTO_VIDEO_PUSH_ENABLED", True),
        auto_video_framer_sync_enabled=_get_bool("AUTO_VIDEO_FRAMER_SYNC_ENABLED", True),
    )
