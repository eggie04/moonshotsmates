from __future__ import annotations

import asyncio
import fcntl
import html
import io
import logging
import os
import random
import re
import shlex
import subprocess
from urllib.request import Request, urlopen
from urllib.parse import quote, urlparse
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import aiohttp
import discord
import feedparser
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from discord import app_commands
from discord.ext import commands
from dotenv import load_dotenv

from services.config import Settings, load_settings
from services.openai_client import (
    AiHelper,
    fallback_discussion_question,
    fallback_episode_recap,
    fallback_growth_prompt,
    fallback_meme_caption,
)
from services.state import StateStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("moonshotsmates-discord-agent")

URL_PATTERN = re.compile(r"https?://\S+")
MEMEGEN_TEMPLATES_URL = "https://api.memegen.link/templates/"
IMGFLIP_MEMES_URL = "https://api.imgflip.com/get_memes"
# Fallback shortlist if template catalog is unavailable.
FALLBACK_MEME_TEMPLATE_IDS = [
    "drake",
    "two-buttons",
    "distracted-boyfriend",
    "rollsafe",
    "one-does-not-simply",
    "fry",
    "grumpycat",
    "disaster-girl",
    "ancient-aliens",
    "batman-slapping-robin",
]
THREAD_NAME_MAX_LENGTH = 100


