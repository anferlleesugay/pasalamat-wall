"""Ask Gemini whether a note is kind. Returns None if the AI is unavailable."""
import json
import logging
import urllib.error
import urllib.request
from dataclasses import dataclass

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

PROMPT = """You moderate a campus gratitude wall where students thank classmates,
teachers, guards, and canteen staff. Notes may be in English, Filipino, or Taglish.
Decide if the note below is kind and appropriate. Flag notes that insult, mock,
tease, harass, use sarcasm to put someone down, or share private information.

Reply ONLY with JSON: {{"kind": true or false, "reason": "short reason"}}

Note to "{to_name}": "{message}"
"""


@dataclass
class AiVerdict:
    kind: bool
    reason: str


def _post_json(url: str, body: dict, api_key: str, timeout: float) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def check_tone(to_name: str, message: str, api_key: str, model: str,
               timeout: float = 10.0, post=_post_json) -> AiVerdict | None:
    """Return the AI's verdict, or None if there is no key or the call fails."""
    if not api_key:
        return None
    body = {
        "contents": [{"parts": [{"text": PROMPT.format(to_name=to_name, message=message)}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0},
    }
    try:
        data = post(GEMINI_URL.format(model=model), body, api_key, timeout)
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
        return AiVerdict(kind=bool(parsed["kind"]), reason=str(parsed.get("reason", ""))[:200])
    except urllib.error.HTTPError as error:  # bad key (400/403), wrong model (404), quota (429)
        detail = error.read().decode("utf-8", "replace")[:300]
        logging.getLogger("moderation-worker").warning("AI check failed: HTTP %s %s", error.code, detail)
        return None
    except Exception as error:  # network error, timeout, unexpected reply format...
        logging.getLogger("moderation-worker").warning("AI check failed: %s", error)
        return None
