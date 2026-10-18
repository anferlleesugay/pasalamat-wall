"""Tiny HTTP server so Docker can health-check the worker at GET /health."""
import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class HealthState:
    def __init__(self, max_silence_seconds: float):
        self.max_silence_seconds = max_silence_seconds
        self.last_success = time.monotonic()
        self.processed = 0

    def mark_success(self, processed: int) -> None:
        self.last_success = time.monotonic()
        self.processed += processed

    def is_healthy(self) -> bool:
        return time.monotonic() - self.last_success < self.max_silence_seconds


def start_health_server(state: HealthState, port: int) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path != "/health":
                self.send_response(404)
                self.end_headers()
                return
            healthy = state.is_healthy()
            body = json.dumps({"status": "UP" if healthy else "DOWN",
                               "processed": state.processed}).encode()
            self.send_response(200 if healthy else 503)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):  # keep logs quiet
            pass

    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server
