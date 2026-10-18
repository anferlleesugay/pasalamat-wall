"""Combine the word filter and the AI check into one decision."""
from dataclasses import dataclass
from typing import Callable

from app.ai_check import AiVerdict
from app.word_filter import find_blocked_word


@dataclass
class Decision:
    verdict: str   # "APPROVED" or "FLAGGED"
    reason: str
    source: str    # which check decided: "word-filter", "ai", or "word-filter-only"


def decide(to_name: str, from_name: str, message: str,
           ai_checker: Callable[[str, str], AiVerdict | None]) -> Decision:
    # 1. Word filter first: free, instant, works offline
    blocked = find_blocked_word(f"{to_name} {from_name} {message}")
    if blocked:
        return Decision("FLAGGED", f"blocked word: {blocked}", "word-filter")

    # 2. AI tone check for subtle cases (sarcasm, teasing)
    verdict = ai_checker(to_name, message)
    if verdict is None:
        # AI unavailable: fall back to the word filter result (clean)
        return Decision("APPROVED", "passed word filter (AI unavailable)", "word-filter-only")
    if verdict.kind:
        return Decision("APPROVED", verdict.reason or "kind message", "ai")
    return Decision("FLAGGED", verdict.reason or "unkind tone", "ai")
