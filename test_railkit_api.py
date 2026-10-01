"""ODAYA RailKit proxy API tests.

Tests the FastAPI /api/railkit/* routes that proxy to the Node RailKit microservice.
Each endpoint hit at most once to respect RailKit rate limits.
"""
import os
from datetime import datetime, timedelta
import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
    or "https://odaya-mobile.preview.emergentagent.com"
).rstrip("/")


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------
class TestHealth:
    def test_health_includes_railkit_ready(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/health", timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert body.get("groq_configured") is True
        assert body.get("railkit_ready") is True, f"railkit_ready should be True: {body}"


# ---------- Stations ----------
class TestStations:
    def test_station_search_delhi(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/railkit/stations/search", params={"name": "delhi"}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True, body
        data = body.get("data") or {}
        stations = data.get("stations") if isinstance(data, dict) else data
        assert isinstance(stations, list) and len(stations) >= 1, f"Expected >=1 station, got: {body}"

    def test_station_by_code_ndls(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/railkit/stations/NDLS", timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True, body
        data = body.get("data") or {}
        # Code should be NDLS (case-insensitive).
        code = (data.get("code") or data.get("stationCode") or "").upper()
        assert "NDLS" in code or code == "NDLS", f"Expected NDLS in data: {data}"
        assert data.get("name") or data.get("stationName"), f"Expected name in data: {data}"


# ---------- Trains between stations ----------
class TestTrainsBetween:
    def test_trains_between_ndls_bct(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/railkit/trains/between/NDLS/BCT", timeout=45)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True, body
        data = body.get("data")
        # data can be list or dict containing list
        trains = data if isinstance(data, list) else (data.get("trains") if isinstance(data, dict) else None)
        assert isinstance(trains, list) and len(trains) > 0, f"Expected trains list: {body}"
        # Check first train has expected keys (flexible on naming)
        t = trains[0]
        assert isinstance(t, dict)
        # At minimum we expect a train number/name
        keys_lower = {k.lower(): k for k in t.keys()}
        assert any("train" in k for k in keys_lower), f"Expected train_no/train_name key: {t}"


# ---------- Train info ----------
class TestTrainInfo:
    def test_train_info_12951(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/railkit/trains/12951/info", timeout=45)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True, body
        data = body.get("data") or {}
        train_info = data.get("trainInfo") or data.get("train_info") or data
        assert isinstance(train_info, dict), f"Expected trainInfo dict: {data}"
        route = data.get("route")
        assert isinstance(route, list) and len(route) >= 2, f"Expected non-empty route list: keys={list(data.keys())}"


# ---------- Live tracking ----------
class TestTrainLive:
    def test_train_live_default_today(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/railkit/trains/12951/live", timeout=45)
        assert r.status_code == 200, r.text
        body = r.json()
        # Live may legitimately return success:false if train is not currently running
        # the shape must still be valid JSON with success flag.
        assert "success" in body, body
        if body.get("success"):
            data = body.get("data") or {}
            # Expect at least trainNo and some timeline-ish field (flexible)
            assert data.get("trainNo") or data.get("train_no") or data.get("trainNumber"), f"Expected trainNo: {data}"


# ---------- History ----------
class TestTrainHistory:
    def test_train_history_shape(self, api_client):
        # Use yesterday to avoid "future date" and give a realistic chance of data
        yday = (datetime.utcnow() - timedelta(days=1)).strftime("%d-%m-%Y")
        r = api_client.get(
            f"{BASE_URL}/api/railkit/trains/12951/history",
            params={"date": yday},
            timeout=45,
        )
        # 200 if success, 400 if upstream reports failure - both are acceptable per spec
        assert r.status_code in (200, 400), r.text
        body = r.json()
        assert "success" in body, f"Shape must contain success flag: {body}"
        if not body.get("success"):
            assert "error" in body, body


# ---------- Seat availability ----------
class TestSeatAvailability:
    def test_seat_availability_12951_mmct_ndls(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/railkit/seats/12951/MMCT/NDLS/15-11-2026/3A/GN",
            timeout=45,
        )
        # Accept 200 success OR 400 if upstream says date is too far / unavailable
        assert r.status_code in (200, 400), r.text
        body = r.json()
        assert "success" in body, body
        if body.get("success"):
            data = body.get("data") or {}
            assert "availability" in data or "fare" in data or "train" in data, f"Expected seat data: {data}"
            if "availability" in data:
                assert isinstance(data["availability"], list)


# ---------- PNR (invalid) ----------
class TestPNR:
    def test_invalid_pnr_returns_error_shape(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/railkit/pnr/0000000000", timeout=30)
        # Expect graceful failure, not a crash. 400 from backend when upstream success:false.
        assert r.status_code in (400, 200), r.text
        body = r.json()
        assert "success" in body, body
        # Must be an error (success:false), not a hallucinated PNR
        assert body.get("success") is False, f"Invalid PNR must return success:false, got: {body}"
        assert body.get("error"), f"Expected error message: {body}"


# ---------- Chat (unchanged) ----------
class TestChat:
    def test_chat_still_works(self, api_client):
        payload = {"message": "What is PNR? Keep it short.", "history": []}
        r = api_client.post(f"{BASE_URL}/api/chat", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert isinstance(body.get("reply"), str) and len(body["reply"].strip()) > 0
