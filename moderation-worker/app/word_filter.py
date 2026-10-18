"""Fast, offline check for clearly inappropriate words (English + Filipino)."""
import re

# Keep this list short and obvious; the AI check handles subtle cases.
BLOCKED_WORDS = {
    "stupid", "idiot", "dumb", "loser", "ugly", "hate", "shut up",
    "gago", "tanga", "bobo", "ulol", "tarantado", "putangina", "pakyu",
}

# Common character swaps people use to sneak words past filters: "b0b0", "t4nga"
_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "@": "a", "$": "s"})


def normalize(text: str) -> str:
    """Lowercase, undo leetspeak, and collapse whitespace."""
    return re.sub(r"\s+", " ", text.lower().translate(_LEET)).strip()


def find_blocked_word(text: str) -> str | None:
    """Return the first blocked word found in the text, or None if it is clean."""
    clean = normalize(text)
    for word in sorted(BLOCKED_WORDS):
        # \b = word boundary, so "classic" does not match "ass"-style partial words
        if re.search(rf"\b{re.escape(word)}\b", clean):
            return word
    return None