class MoonshotsMatesBot(commands.Bot):
    def __init__(self, settings: Settings) -> None:
        intents = discord.Intents.default()
        intents.guilds = True
        intents.members = True
        intents.message_content = True

        super().__init__(command_prefix="!", intents=intents)
        self.settings = settings
        self.state = StateStore()
        self.ai = AiHelper(settings.ai_api_key, settings.ai_model, settings.ai_base_url)
        self.scheduler = AsyncIOScheduler(timezone=settings.timezone)
        self._ready_once = False
        self._meme_template_candidates: list[tuple[str, str]] = []
        self._auto_video_pipeline_lock = asyncio.Lock()
        self._repo_root = Path(__file__).resolve().parents[1]
        self._website_dir = self._repo_root / "Website"

    async def setup_hook(self) -> None:
        guild_obj = discord.Object(id=self.settings.guild_id)
        self.tree.copy_global_to(guild=guild_obj)
        await self.tree.sync(guild=guild_obj)

        self._register_jobs()
        self.scheduler.start()

    def _register_jobs(self) -> None:
        tz = self.settings.timezone
        self.scheduler.add_job(
            self.post_daily_discussion,
            CronTrigger(hour=self.settings.discussion_hour, minute=0, timezone=tz),
            id="daily_discussion",
            replace_existing=True,
        )
        self.scheduler.add_job(
            self.post_daily_meme,
            CronTrigger(hour=self.settings.meme_hour, minute=0, timezone=tz),
            id="daily_meme",
            replace_existing=True,
        )
        self.scheduler.add_job(
            self.post_daily_growth_update,
            CronTrigger(hour=self.settings.growth_check_hour, minute=0, timezone=tz),
            id="daily_growth",
            replace_existing=True,
        )
        self.scheduler.add_job(
            self.post_daily_business_ideas,
            CronTrigger(hour=self.settings.business_idea_hour, minute=0, timezone=tz),
            id="daily_business_ideas",
            replace_existing=True,
        )

        if self.settings.episode_source_mode in {"rss", "youtube"}:
            self.scheduler.add_job(
                self.check_new_episode,
                "interval",
                minutes=self.settings.episode_poll_minutes,
                id="episode_poll",
                replace_existing=True,
            )

    async def on_ready(self) -> None:
        if not self._ready_once:
            logger.info("Bot is online as %s", self.user)
            logger.info("Episode source mode: %s", self.settings.episode_source_mode)
            self._ready_once = True

    async def on_member_join(self, member: discord.Member) -> None:
        if member.guild.id != self.settings.guild_id:
            return
        joined_date = datetime.now(ZoneInfo(self.settings.timezone)).date().isoformat()
        self.state.record_join(member.id, joined_date)

    async def on_message(self, message: discord.Message) -> None:
        if message.author.bot:
            return
        if not message.guild or message.guild.id != self.settings.guild_id:
            return

        if (
            self.settings.episode_source_mode == "discord"
            and message.channel.id == self.settings.episode_channel_id
        ):
            url = self._extract_first_url(message.content)
            if url:
                await self._post_recap_from_discord_link(url, message.id)

        await self.process_commands(message)

    async def _get_text_channel(self, channel_id: int) -> discord.TextChannel | None:
        channel = self.get_channel(channel_id)
        if channel is None:
            try:
                fetched = await self.fetch_channel(channel_id)
            except discord.DiscordException:
                return None
            if isinstance(fetched, discord.TextChannel):
                return fetched
            return None
        if isinstance(channel, discord.TextChannel):
            return channel
        return None

    async def _build_invite_url(self) -> str | None:
        if self.settings.discord_invite_url:
            return self.settings.discord_invite_url

        target_channel_id = self.settings.invite_channel_id or self.settings.growth_channel_id
        channel = await self._get_text_channel(target_channel_id)
        if not channel:
            return None

        try:
            invite = await channel.create_invite(max_age=0, max_uses=0, unique=False, reason="Daily growth post")
            return invite.url
        except discord.DiscordException:
            return None

    @staticmethod
    def _build_episode_thread_name(title: str) -> str:
        cleaned = re.sub(r"\s+", " ", (title or "").strip())
        if not cleaned:
            return "Episode discussion"

        if re.match(r"^\d{1,5}\s*\|", cleaned):
            return cleaned[:THREAD_NAME_MAX_LENGTH].rstrip()

        # Prefer explicit markers like "EP #242" or "Episode 242" to avoid
        # accidentally using unrelated numbers (for example "$5 Trillion").
        ep_tag = re.search(r"\bEP(?:ISODE)?\.?\s*#?\s*(\d{1,5})\b", cleaned, flags=re.IGNORECASE)
        if ep_tag:
            episode_num = ep_tag.group(1)
            rest = f"{cleaned[:ep_tag.start()]} {cleaned[ep_tag.end():]}".strip()
            rest = re.sub(r"\s+", " ", rest)
            rest = re.sub(r"^\s*[-|:]\s*", "", rest)
            rest = re.sub(r"\s*[-|:]\s*$", "", rest)
            if rest:
                return f"{episode_num}| {rest}"[:THREAD_NAME_MAX_LENGTH].rstrip()
            return f"{episode_num}| Episode discussion"

        match = re.match(r"^(?:episode\s*)?#?(\d{1,5})\s*[:|\-]\s*(.+)$", cleaned, flags=re.IGNORECASE)
        if match:
            episode_num, rest = match.group(1), match.group(2).strip()
            return f"{episode_num}| {rest}"[:THREAD_NAME_MAX_LENGTH].rstrip()

        # Also support suffix formats like "Title ... | 241".
        match = re.match(r"^(.+?)\s*[:|\-]\s*(\d{1,5})$", cleaned, flags=re.IGNORECASE)
        if match:
            rest, episode_num = match.group(1).strip(), match.group(2)
            if rest:
                return f"{episode_num}| {rest}"[:THREAD_NAME_MAX_LENGTH].rstrip()
            return f"{episode_num}| Episode discussion"

        return cleaned[:THREAD_NAME_MAX_LENGTH].rstrip()

    async def _get_latest_episode_thread(self) -> discord.Thread | None:
        thread_id = self.state.get_latest_episode_thread_id()
        if not thread_id:
            return None

        channel = self.get_channel(thread_id)
        if isinstance(channel, discord.Thread):
            return channel

        try:
            fetched = await self.fetch_channel(thread_id)
        except discord.DiscordException:
            return None
        if isinstance(fetched, discord.Thread):
            return fetched
        return None

    async def _generate_discussion_question(self) -> str:
        question = await asyncio.to_thread(self.ai.generate_discussion_question)
        return question or fallback_discussion_question()

    async def _post_episode_with_thread(
        self,
        channel: discord.TextChannel,
        title: str,
        recap: str,
        link: str,
        heading: str = "🚀 **New MoonshotsMates Episode**",
    ) -> None:
        episode_message = await channel.send(f"{heading}\n\n{recap}\n\n🔗 {link}")
        thread_name = self._build_episode_thread_name(title)

        try:
            thread = await episode_message.create_thread(name=thread_name, reason="Episode discussion thread")
        except discord.DiscordException as exc:
            logger.warning("Could not create episode thread for '%s': %s", title, exc)
            return

        self.state.set_latest_episode_thread_id(thread.id)

    async def _send_admin_alert(self, heading: str, details: str) -> None:
        channel_id = self.settings.admin_channel_id or self.settings.growth_channel_id

        channel = await self._get_text_channel(channel_id)
        if not channel:
            logger.warning("Admin alert channel not found")
            return

        timestamp = datetime.now(ZoneInfo(self.settings.timezone)).isoformat(timespec="seconds")
        body = (
            f"⚠️ **{heading}**\n"
            f"Time: `{timestamp}`\n"
            f"```text\n{(details or 'No details provided')[:1500]}\n```"
        )
        await channel.send(body[:1900])

    def _run_shell(self, command: str, cwd: Path) -> str:
        result = subprocess.run(
            ["/bin/zsh", "-lc", command],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"Command failed ({result.returncode}): {command}\n"
                f"stdout: {result.stdout.strip()}\n"
                f"stderr: {result.stderr.strip()}"
        )
        return result.stdout.strip()

    def _sync_public_mirror_from_framer(self) -> bool:
        source_url = (os.getenv("FRAMER_PUBLIC_MIRROR_URL") or "https://moonshotsmates.framer.ai/").strip()
        target_file = self._repo_root / "public" / "index.html"
        request = Request(source_url, headers={"User-Agent": "MoonshotsMatesBot/1.0"})
        with urlopen(request, timeout=30) as response:
            html_doc = response.read().decode("utf-8", errors="ignore")

        html_doc = re.sub(
            r'(?<!https://)(?<!http://)(?<!//)framerusercontent\.com/',
            "https://framerusercontent.com/",
            html_doc,
            flags=re.IGNORECASE,
        )
        html_doc = re.sub(
            r'<script id="self-hosted-framer-hide-badge-script">[\s\S]*?</script>',
            "",
            html_doc,
            flags=re.IGNORECASE,
        )

        badge_css = """
<style id="self-hosted-framer-hide-badge">
  #__framer-badge-container,
  .__framer-badge,
  [aria-label="Made in Framer"] {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
</style>
""".strip()

        if 'id="self-hosted-framer-hide-badge"' not in html_doc:
            if re.search(r"</head>", html_doc, flags=re.IGNORECASE):
                html_doc = re.sub(r"</head>", f"{badge_css}\n</head>", html_doc, count=1, flags=re.IGNORECASE)
            else:
                html_doc = f"{badge_css}\n{html_doc}"

        if not re.match(r"^\s*<!doctype html>", html_doc, flags=re.IGNORECASE):
            html_doc = "<!doctype html>\n" + html_doc.lstrip()

        previous = target_file.read_text(encoding="utf-8") if target_file.exists() else ""
        if previous == html_doc:
            return False

        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_text(html_doc, encoding="utf-8")
        return True

    def _run_auto_video_pipeline_sync(self, guid: str, title: str) -> None:
        if not self.settings.auto_video_pipeline_enabled:
            return

        tracked_files = [
            "Website/Framer/Code/MoonshotsLatestVideos_data.ts",
            "Website/Framer/Code/MoonshotsCarouselDrop.tsx",
            "public/index.html",
        ]

        self._run_shell("node scripts/generate-latest-videos.mjs", self._website_dir)

        if self.settings.auto_video_framer_sync_enabled:
            try:
                # Force publish during automated pipeline so Framer updates are
                # deployable even when publish env vars are not set globally.
                self._run_shell("FRAMER_PUBLISH=1 npm run framer:sync", self._website_dir)
            except Exception as exc:
                logger.warning("Auto video pipeline: Framer sync/publish failed: %s", exc)

        try:
            mirror_changed = self._sync_public_mirror_from_framer()
            logger.info("Auto video pipeline: public mirror %s.", "updated" if mirror_changed else "already current")
        except Exception as exc:
            logger.warning("Auto video pipeline: mirror sync from Framer failed: %s", exc)

        quoted_files = " ".join(shlex.quote(path) for path in tracked_files)
        self._run_shell(f"git add {quoted_files}", self._repo_root)

        diff_status = subprocess.run(
            ["/bin/zsh", "-lc", f"git diff --cached --quiet -- {quoted_files}"],
            cwd=str(self._repo_root),
            capture_output=True,
            text=True,
            check=False,
        ).returncode

        if diff_status == 0:
            logger.info("Auto video pipeline: no carousel data changes to commit.")
            return
        if diff_status != 1:
            raise RuntimeError("Auto video pipeline: failed checking staged diff status.")

        topic = re.sub(r"\s+", " ", title).strip()[:80]
        commit_message = f"auto: update latest videos for {topic or guid}"
        self._run_shell(
            f"git commit -m {shlex.quote(commit_message)} -- {quoted_files}",
            self._repo_root,
        )

        if self.settings.auto_video_push_enabled:
            try:
                self._run_shell("git push origin main", self._repo_root)
            except RuntimeError as exc:
                # Recover from non-fast-forward updates when remote main moved ahead.
                # Rebase this local auto-commit on latest origin/main, then retry push.
                error_text = str(exc).lower()
                push_race = (
                    "failed to push some refs" in error_text
                    or "fetch first" in error_text
                    or "non-fast-forward" in error_text
                )
                if not push_race:
                    raise
                logger.warning("Auto video pipeline: push rejected; rebasing on origin/main and retrying.")
                self._run_shell("git pull --rebase --autostash origin main", self._repo_root)
                self._run_shell("git push origin main", self._repo_root)
            logger.info("Auto video pipeline: pushed carousel update to origin/main.")
        else:
            logger.info("Auto video pipeline: push disabled by AUTO_VIDEO_PUSH_ENABLED.")

    async def _run_auto_video_pipeline(self, guid: str, title: str) -> None:
        async with self._auto_video_pipeline_lock:
            try:
                await asyncio.to_thread(self._run_auto_video_pipeline_sync, guid, title)
            except Exception as exc:
                logger.warning("Auto video pipeline failed for %s: %s", guid, exc)
                try:
                    await self._send_admin_alert(
                        "Auto Video Pipeline Failed",
                        f"guid={guid}\ntitle={title}\nerror={exc}",
                    )
                except Exception as alert_exc:
                    logger.warning("Failed to deliver admin alert: %s", alert_exc)

    async def _post_recap_from_discord_link(self, url: str, message_id: int) -> None:
        channel = await self._get_text_channel(self.settings.episode_channel_id)
        if not channel:
            return

        guid = f"discord-msg:{message_id}"
        if self.state.has_episode(guid):
            return

        title, description = await self._fetch_link_metadata(url)
        title = title or "New Episode"
        description = description or f"A new episode link was posted in <#{self.settings.episode_channel_id}>."

        recap = await asyncio.to_thread(self.ai.generate_episode_recap, title, description, url)
        if not recap:
            recap = fallback_episode_recap(title, description, url)

        await self._post_episode_with_thread(
            channel=channel,
            title=title,
            recap=recap,
            link=url,
            heading="🚀 **New MoonshotsMates Episode Recap**",
        )
        self.state.save_episode(guid, title)
        await self._run_auto_video_pipeline(guid, title)
        logger.info("Posted recap from Discord link: %s", url)

    async def check_new_episode(self) -> None:
        if self.settings.episode_source_mode == "youtube":
            await self._check_new_episode_youtube()
            return

        if self.settings.episode_source_mode != "rss":
            return

        channel = await self._get_text_channel(self.settings.episode_channel_id)
        if not channel:
            logger.warning("Episode channel not found")
            return

        feed_url = self.settings.episode_feed_url
        if not feed_url:
            logger.warning("RSS mode enabled but EPISODE_FEED_URL is empty")
            return

        try:
            feed = await asyncio.to_thread(feedparser.parse, feed_url)
        except Exception as exc:
            logger.exception("Failed to parse feed: %s", exc)
            return

        entries = feed.entries or []
        if not entries:
            return

        newest = entries[0]
        guid_raw = getattr(newest, "id", "") or getattr(newest, "link", "")
        if not guid_raw:
            return
        guid = f"rss:{guid_raw}"

        if self.state.has_episode(guid):
            return

        # First run bootstrap per RSS source: store latest item and avoid posting historical content.
        if not self.state.has_any_episodes_with_prefix("rss:"):
            self.state.save_episode(guid, getattr(newest, "title", "Episode"))
            logger.info("Episode tracker initialized with latest RSS item; no recap posted.")
            return

        title = getattr(newest, "title", "New Episode")
        raw_desc = getattr(newest, "summary", "") or getattr(newest, "description", "")
        description = self._clean_html(raw_desc)
        link = getattr(newest, "link", feed_url)

        recap = await asyncio.to_thread(self.ai.generate_episode_recap, title, description, link)
        if not recap:
            recap = fallback_episode_recap(title, description, link)

        await self._post_episode_with_thread(channel=channel, title=title, recap=recap, link=link)
        self.state.save_episode(guid, title)
        await self._run_auto_video_pipeline(guid, title)
        logger.info("Posted recap for RSS episode: %s", title)

    async def _check_new_episode_youtube(self) -> None:
        channel = await self._get_text_channel(self.settings.episode_channel_id)
        if not channel:
            logger.warning("Episode channel not found")
            return

        channel_url = self.settings.youtube_channel_url
        if not channel_url:
            logger.warning("YouTube mode enabled but YOUTUBE_CHANNEL_URL is empty")
            return

        latest = await self._fetch_latest_youtube_video(channel_url)
        if not latest:
            logger.warning("Could not resolve latest YouTube video from channel page")
            return

        video_id, link, title_guess = latest
        guid = f"youtube:{video_id}"
        if self.state.has_episode(guid):
            return

        if not self.state.has_any_episodes_with_prefix("youtube:"):
            self.state.save_episode(guid, title_guess or "Episode")
            logger.info("Episode tracker initialized with latest YouTube item; no recap posted.")
            return

        title, description = await self._fetch_link_metadata(link)
        title = title or title_guess or "New Episode"
        description = description or "A new YouTube episode is live."

        recap = await asyncio.to_thread(self.ai.generate_episode_recap, title, description, link)
        if not recap:
            recap = fallback_episode_recap(title, description, link)

        await self._post_episode_with_thread(channel=channel, title=title, recap=recap, link=link)
        self.state.save_episode(guid, title)
        await self._run_auto_video_pipeline(guid, title)
        logger.info("Posted recap for YouTube episode: %s", title)

    async def build_latest_recap_preview(self) -> tuple[str, str]:
        """Build preview recap text for the latest source item without posting."""
        mode = self.settings.episode_source_mode
        if mode == "youtube":
            channel_url = self.settings.youtube_channel_url
            if not channel_url:
                return "", "YouTube mode is enabled, but `YOUTUBE_CHANNEL_URL` is empty."

            latest = await self._fetch_latest_youtube_video(channel_url)
            if not latest:
                return "", "Could not resolve latest video from the configured YouTube channel."
            _, link, title_guess = latest
            title, description = await self._fetch_link_metadata(link)
            title = title or title_guess or "New Episode"
            description = description or "A new YouTube episode is live."
            recap = await asyncio.to_thread(self.ai.generate_episode_recap, title, description, link)
            recap = recap or fallback_episode_recap(title, description, link)
            message = f"🚀 **New MoonshotsMates Episode**\n\n{recap}\n\n🔗 {link}"
            return message, ""

        if mode == "rss":
            feed_url = self.settings.episode_feed_url
            if not feed_url:
                return "", "RSS mode is enabled, but `EPISODE_FEED_URL` is empty."
            try:
                feed = await asyncio.to_thread(feedparser.parse, feed_url)
            except Exception as exc:
                return "", f"Failed to parse RSS feed: {exc}"
            entries = feed.entries or []
            if not entries:
                return "", "No entries found in RSS feed."
            newest = entries[0]
            title = getattr(newest, "title", "New Episode")
            raw_desc = getattr(newest, "summary", "") or getattr(newest, "description", "")
            description = self._clean_html(raw_desc)
            link = getattr(newest, "link", feed_url)
            recap = await asyncio.to_thread(self.ai.generate_episode_recap, title, description, link)
            recap = recap or fallback_episode_recap(title, description, link)
            message = f"🚀 **New MoonshotsMates Episode**\n\n{recap}\n\n🔗 {link}"
            return message, ""

        # discord mode: inspect recent messages in episode channel and use latest URL
        channel = await self._get_text_channel(self.settings.episode_channel_id)
        if not channel:
            return "", "Episode channel not found."
        async for msg in channel.history(limit=25):
            if msg.author.bot:
                continue
            url = self._extract_first_url(msg.content)
            if not url:
                continue
            title, description = await self._fetch_link_metadata(url)
            title = title or "New Episode"
            description = description or f"A new episode link was posted in <#{self.settings.episode_channel_id}>."
            recap = await asyncio.to_thread(self.ai.generate_episode_recap, title, description, url)
            recap = recap or fallback_episode_recap(title, description, url)
            message = f"🚀 **New MoonshotsMates Episode Recap**\n\n{recap}\n\n🔗 {url}"
            return message, ""

        return "", "No recent episode URL found in episode channel history."

    async def post_daily_discussion(self) -> None:
        # Daily discussion should always be a fresh post in the main episode
        # discussion channel, not inside episode threads.
        channel = await self._get_text_channel(self.settings.episode_channel_id)
        question = await self._generate_discussion_question()

        if not channel:
            logger.warning("Episode discussion channel not found for daily discussion post")
            return
        await channel.send(f"💬 **Daily Discussion Question**\n{question}")

    async def post_daily_meme(self, manual: bool = False) -> None:
        channel = await self._get_text_channel(self.settings.meme_channel_id)
        if not channel:
            logger.warning("Meme channel not found")
            return

        if (not manual) and await self._has_recent_meme_post(channel):
            logger.info("Recent meme already posted; skipping duplicate meme post.")
            return

        built = await self._build_generated_meme_file()
        if not built:
            logger.warning("Could not build generated meme image; skipping meme post")
            return
        meme_file, signature, template_id = built

        await channel.send(file=meme_file)
        if signature:
            self.state.save_meme_signature(signature)
        if template_id:
            current_year = datetime.now(ZoneInfo(self.settings.timezone)).year
            self.state.save_meme_template_for_year(current_year, template_id)

    async def _has_recent_meme_post(self, channel: discord.TextChannel, window_seconds: int = 120) -> bool:
        me = self.user
        if not me:
            return False

        async for msg in channel.history(limit=10):
            if msg.author.id != me.id:
                continue
            age_seconds = (datetime.now(tz=msg.created_at.tzinfo) - msg.created_at).total_seconds()
            if age_seconds > window_seconds:
                return False
            if msg.attachments:
                return True
        return False

    async def _build_meme_topic_context(self) -> str:
        if self.settings.youtube_channel_url:
            latest = await self._fetch_latest_youtube_video(self.settings.youtube_channel_url)
            if latest:
                _, link, title_guess = latest
                title, description = await self._fetch_link_metadata(link)
                title = title or title_guess or "Latest upload"
                description = description or "No description available."
                return f"Title: {title}\nDescription: {description}\nLink: {link}"

        if self.settings.episode_feed_url:
            try:
                feed = await asyncio.to_thread(feedparser.parse, self.settings.episode_feed_url)
                entries = feed.entries or []
                if entries:
                    newest = entries[0]
                    title = getattr(newest, "title", "Latest entry")
                    raw_desc = getattr(newest, "summary", "") or getattr(newest, "description", "")
                    description = self._clean_html(raw_desc)
                    link = getattr(newest, "link", self.settings.episode_feed_url)
                    return f"Title: {title}\nDescription: {description}\nLink: {link}"
            except Exception:
                pass

        return "Recent topic context unavailable. Use current AI/exponential tech themes."

    async def _build_generated_meme_file(self) -> tuple[discord.File, str, str] | None:
        topic_context = await self._build_meme_topic_context()
        final_candidate: tuple[discord.File, str, str] | None = None
        current_year = datetime.now(ZoneInfo(self.settings.timezone)).year
        used_templates = self.state.used_meme_templates_for_year(current_year)

        for attempt in range(5):
            raw = await asyncio.to_thread(self.ai.generate_meme_caption, topic_context, self.settings.meme_ai_model)
            _, top_text, bottom_text = self._parse_meme_fields(raw or "")
            if not top_text and not bottom_text:
                _, top_text, bottom_text = self._parse_meme_fields(fallback_meme_caption())

            template_key, template_payload = await self._pick_meme_template(used_templates)
            signature = self._meme_signature(template_key, top_text, bottom_text)
            meme_url = self._build_meme_image_url(template_key, template_payload, top_text, bottom_text)
            meme_file = await self._download_image_as_file(meme_url, "meme.png")
            if not meme_file:
                continue

            # Prefer never-before-posted memes, but allow fallback after retries.
            if not self.state.has_meme_signature(signature):
                used_templates.add(template_key)
                return meme_file, signature, template_key

            final_candidate = (meme_file, signature, template_key)
            logger.info("Generated duplicate meme candidate on attempt %s; retrying.", attempt + 1)

        return final_candidate

    async def _fetch_meme_template_candidates(self) -> list[tuple[str, str]]:
        if self._meme_template_candidates:
            return self._meme_template_candidates

        timeout = aiohttp.ClientTimeout(total=15)
        headers = {"User-Agent": "Mozilla/5.0"}

        memegen_ids: list[str] = []
        try:
            async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
                async with session.get(MEMEGEN_TEMPLATES_URL) as response:
                    if response.status != 200:
                        raise ValueError(f"Template endpoint returned {response.status}")
                    data = await response.json()
        except Exception as exc:
            logger.warning("Could not fetch MemeGen template catalog: %s", exc)
            data = []

        if isinstance(data, list):
            for item in data:
                template_id = item.get("id") if isinstance(item, dict) else None
                if isinstance(template_id, str) and re.fullmatch(r"[a-z0-9-]+", template_id):
                    memegen_ids.append(template_id)

        memegen_ids = sorted(set(memegen_ids))
        if not memegen_ids:
            memegen_ids = list(FALLBACK_MEME_TEMPLATE_IDS)

        imgflip_candidates = await self._fetch_imgflip_background_candidates()
        giphy_candidates = await self._fetch_giphy_background_candidates()
        memegen_candidates = [(f"memegen:{template_id}", template_id) for template_id in memegen_ids]
        all_candidates = memegen_candidates + imgflip_candidates + giphy_candidates
        if not all_candidates:
            all_candidates = [(f"memegen:{template_id}", template_id) for template_id in FALLBACK_MEME_TEMPLATE_IDS]

        self._meme_template_candidates = all_candidates
        logger.info(
            "Loaded meme template rotation pool: %s total (%s memegen + %s imgflip + %s giphy).",
            len(all_candidates),
            len(memegen_candidates),
            len(imgflip_candidates),
            len(giphy_candidates),
        )
        if len(all_candidates) < 365:
            logger.warning("Template rotation pool has only %s assets (<365).", len(all_candidates))
        return self._meme_template_candidates

    async def _fetch_imgflip_background_candidates(self) -> list[tuple[str, str]]:
        timeout = aiohttp.ClientTimeout(total=15)
        headers = {"User-Agent": "Mozilla/5.0"}
        try:
            async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
                async with session.get(IMGFLIP_MEMES_URL) as response:
                    if response.status != 200:
                        return []
                    payload = await response.json()
        except Exception:
            return []

        data = payload.get("data") if isinstance(payload, dict) else None
        memes = data.get("memes") if isinstance(data, dict) else None
        if not isinstance(memes, list):
            return []

        candidates: list[tuple[str, str]] = []
        for item in memes:
            if not isinstance(item, dict):
                continue
            meme_id = item.get("id")
            meme_url = item.get("url")
            if isinstance(meme_id, str) and isinstance(meme_url, str) and meme_url.startswith(("http://", "https://")):
                candidates.append((f"imgflip:{meme_id}", meme_url))
        return candidates

    async def _fetch_giphy_background_candidates(self) -> list[tuple[str, str]]:
        api_key = self.settings.giphy_api_key
        if not api_key:
            return []

        timeout = aiohttp.ClientTimeout(total=15)
        headers = {"User-Agent": "Mozilla/5.0"}
        url = (
            "https://api.giphy.com/v1/gifs/trending"
            f"?api_key={quote(api_key, safe='')}&limit=100&rating=pg-13"
        )
        try:
            async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        return []
                    payload = await response.json()
        except Exception:
            return []

        data = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(data, list):
            return []

        candidates: list[tuple[str, str]] = []
        for item in data:
            if not isinstance(item, dict):
                continue
            gif_id = item.get("id")
            images = item.get("images")
            original = images.get("original") if isinstance(images, dict) else None
            gif_url = original.get("url") if isinstance(original, dict) else None
            if isinstance(gif_id, str) and isinstance(gif_url, str) and gif_url.startswith(("http://", "https://")):
                candidates.append((f"giphy:{gif_id}", gif_url))
        return candidates

    async def _pick_meme_template(self, used_templates: set[str]) -> tuple[str, str]:
        candidates = await self._fetch_meme_template_candidates()
        if not candidates:
            return "memegen:drake", "drake"

        available = [candidate for candidate in candidates if candidate[0] not in used_templates]
        if available:
            return random.choice(available)

        # Entire yearly pool exhausted; pick randomly from full catalog.
        return random.choice(candidates)

    async def post_daily_growth_update(self) -> None:
        channel = await self._get_text_channel(self.settings.growth_channel_id)
        if not channel:
            logger.warning("Growth channel not found")
            return

        today = datetime.now(ZoneInfo(self.settings.timezone)).date().isoformat()
        joins_today = self.state.joins_for_date(today)
        invite_url = await self._build_invite_url()

        post = await asyncio.to_thread(self.ai.generate_growth_prompt, joins_today, 3, invite_url)
        if not post:
            post = fallback_growth_prompt(joins_today, 3, invite_url)

        await channel.send(f"📈 **Daily Growth Goal**\n{post}")

    async def post_daily_business_ideas(self, manual: bool = False) -> bool:
        del manual  # Reserved for future behavior toggles to keep method signature aligned with other jobs.

        channel_id = self.settings.business_idea_channel_id
        if channel_id is None:
            logger.warning("Business idea channel ID is not configured")
            return False

        channel = await self._get_text_channel(channel_id)
        if not channel:
            logger.warning("Business idea channel not found")
            return False

        raw = await asyncio.to_thread(self.ai.generate_business_ideas, self.settings.idea_ai_model)
        if not raw:
            logger.warning("Business idea generation returned empty content")
            return False

        summary_message, attachment_body = self._format_business_idea_post(raw)
        today = datetime.now(ZoneInfo(self.settings.timezone)).date().isoformat()
        filename = f"business-ideas-{today}.md"
        attachment = discord.File(fp=io.BytesIO(attachment_body.encode("utf-8")), filename=filename)
        await channel.send(summary_message, file=attachment)
        return True

    @classmethod
    def _format_business_idea_post(cls, raw: str) -> tuple[str, str]:
        full_body = (raw or "").strip()
        if not full_body:
            return (
                "💡 **Daily Business Idea Generator**\n\nNo content generated today.",
                "No business ideas were generated.",
            )

        step3_marker = re.search(r"(?im)^(?:#+\s*)?step\s*3\b", full_body)
        if step3_marker:
            summary_body = full_body[: step3_marker.start()].strip()
        else:
            summary_body = full_body

        if not summary_body:
            summary_body = full_body

        summary_body = cls._truncate_discord_text(summary_body, 1500)
        message = (
            "💡 **Daily Business Idea Generator**\n\n"
            "## Step 1 + Step 2 Snapshot\n"
            f"{summary_body}\n\n"
            "_Full Step 3 deep business plans are attached as a Markdown file._"
        )
        return cls._truncate_discord_text(message, 1900), full_body

    @staticmethod
    def _truncate_discord_text(value: str, max_chars: int) -> str:
        if len(value) <= max_chars:
            return value
        truncated = value[: max_chars - 20].rstrip()
        return f"{truncated}\n\n...(truncated)"

    async def _download_image_as_file(self, image_url: str, preferred_filename: str | None = None) -> discord.File | None:
        timeout = aiohttp.ClientTimeout(total=15)
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(image_url, allow_redirects=True) as response:
                    if response.status >= 400:
                        return None
                    content_type = response.headers.get("content-type", "").lower()
                    if not content_type.startswith("image/"):
                        return None
                    image_bytes = await response.read()
        except Exception:
            return None

        if not image_bytes:
            return None

        filename = preferred_filename or self._filename_from_url(image_url, content_type)
        return discord.File(fp=io.BytesIO(image_bytes), filename=filename)

    @staticmethod
    def _normalize_meme_text(value: str) -> str:
        value = (value or "").strip().strip('"').strip("'")
        if not value:
            return ""
        value = re.sub(r"\s+", " ", value)
        return value[:120]

    @classmethod
    def _parse_meme_fields(cls, raw: str) -> tuple[str, str, str]:
        template = ""
        top_text = ""
        bottom_text = ""

        for line in (raw or "").splitlines():
            line = line.strip()
            if not line:
                continue
            lower = line.lower()
            if lower.startswith("- template:") or lower.startswith("template:"):
                template = line.split(":", 1)[1].strip()
            elif lower.startswith("- top text:") or lower.startswith("top text:"):
                top_text = line.split(":", 1)[1].strip()
            elif lower.startswith("- bottom text:") or lower.startswith("bottom text:"):
                bottom_text = line.split(":", 1)[1].strip()

        template = cls._normalize_meme_text(template).lower()
        top_text = cls._normalize_meme_text(top_text)
        bottom_text = cls._normalize_meme_text(bottom_text)
        return template, top_text, bottom_text

    @staticmethod
    def _encode_memegen_text(value: str) -> str:
        value = (value or "").strip()
        if not value:
            return "_"
        return quote(value, safe="")

    @classmethod
    def _build_memegen_template_url(cls, template_id: str, top_text: str, bottom_text: str) -> str:
        top = cls._encode_memegen_text(top_text)
        bottom = cls._encode_memegen_text(bottom_text)
        return f"https://api.memegen.link/images/{template_id}/{top}/{bottom}.png"

    @classmethod
    def _build_memegen_custom_url(cls, background_url: str, top_text: str, bottom_text: str) -> str:
        top = cls._encode_memegen_text(top_text)
        bottom = cls._encode_memegen_text(bottom_text)
        bg_encoded = quote(background_url, safe="")
        return f"https://api.memegen.link/images/custom/{top}/{bottom}.png?background={bg_encoded}"

    @classmethod
    def _build_meme_image_url(cls, template_key: str, payload: str, top_text: str, bottom_text: str) -> str:
        if template_key.startswith(("imgflip:", "giphy:")):
            return cls._build_memegen_custom_url(payload, top_text, bottom_text)
        return cls._build_memegen_template_url(payload, top_text, bottom_text)

    @staticmethod
    def _meme_signature(template: str, top_text: str, bottom_text: str) -> str:
        return "|".join(
            [
                (template or "").strip().lower(),
                (top_text or "").strip().lower(),
                (bottom_text or "").strip().lower(),
            ]
        )

    @staticmethod
    def _filename_from_url(url: str, content_type: str) -> str:
        parsed = urlparse(url)
        path = parsed.path or ""
        name = path.rsplit("/", 1)[-1]
        if "." in name and name.strip("."):
            return name

        ext_map = {
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
        }
        ext = ext_map.get(content_type, ".jpg")
        return f"meme{ext}"

    async def _fetch_link_metadata(self, url: str) -> tuple[str, str]:
        timeout = aiohttp.ClientTimeout(total=10)
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url, allow_redirects=True) as response:
                    if response.status >= 400:
                        return "", ""
                    content_type = response.headers.get("content-type", "")
                    if "text/html" not in content_type:
                        return "", ""
                    text = await response.text(errors="ignore")
        except Exception:
            return "", ""

        text = text[:300000]
        title = self._extract_tag(text, r"<title[^>]*>(.*?)</title>")
        description = self._extract_meta_description(text)
        return self._clean_html(title), self._clean_html(description)

    async def _fetch_latest_youtube_video(self, channel_url: str) -> tuple[str, str, str] | None:
        # Poll the channel's /videos page and grab the newest listed video id.
        videos_url = channel_url.rstrip("/")
        if not videos_url.endswith("/videos"):
            videos_url = f"{videos_url}/videos"

        timeout = aiohttp.ClientTimeout(total=12)
        headers = {"User-Agent": "Mozilla/5.0"}
        try:
            async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
                async with session.get(videos_url, allow_redirects=True) as response:
                    if response.status >= 400:
                        return None
                    text = await response.text(errors="ignore")
        except Exception:
            return None

        video_match = re.search(r'"videoId":"([A-Za-z0-9_-]{11})"', text)
        if not video_match:
            return None
        video_id = video_match.group(1)
        watch_url = f"https://www.youtube.com/watch?v={video_id}"

        title_guess = ""
        title_match = re.search(
            rf'"videoId":"{re.escape(video_id)}".{{0,1200}}?"title":\{{"runs":\[\{{"text":"(.*?)"',
            text,
            flags=re.DOTALL,
        )
        if title_match:
            title_guess = self._clean_html(title_match.group(1))

        return video_id, watch_url, title_guess

    @staticmethod
    def _extract_meta_description(text: str) -> str:
        patterns = [
            r"<meta[^>]+property=['\"]og:description['\"][^>]+content=['\"](.*?)['\"]",
            r"<meta[^>]+name=['\"]description['\"][^>]+content=['\"](.*?)['\"]",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1)
        return ""

    @staticmethod
    def _extract_tag(text: str, pattern: str) -> str:
        match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
        if not match:
            return ""
        return match.group(1)

    @staticmethod
    def _extract_first_url(text: str) -> str | None:
        match = URL_PATTERN.search(text or "")
        if not match:
            return None
        return match.group(0).rstrip(")].,!?")

    @staticmethod
    def _clean_html(text: str) -> str:
        stripped = re.sub(r"<[^>]+>", "", text or "")
        return html.unescape(stripped).strip()


