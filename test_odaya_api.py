"""ODAYA backend API tests - /api/health and /api/chat (Groq-backed)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL") or "https://odaya-mobile.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- /api/health ----------
class TestHealth:
    def test_health_ok(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/health", timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert body.get("groq_configured") is True
        assert body.get("service") == "odaya"


# ---------- /api/chat validation ----------
class TestChatValidation:
    def test_empty_message_returns_422(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/chat", json={"message": "", "history": []}, timeout=20)
        assert r.status_code == 422, r.text

    def test_missing_message_returns_422(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/chat", json={"history": []}, timeout=20)
        assert r.status_code == 422, r.text

    def test_too_long_message_returns_422(self, api_client):
        payload = {"message": "a" * 2001, "history": []}
        r = api_client.post(f"{BASE_URL}/api/chat", json=payload, timeout=20)
        assert r.status_code == 422, r.text


# ---------- /api/chat happy path (Groq) ----------
class TestChatGroq:
    def test_simple_chat_returns_reply(self, api_client):
        payload = {"message": "What is PNR status in Indian Railways? Keep it short.", "history": []}
        r = api_client.post(f"{BASE_URL}/api/chat", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "reply" in body
        assert isinstance(body["reply"], str) and len(body["reply"].strip()) > 0

    def test_chat_with_history(self, api_client):
        payload = {
            "message": "And where does it end?",
            "history": [
                {"role": "user", "content": "Tell me about Mumbai Rajdhani"},
                {"role": "assistant", "content": "Mumbai Rajdhani 12951 runs from Mumbai Central to New Delhi."},
            ],
        }
        r = api_client.post(f"{BASE_URL}/api/chat", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        assert isinstance(r.json().get("reply"), str) and len(r.json()["reply"]) > 0


# ---------- Root ----------
class TestRoot:
    def test_api_root(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/", timeout=20)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"
