import json
import logging
import os
from typing import Any

logger = logging.getLogger("coplan.gemini")

# Primary Gemini Model
DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

_client = None

def get_gemini_client():
    """Lazily initializes the Google GenAI client if an API key is available."""
    global _client
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    if _client is None:
        try:
            from google import genai
            _client = genai.Client(api_key=api_key)
            logger.info("Google GenAI client initialized successfully.")
        except Exception as e:
            logger.warning("Could not initialize google-genai client: %s", e)
            _client = None
    return _client


def is_gemini_active() -> bool:
    """Returns True if Google Gemini API key is configured and client is ready."""
    return get_gemini_client() is not None


def get_engine_info() -> dict[str, Any]:
    """Returns AI engine metadata for UI display and status indicators."""
    active = is_gemini_active()
    return {
        "active": active,
        "provider": "Google Gemini" if active else "CARE Algorithmic Co-Pilot",
        "model": DEFAULT_GEMINI_MODEL if active else "CARE-v2-Deterministic",
        "mode": "Generative Reasoning" if active else "Deterministic Fallback",
    }


# =====================================================================
# 1. EMPATHETIC BLOCKER AGENT
# =====================================================================

def fallback_friction_inference(
    task_title: str,
    user_message: str,
    completion_status: str,
    blocker_category: str | None = None,
) -> dict[str, Any]:
    """Deterministic heuristic fallback when Gemini API is unconfigured or unreachable."""
    text = f"{user_message} {completion_status} {blocker_category or ''}".lower()

    if any(k in text for k in ["api", "access", "credential", "backend", "waiting", "blocked", "advisor", "team", "approval", "dependency"]):
        friction_type = "External Dependency"
        schedule_impact = "+1-2 days"
        required_resource = "External credentials / Advisor sign-off"
        suggested_action = "Reach out to dependency owner to unblock task and buffer downstream deadline."
    elif any(k in text for k in ["difficult", "complex", "bug", "stuck", "error", "failing", "uncertainty"]):
        friction_type = "Technical Complexity"
        schedule_impact = "+2 days"
        required_resource = "Senior engineer pairing (30 mins)"
        suggested_action = "Schedule a 30-minute pairing session with a teammate to isolate the blocker."
    elif any(k in text for k in ["unclear", "specification", "requirements", "scope", "design", "criteria"]):
        friction_type = "Unclear Requirements"
        schedule_impact = "+1 day"
        required_resource = "Product lead clarification"
        suggested_action = "Request a quick 10-minute scope alignment check before writing further code."
    elif any(k in text for k in ["overload", "too much", "busy", "capacity", "hours", "exhausted", "support"]):
        friction_type = "Capacity Overload"
        schedule_impact = "+2-3 days"
        required_resource = "Workload rebalance"
        suggested_action = "Propose delegating secondary tasks to teammates with available capacity."
    else:
        friction_type = "Time Buffer"
        schedule_impact = "+1 day"
        required_resource = "Focus block"
        suggested_action = "Allocate an uninterrupted 2-hour focus block tomorrow morning."

    reply = (
        f"Blocker Agent: I hear you. Dealing with {friction_type.lower()} can feel frustrating, "
        f"especially on '{task_title}'. Based on team capacity, I recommend: {suggested_action} "
        f"(Estimated impact: {schedule_impact}). Would you like to submit this adjustment to the Approval Center?"
    )

    return {
        "reply": reply,
        "friction_type": friction_type,
        "schedule_impact": schedule_impact,
        "required_resource": required_resource,
        "suggested_action": suggested_action,
        "source": "deterministic_fallback",
    }


