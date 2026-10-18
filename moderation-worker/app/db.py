"""Database access: read pending notes, save decisions."""
import psycopg

from app.moderator import Decision


def connect(dsn: str) -> psycopg.Connection:
    return psycopg.connect(dsn, autocommit=False)


def fetch_pending(conn: psycopg.Connection, limit: int = 10) -> list[tuple]:
    """Lock up to `limit` pending notes so two workers never handle the same note."""
    return conn.execute(
        """
        SELECT id, to_name, from_name, message
        FROM notes
        WHERE status = 'PENDING'
        ORDER BY created_at
        LIMIT %s
        FOR UPDATE SKIP LOCKED
        """,
        (limit,),
    ).fetchall()


def save_decision(conn: psycopg.Connection, note_id: int, decision: Decision) -> None:
    conn.execute("UPDATE notes SET status = %s WHERE id = %s", (decision.verdict, note_id))
    conn.execute(
        "INSERT INTO moderation_log (note_id, verdict, reason, source) VALUES (%s, %s, %s, %s)",
        (note_id, decision.verdict, decision.reason[:255], decision.source),
    )
