"""Entry point: poll the database for pending notes and moderate them."""
import logging
import os
import time
from functools import partial

from app import db
from app.ai_check import check_tone
from app.health import HealthState, start_health_server
from app.moderator import decide

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("moderation-worker")


def build_dsn() -> str:
    return (
        f"host={os.getenv('DB_HOST', 'localhost')} "
        f"port={os.getenv('DB_PORT', '5432')} "
        f"dbname={os.getenv('POSTGRES_DB', 'pasalamat')} "
        f"user={os.getenv('POSTGRES_USER', 'pasalamat')} "
        f"password={os.getenv('POSTGRES_PASSWORD', 'pasalamat')}"
    )


def run() -> None:
    poll_seconds = float(os.getenv("POLL_SECONDS", "5"))
    ai_checker = partial(
        check_tone,
        api_key=os.getenv("GEMINI_API_KEY", ""),
        model=os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
    )
    state = HealthState(max_silence_seconds=poll_seconds * 6)
    start_health_server(state, int(os.getenv("HEALTH_PORT", "8000")))
    log.info("worker started (poll every %ss, AI %s)", poll_seconds,
             "enabled" if os.getenv("GEMINI_API_KEY") else "disabled")

    conn = None
    while True:
        try:
            if conn is None or conn.closed:
                conn = db.connect(build_dsn())
                log.info("connected to database")
            with conn.transaction():
                pending = db.fetch_pending(conn)
                for note_id, to_name, from_name, message in pending:
                    decision = decide(to_name, from_name, message, ai_checker)
                    db.save_decision(conn, note_id, decision)
                    log.info("note %s -> %s (%s: %s)", note_id, decision.verdict,
                             decision.source, decision.reason)
            state.mark_success(len(pending))
        except Exception as error:  # keep running; health turns DOWN if this repeats
            log.warning("loop failed: %s", error)
            conn = None
        time.sleep(poll_seconds)


if __name__ == "__main__":
    run()
