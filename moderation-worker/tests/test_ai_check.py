import json

from app.ai_check import check_tone


def fake_gemini(reply: dict):
    """Build a fake `post` function that returns a Gemini-shaped response."""
    def post(url, body, api_key, timeout):
        return {"candidates": [{"content": {"parts": [{"text": json.dumps(reply)}]}}]}
    return post


def failing_post(url, body, api_key, timeout):
    raise TimeoutError("network down")


def test_no_api_key_returns_none():
    assert check_tone("A", "hi", api_key="", model="m") is None


def test_kind_reply_is_parsed():
    verdict = check_tone("A", "thanks!", api_key="k", model="m",
                         post=fake_gemini({"kind": True, "reason": "grateful"}))
    assert verdict.kind is True
    assert verdict.reason == "grateful"


def test_unkind_reply_is_parsed():
    verdict = check_tone("A", "lol loser", api_key="k", model="m",
                         post=fake_gemini({"kind": False, "reason": "mocking"}))
    assert verdict.kind is False


def test_network_error_returns_none():
    assert check_tone("A", "hi", api_key="k", model="m", post=failing_post) is None


def test_garbage_reply_returns_none():
    def bad_post(url, body, api_key, timeout):
        return {"unexpected": "shape"}
    assert check_tone("A", "hi", api_key="k", model="m", post=bad_post) is None


def test_request_uses_model_in_url():
    seen = {}

    def spy_post(url, body, api_key, timeout):
        seen["url"] = url
        seen["key"] = api_key
        return {"candidates": [{"content": {"parts": [{"text": '{"kind": true, "reason": "ok"}'}]}}]}

    check_tone("A", "hi", api_key="secret", model="gemini-test", post=spy_post)
    assert "gemini-test:generateContent" in seen["url"]
    assert seen["key"] == "secret"