def generate_empathetic_reply(
    task_title: str,
    user_message: str,
    completion_status: str,
    blocker_category: str | None = None,
) -> dict[str, Any]:
    """
    Generates empathetic blocker response using Google Gemini API.
    Falls back gracefully to deterministic heuristics on any error.
    """
    client = get_gemini_client()
    if not client:
        return fallback_friction_inference(task_title, user_message, completion_status, blocker_category)

    system_instruction = (
        "You are the CoPlan AI Empathetic Blocker Agent. Your mission is to provide psychological safety, "
        "listen with genuine empathy to coordination friction, and recommend supportive, non-punitive solutions "
        "under the CARE framework (Cognitive sustainability, Agency, Rest boundaries, Equity).\n"
        "Analyze the user's situation and return ONLY a valid JSON object with the following fields:\n"
        "- reply: A warm, validating, conversational response (2-3 sentences) acknowledging the challenge.\n"
        "- friction_type: One of ['External Dependency', 'Technical Complexity', 'Unclear Requirements', 'Capacity Overload', 'Time Buffer'].\n"
        "- schedule_impact: Short duration string like '+1 day', '+2 days', or '+1-2 days'.\n"
        "- required_resource: Practical resource needed (e.g., 'Senior engineer pairing (30 mins)', 'Product lead clarification').\n"
        "- suggested_action: Specific, actionable, supportive next step.\n"
        "Do NOT include markdown fences, backticks, or other text outside the JSON."
    )

    prompt = (
        f"Task: {task_title}\n"
        f"User Completion Status: {completion_status}\n"
        f"Blocker Category: {blocker_category or 'General'}\n"
        f"User Message: {user_message}\n"
    )

    try:
        response = client.models.generate_content(
            model=DEFAULT_GEMINI_MODEL,
            contents=prompt,
            config={
                "system_instruction": system_instruction,
                "response_mime_type": "application/json",
                "temperature": 0.4,
            },
        )
        text = response.text.strip()
        data = json.loads(text)
        return {
            "reply": data.get("reply", "Blocker Agent: I understand the challenge and am here to support you."),
            "friction_type": data.get("friction_type", "External Dependency"),
            "schedule_impact": data.get("schedule_impact", "+1 day"),
            "required_resource": data.get("required_resource", "Team support"),
            "suggested_action": data.get("suggested_action", "Buffer timeline and seek peer coordination."),
            "source": "gemini",
        }
    except Exception as e:
        logger.warning("Gemini check-in generation failed: %s. Falling back to deterministic co-pilot.", e)
        return fallback_friction_inference(task_title, user_message, completion_status, blocker_category)


# =====================================================================
# 2. AI DAILY PLANNER
# =====================================================================

def generate_daily_plan_reasoning(tasks: list[dict[str, Any]], user_name: str) -> list[dict[str, Any]]:
    """
    Uses Gemini to synthesize deep cognitive load scheduling rationale for the daily focus queue.
    Falls back gracefully to deterministic reasons if Gemini is unavailable.
    """
    client = get_gemini_client()
    if not client or not tasks:
        return []

    system_instruction = (
        "You are the CoPlan AI Planning Agent under the CARE framework. Given an engineer's active tasks, "
        "provide strategic sequencing reasoning that respects cognitive energy. Highly complex or high-cognitive-load "
        "tasks should be scheduled first during peak focus hours, followed by lower-load tasks to prevent burnout.\n"
        "Return ONLY a JSON list of objects matching the input tasks in priority order, with fields:\n"
        "- task_id: integer matching the task id\n"
        "- recommended_priority: string ('P1 - Critical Focus', 'P2 - High Focus', or 'P3 - Standard')\n"
        "- reason: list of 2-3 concise rationale strings explaining WHY this task should be done in this order\n"
        "- proposed_action: clear next focus block step\n"
        "Do NOT include markdown fences or any other text outside the JSON."
    )

    prompt = f"User: {user_name}\nActive Tasks:\n"
    for t in tasks[:6]:
        prompt += (
            f"- ID: {t['id']}, Title: {t['title']}, Status: {t['status']}, Due: {t['due_date']}, "
            f"Cognitive Load: {t.get('cognitive_load', 3)}/5, Complexity: {t.get('complexity', 3)}/5, "
            f"Hours: {t.get('estimated_hours', 2)}h, Blocker: {t.get('blocker_details') or 'None'}\n"
        )

    try:
        response = client.models.generate_content(
            model=DEFAULT_GEMINI_MODEL,
            contents=prompt,
            config={
                "system_instruction": system_instruction,
                "response_mime_type": "application/json",
                "temperature": 0.3,
            },
        )
        data = json.loads(response.text.strip())
        if isinstance(data, list):
            return data
    except Exception as e:
        logger.warning("Gemini daily plan reasoning failed: %s. Falling back to deterministic plan.", e)

    return []


# =====================================================================
# 3. WORKLOAD EQUITY REBALANCE ADVISOR
# =====================================================================

def generate_rebalance_note(
    task_title: str,
    from_name: str,
    to_name: str,
    cognitive_load: int = 4,
) -> str:
    """
    Generates a personalized pairing note using Gemini or deterministic fallback.
    """
    client = get_gemini_client()
    default_note = (
        f"Rebalanced '{task_title}' from {from_name} to {to_name} to alleviate high cognitive load ({cognitive_load}/5) "
        f"and leverage available sprint capacity."
    )
    if not client:
        return default_note

    prompt = (
        f"Write a professional, encouraging 1-sentence pairing/rebalancing note for team coordination. "
        f"Task: '{task_title}'. Transferring or pairing from overloaded engineer {from_name} (Cognitive load: {cognitive_load}/5) "
        f"to teammate {to_name} who has available bandwidth. Keep it under 25 words."
    )

    try:
        response = client.models.generate_content(
            model=DEFAULT_GEMINI_MODEL,
            contents=prompt,
            config={"temperature": 0.4},
        )
        text = response.text.strip().replace('"', '')
        return text if text else default_note
    except Exception:
        return default_note