load_dotenv()
settings = load_settings()
bot = MoonshotsMatesBot(settings)


class ProcessLock:
    def __init__(self, path: str) -> None:
        self.path = path
        self.pid = os.getpid()
        self.file: io.TextIOWrapper | None = None

    def acquire(self) -> bool:
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        try:
            lock_file = open(self.path, "a+", encoding="utf-8")
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            lock_file.seek(0)
            lock_file.truncate()
            lock_file.write(str(self.pid))
            lock_file.flush()
            self.file = lock_file
            return True
        except (BlockingIOError, OSError):
            if "lock_file" in locals():
                lock_file.close()
            return False

    def release(self) -> None:
        if self.file is None:
            return
        try:
            fcntl.flock(self.file.fileno(), fcntl.LOCK_UN)
        finally:
            self.file.close()
            self.file = None


@bot.tree.command(name="post_recap_check", description="Check feed now and post recap if a new episode exists")
@app_commands.guilds(discord.Object(id=settings.guild_id))
@app_commands.default_permissions(manage_guild=True)
async def post_recap_check(interaction: discord.Interaction) -> None:
    acknowledged = False
    try:
        await interaction.response.send_message("Checking now...", ephemeral=True)
        acknowledged = True
    except discord.NotFound:
        logger.warning("Slash interaction expired before acknowledgement for /post_recap_check")
    except discord.DiscordException as exc:
        logger.warning("Could not acknowledge /post_recap_check interaction: %s", exc)

    await bot.check_new_episode()

    if acknowledged:
        mode = settings.episode_source_mode
        if mode == "rss":
            await interaction.followup.send("Checked the RSS feed.", ephemeral=True)
        elif mode == "youtube":
            await interaction.followup.send("Checked YouTube for latest video.", ephemeral=True)
        else:
            await interaction.followup.send(
                "Episode source mode is 'discord'. Post a new episode link in the episode channel to trigger recap.",
                ephemeral=True,
            )


