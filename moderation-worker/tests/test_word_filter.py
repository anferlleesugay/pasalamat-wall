from app.word_filter import find_blocked_word, normalize


def test_clean_message_passes():
    assert find_blocked_word("Salamat po for always helping us!") is None


def test_blocked_word_is_found():
    assert find_blocked_word("You are so stupid") == "stupid"


def test_filipino_blocked_word_is_found():
    assert find_blocked_word("ang tanga mo") == "tanga"


def test_leetspeak_is_caught():
    assert find_blocked_word("b0b0 ka") == "bobo"


def test_uppercase_is_caught():
    assert find_blocked_word("IDIOT") == "idiot"


def test_partial_word_is_not_flagged():
    # "dumbbell" contains "dumb" but is a normal word
    assert find_blocked_word("Thanks for lending me your dumbbell") is None


def test_normalize_collapses_spaces():
    assert normalize("  Hello    THERE ") == "hello there"
