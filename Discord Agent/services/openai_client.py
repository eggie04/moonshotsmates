from __future__ import annotations

import logging

from openai import OpenAI

logger = logging.getLogger(__name__)


class AiHelper:
    def __init__(self, api_key: str | None, model: str, base_url: str | None = None) -> None:
        key = (api_key or "").strip()
        self.enabled = bool(key) and key != "sk-..."
        self.model = model
        self.client = OpenAI(api_key=key, base_url=base_url) if self.enabled else None

    def _chat(self, system_prompt: str, user_prompt: str, model_override: str | None = None) -> str:
        if not self.enabled or not self.client:
            return ""
        model = model_override or self.model
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
            )
            content = response.choices[0].message.content if response.choices else ""
            if isinstance(content, str):
                return content.strip()
            return ""
        except Exception as exc:
            logger.warning("OpenAI call failed, using fallback content: %s", exc)
            return ""

    def generate_episode_recap(self, title: str, description: str, link: str) -> str:
        prompt = (
            "Create a concise, engaging Discord recap of this MoonshotsMates episode. "
            "Use 3-5 bullet points, include one 'Why this matters' line, and end with one discussion question.\n\n"
            f"Title: {title}\nDescription: {description}\nLink: {link}"
        )
        return self._chat(
            "You write community-friendly podcast recaps for a startup and investing audience.",
            prompt,
        )

    def generate_discussion_question(self) -> str:
        prompt = (
            "Generate one thought-provoking discussion question for the MoonshotsMates Discord. "
            "Theme: startup ideas, investing psychology, and future trends. Keep it under 40 words."
        )
        return self._chat("You are a creative but practical community manager.", prompt)

    def generate_meme_caption(self, topic_context: str, meme_model: str) -> str:
        prompt = (
            "You are an expert meme creator focused on futurism, AI, and exponential technology.\n\n"
            "STEP 1: Analyze today's latest video (or recent topics) from Peter Diamandis' YouTube channel.\n"
            "Identify the core theme (examples: AGI timelines, AI replacing jobs, robotics, abundance vs fear, "
            "exponential growth, geopolitical AI race, longevity tech).\n\n"
            "STEP 2: Convert that theme into a highly relatable, viral meme concept using:\n"
            "- Contrast (expectation vs reality)\n"
            "- Irony (humans vs AI outcomes)\n"
            "- Escalation (things getting out of control fast)\n"
            "- Cultural references (popular meme formats)\n\n"
            "STEP 3: Generate ONE meme in this format:\n\n"
            "MEME FORMAT:\n"
            "- Template: (describe meme template, e.g., \"Drake Hotline Bling\", \"Distracted Boyfriend\", "
            "\"Two Buttons\", etc.)\n"
            "- Top Text:\n"
            "- Bottom Text:\n\n"
            "STYLE RULES:\n"
            "- Keep it punchy (under 12 words per line)\n"
            "- Make it feel slightly cynical but insightful\n"
            "- Highlight exponential change vs human linear thinking\n"
            "- Lean into \"this is happening faster than expected\"\n"
            "- Make it understandable even if someone hasn’t seen the video\n\n"
            "TONE:\n"
            "- Smart, slightly sarcastic, future-aware\n"
            "- Mix of optimism + existential humor\n\n"
            "EXAMPLES OF ANGLES:\n"
            "- \"Humans planning vs AI accelerating\"\n"
            "- \"Experts predictions vs actual timelines\"\n"
            "- \"What people think AI is vs what it's already doing\"\n"
            "- \"Jobs today vs jobs tomorrow\"\n"
            "- \"2020 expectations vs 2026 reality\"\n\n"
            "OUTPUT REQUIREMENTS:\n"
            "- Return exactly 3 lines only: Template, Top Text, Bottom Text\n"
            "- No links, no hashtags, no extra notes, no caption line\n"
            "- Keep top/bottom each under 12 words\n\n"
            f"Latest video/topic context:\n{topic_context}"
        )
        return self._chat(
            "You create viral tech memes with concise, high-signal humor and clean formatting.",
            prompt,
            model_override=meme_model,
        )

    def generate_growth_prompt(self, current_joins: int, target: int, invite_url: str | None) -> str:
        invite_snippet = f"Invite: {invite_url}\n" if invite_url else ""
        prompt = (
            "Write a short Discord post motivating members to invite friends today. "
            "Be specific and positive. Include one simple action step.\n"
            f"Today's joins so far: {current_joins}\n"
            f"Target: {target}\n"
            f"{invite_snippet}"
        )
        return self._chat("You are a growth-minded Discord community lead.", prompt)



def fallback_episode_recap(title: str, description: str, link: str) -> str:
    snippet = (description or "").strip()
    snippet = snippet[:500] + ("..." if len(snippet) > 500 else "")
    return (
        f"New episode dropped: **{title}**\n\n"
        f"Quick recap:\n{snippet or 'Episode details are live now.'}\n\n"
        f"Listen here: {link}"
    )



def fallback_discussion_question() -> str:
    return "What's one high-conviction trend you think most people are still underestimating, and why?"



def fallback_meme_caption() -> str:
    return "When your moonshot thesis is down 20% but the fundamentals got better."



def fallback_growth_prompt(current_joins: int, target: int, invite_url: str | None) -> str:
    base = (
        f"Growth check-in: we're at **{current_joins}/{target}** new members today. "
        "If MoonshotsMates has helped you, invite one friend who'd enjoy startup + investing conversations."
    )
    if invite_url:
        return f"{base}\nInvite link: {invite_url}"
    return base