@bot.tree.command(name="post_discussion_now", description="Post today's discussion question now")
@app_commands.guilds(discord.Object(id=settings.guild_id))
@app_commands.default_permissions(manage_guild=True)
async def post_discussion_now(interaction: discord.Interaction) -> None:
    await interaction.response.defer(ephemeral=True)
    await bot.post_daily_discussion()
    await interaction.followup.send("Posted discussion question.", ephemeral=True)


@bot.tree.command(name="post_meme_now", description="Post today's meme now")
@app_commands.guilds(discord.Object(id=settings.guild_id))
@app_commands.default_permissions(manage_guild=True)
async def post_meme_now(interaction: discord.Interaction) -> None:
    acknowledged = False
    try:
        await interaction.response.defer(ephemeral=True)
        acknowledged = True
    except discord.NotFound:
        logger.warning("Slash interaction expired before acknowledgement for /post_meme_now")
    except discord.DiscordException as exc:
        logger.warning("Could not acknowledge /post_meme_now interaction: %s", exc)

    await bot.post_daily_meme(manual=True)
    if acknowledged:
        await interaction.followup.send("Posted meme.", ephemeral=True)


@bot.tree.command(name="post_growth_now", description="Post growth update now")
@app_commands.guilds(discord.Object(id=settings.guild_id))
@app_commands.default_permissions(manage_guild=True)
async def post_growth_now(interaction: discord.Interaction) -> None:
    await interaction.response.defer(ephemeral=True)
    await bot.post_daily_growth_update()
    await interaction.followup.send("Posted growth update.", ephemeral=True)


