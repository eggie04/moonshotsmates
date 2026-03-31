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

    def generate_business_ideas(self, model_override: str) -> str:
        prompt = (
            "Act as a senior startup strategist and venture studio partner specializing in frontier technology and "
            "early-stage innovation.\n"
            "Your task is to generate, evaluate, and develop high-quality startup ideas, not just fill in a template.\n"
            "Step 1: Generate Ideas\n"
            "Generate 8-12 novel startup ideas in the technology sector, prioritizing:\n"
            "- AI / autonomous agents\n"
            "- developer tools / infrastructure\n"
            "- media, creator economy, or community platforms\n"
            "- future-of-work / productivity\n"
            "- consumer apps with strong network effects\n"
            "Each idea should include:\n"
            "- Name (working title)\n"
            "- One-line description\n"
            "- Problem it solves (be specific and real)\n"
            "- Why now? (tie to current tech or market shifts)\n"
            "- Potential business model\n"
            "- Estimated difficulty (Low / Medium / High)\n"
            "- Explain what unfair advantage a founder would need to win.\n"
            "Avoid generic or over-saturated ideas. Prefer ideas that feel like they could be featured on a "
            "\"moonshots\" platform.\n"
            "________________________________________\n"
            "Step 2: Score & Filter\n"
            "Score each idea on:\n"
            "- Market size potential (1-10)\n"
            "- Differentiation (1-10)\n"
            "- Feasibility (1-10)\n"
            "- Speed to MVP (1-10)\n"
            "Then select the top 2 ideas based on a balanced score (not just hype).\n"
            "Explain why these were selected.\n"
            "________________________________________\n"
            "Step 3: Deep Business Plan (for top ideas only)\n"
            "For each selected idea, create a detailed but realistic business plan including:\n"
            "- Executive Summary\n"
            "- Company Overview\n"
            "- Market Analysis (real competitors + trends)\n"
            "- Target Customer Persona\n"
            "- Unique Value Proposition\n"
            "- Marketing & Go-to-Market Strategy\n"
            "- Operational Plan (how it actually runs day-to-day)\n"
            "- Financial Projections (3-year: revenue, costs, assumptions clearly stated)\n"
            "- Funding Requirements (if applicable)\n"
            "- Risks & Failure Modes (be critical)\n"
            "- SWOT Analysis\n"
            "________________________________________\n"
            "Constraints & Style\n"
            "- Be intellectually honest and critical-avoid hype\n"
            "- Call out assumptions explicitly\n"
            "- If something is unclear, state what needs validation\n"
            "- Favor ideas that could realistically be built by a small, technical team\n"
            "- Prioritize ideas that align with a \"Moonshots\" mindset: ambitious but grounded in current "
            "technology\n\n"
            "Format requirements:\n"
            "- Use Discord-friendly Markdown headings and bullets.\n"
            "- Include clear section headers: Step 1, Step 2, Step 3.\n"
            "- Keep the output readable and structured for copy/paste into a channel and attachment."
        )
        return self._chat(
            "You are a rigorous startup strategist. Be concrete, critical, and specific.",
            prompt,
            model_override=model_override,
        )



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
