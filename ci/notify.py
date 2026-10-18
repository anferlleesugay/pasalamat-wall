"""Post the Jenkins build result as a comment on the GitHub commit.

On failure, Gemini reads the end of the failing log and explains the problem in
plain English. Runs inside a throwaway python container; only the standard
library is used. It never fails the build: problems are printed and ignored.

Inputs (environment): GITHUB_TOKEN, GITHUB_REPO, GIT_COMMIT, BUILD_NUMBER,
BUILD_RESULT, FAILED_STAGE, BUILD_DURATION, GEMINI_API_KEY, GEMINI_MODEL.
The log excerpt arrives on stdin.
"""
import json
import os
import sys
import urllib.request

GITHUB_API = os.getenv("GITHUB_API", "https://api.github.com")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def post_json(url, body, headers, timeout=20):
    request = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode() or "{}")


def explain_failure(stage, log_excerpt, api_key, model):
    """Ask Gemini for a short, student-friendly explanation. None if unavailable."""
    if not api_key or not log_excerpt.strip():
        return None
    prompt = (
        f"A Jenkins CI/CD pipeline failed at the '{stage}' stage. Below is the end of the log.\n"
        "In at most 3 short sentences: say what went wrong and how to fix it. "
        "Be specific (name the file, test, or value if visible). No markdown headings.\n\n"
        f"LOG:\n{log_excerpt[-6000:]}"
    )
    try:
        data = post_json(
            GEMINI_URL.format(model=model),
            {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.2}},
            {"Content-Type": "application/json", "x-goog-api-key": api_key},
        )
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()[:700]
    except Exception as error:  # AI is optional: never block the comment
        print(f"AI explanation unavailable: {error}")
        return None


def build_comment(env, log_excerpt, explanation):
    number = env.get("BUILD_NUMBER", "?")
    duration = env.get("BUILD_DURATION", "").strip()
    took = f" in {duration}" if duration else ""
    if env.get("BUILD_RESULT") == "SUCCESS":
        return (
            f"✅ Build #{number} passed and was deployed{took}\n\n"
            "Checkout → Test → Build Images → Deploy → Smoke Test all green. "
            f"The live site now shows **Build #{number}** in the footer."
        )
    stage = env.get("FAILED_STAGE") or "an unknown stage"
    lines = [
        f"❌ Build #{number} failed at {stage}{took}",
        "",
        "The pipeline stopped before deploying, so the live site is still running the previous version.",
    ]
    if explanation:
        lines += ["", f"🤖 **What went wrong (Gemini):** {explanation}"]
    tail = "\n".join(log_excerpt.strip().splitlines()[-15:])
    if tail:
        lines += ["", "<details><summary>Last log lines</summary>", "", "```", tail, "```", "</details>"]
    return "\n".join(lines)


def main():
    env = os.environ
    required = ["GITHUB_TOKEN", "GITHUB_REPO", "GIT_COMMIT"]
    missing = [name for name in required if not env.get(name)]
    if missing:
        print(f"notify: skipped, missing {', '.join(missing)}")
        return 0

    log_excerpt = sys.stdin.read() if not sys.stdin.isatty() else ""
    explanation = None
    if env.get("BUILD_RESULT") != "SUCCESS":
        explanation = explain_failure(
            env.get("FAILED_STAGE", "unknown"), log_excerpt,
            env.get("GEMINI_API_KEY", ""), env.get("GEMINI_MODEL", "gemini-3.5-flash-lite"),
        )
    body = build_comment(env, log_excerpt, explanation)
    try:
        post_json(
            f"{GITHUB_API}/repos/{env['GITHUB_REPO']}/commits/{env['GIT_COMMIT']}/comments",
            {"body": body},
            {
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {env['GITHUB_TOKEN']}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "pasalamat-jenkins",
                "Content-Type": "application/json",
            },
        )
        print(f"notify: commented on {env['GIT_COMMIT'][:7]}: {body.splitlines()[0]}")
    except Exception as error:
        print(f"notify: could not comment on GitHub (ignored): {error}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
