from app.ai_check import AiVerdict
from app.moderator import decide


def ai_says_kind(to_name, message):
    return AiVerdict(kind=True, reason="grateful message")


def ai_says_unkind(to_name, message):
    return AiVerdict(kind=False, reason="sarcastic insult")


def ai_unavailable(to_name, message):
    return None


def ai_must_not_be_called(to_name, message):
    raise AssertionError("AI should not be called when the word filter already flagged the note")


def test_kind_note_is_approved_by_ai():
    decision = decide("Sir Cruz", "Anferl", "Thank you for the lesson!", ai_says_kind)
    assert decision.verdict == "APPROVED"
    assert decision.source == "ai"


def test_unkind_note_is_flagged_by_ai():
    decision = decide("Juan", "Anonymous", "Wow, great job failing again", ai_says_unkind)
    assert decision.verdict == "FLAGGED"
    assert decision.reason == "sarcastic insult"


def test_word_filter_flags_before_calling_ai():
    decision = decide("Juan", "Anonymous", "you are stupid", ai_must_not_be_called)
    assert decision.verdict == "FLAGGED"
    assert decision.source == "word-filter"


def test_blocked_word_in_name_is_flagged():
    decision = decide("Bobo", "Anonymous", "hello", ai_must_not_be_called)
    assert decision.verdict == "FLAGGED"


def test_clean_note_is_approved_when_ai_is_down():
    decision = decide("Kuya Guard", "Anferl", "Thanks for keeping us safe!", ai_unavailable)
    assert decision.verdict == "APPROVED"
    assert decision.source == "word-filter-only"
