import json
import urllib.error
import urllib.request

from app.health import HealthState, start_health_server


def get(port, path="/health"):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}{path}", timeout=2) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, None


def test_health_is_up_after_success():
    state = HealthState(max_silence_seconds=30)
    state.mark_success(processed=2)
    server = start_health_server(state, port=0)  # port 0 = pick any free port
    status, body = get(server.server_address[1])
    server.shutdown()
    assert status == 200
    assert body == {"status": "UP", "processed": 2}


def test_health_is_down_when_loop_is_stuck():
    state = HealthState(max_silence_seconds=0)  # any delay counts as "stuck"
    server = start_health_server(state, port=0)
    status, _ = get(server.server_address[1])
    server.shutdown()
    assert status == 503