@bot.tree.command(name="post_business_ideas_now", description="Post today's business ideas now")
@app_commands.guilds(discord.Object(id=settings.guild_id))
@app_commands.default_permissions(manage_guild=True)
async def post_business_ideas_now(interaction: discord.Interaction) -> None:
    await interaction.response.defer(ephemeral=True)
    posted = await bot.post_daily_business_ideas(manual=True)
    if posted:
        await interaction.followup.send("Posted business ideas.", ephemeral=True)
    else:
        await interaction.followup.send(
            "Business idea post skipped. Check channel config and bot logs for details.",
            ephemeral=True,
        )


@bot.tree.command(name="preview_latest_recap", description="Preview latest recap without posting publicly")
@app_commands.guilds(discord.Object(id=settings.guild_id))
@app_commands.default_permissions(manage_guild=True)
async def preview_latest_recap(interaction: discord.Interaction) -> None:
    await interaction.response.defer(ephemeral=True)
    preview, err = await bot.build_latest_recap_preview()
    if err:
        await interaction.followup.send(err, ephemeral=True)
        return

    # Discord hard limit is 2000 characters.
    if len(preview) > 1900:
        preview = preview[:1900].rstrip() + "\n\n...(truncated)"
    await interaction.followup.send(preview, ephemeral=True)


@bot.tree.command(name="post_latest_recap_now", description="Post latest recap publicly to discussion channel")
@app_commands.guilds(discord.Object(id=settings.guild_id))
@app_commands.default_permissions(manage_guild=True)
async def post_latest_recap_now(interaction: discord.Interaction) -> None:
    await interaction.response.defer(ephemeral=True)
    recap_text, err = await bot.build_latest_recap_preview()
    if err:
        await interaction.followup.send(err, ephemeral=True)
        return

    target_channel = await bot._get_text_channel(settings.discussion_channel_id)
    if not target_channel:
        target_channel = await bot._get_text_channel(settings.episode_channel_id)
    if not target_channel:
        await interaction.followup.send("Could not find a target text channel to post recap.", ephemeral=True)
        return

    await target_channel.send(recap_text)
    await interaction.followup.send(f"Posted recap in <#{target_channel.id}>.", ephemeral=True)


if __name__ == "__main__":
    lock = ProcessLock(str(Path(__file__).resolve().parent / "data" / "bot.pid"))
    if not lock.acquire():
        logger.error("Another bot process is already running. Exiting.")
        raise SystemExit(1)
    try:
        bot.run(settings.discord_token)
    finally:
        lock.release()
