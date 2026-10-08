"""Tests for async transcribe flow (background job + polling)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://transcribe-srt-hub.preview.emergentagent.com").rstrip("/")
TONE_PATH = "/tmp/test_tone.mp3"


def test_config_ok():
    r = requests.get(f"{BASE_URL}/api/config", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["api_key_configured"] is True
    assert data["ffmpeg_available"] is True


def test_transcribe_returns_job_immediately():
    with open(TONE_PATH, "rb") as f:
        files = {"file": ("test_tone.mp3", f, "audio/mpeg")}
        start = time.time()
        r = requests.post(f"{BASE_URL}/api/transcribe", files=files, timeout=30)
        elapsed = time.time() - start
    assert r.status_code == 200, r.text
    data = r.json()
    assert "job_id" in data
    assert data["status"] == "processing"
    # Should return quickly (background task). Modulate takes 40-60s so if sync -> timeout
    assert elapsed < 15, f"Expected quick response but took {elapsed}s"


def test_full_polling_flow():
    with open(TONE_PATH, "rb") as f:
        files = {"file": ("test_tone.mp3", f, "audio/mpeg")}
        r = requests.post(f"{BASE_URL}/api/transcribe", files=files, timeout=30)
    assert r.status_code == 200
    job_id = r.json()["job_id"]

    # Poll job status for up to 180s
    final = None
    for _ in range(72):
        time.sleep(2.5)
        jr = requests.get(f"{BASE_URL}/api/jobs/{job_id}", timeout=30)
        assert jr.status_code == 200, jr.text
        jd = jr.json()
        if jd["status"] in ("done", "error"):
            final = jd
            break
    assert final is not None, "Job did not finish within timeout"
    assert final["status"] == "done", f"Job errored: {final.get('error')}"
    rec = final.get("record")
    assert rec is not None
    assert "id" in rec
    assert "result" in rec
    assert rec["filename"] == "test_tone.mp3"

    # Verify also in history
    hr = requests.get(f"{BASE_URL}/api/history", timeout=30)
    assert hr.status_code == 200
    assert any(h["id"] == rec["id"] for h in hr.json())

    # Cleanup
    requests.delete(f"{BASE_URL}/api/history/{rec['id']}", timeout=30)


def test_job_not_found():
    r = requests.get(f"{BASE_URL}/api/jobs/does-not-exist", timeout=30)
    assert r.status_code == 404
