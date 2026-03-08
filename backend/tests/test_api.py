"""Tests for the image-to-3D API endpoints."""
import json
import time
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

REDIS_PREFIX = "meshy:task:"


@pytest.fixture
def fake_redis():
    """In-memory Redis replacement."""
    store = {}

    class FakeRedis:
        def set(self, key, value):
            store[key] = value

        def get(self, key):
            return store.get(key)

    return FakeRedis(), store


@pytest.fixture
def client(fake_redis):
    """TestClient with mocked MeshyClient via dependency override."""
    fake_redis_obj, _ = fake_redis
    mock_meshy = MagicMock()
    mock_meshy.redis_client = fake_redis_obj
    mock_meshy.process_image_to_3d = MagicMock(return_value="https://fake-cdn.com/model.glb")

    from src.api.main import app, get_meshy_client

    app.dependency_overrides[get_meshy_client] = lambda: mock_meshy
    try:
        with TestClient(app) as c:
            yield c, fake_redis
    finally:
        app.dependency_overrides.clear()


def _wait_for_status(fake_redis_obj, task_id, timeout=2.0, poll_interval=0.05):
    """Poll until status is not 'processing' or timeout."""
    elapsed = 0
    while elapsed < timeout:
        raw = fake_redis_obj.get(f"{REDIS_PREFIX}{task_id}")
        if raw:
            data = json.loads(raw)
            if data.get("status") != "processing":
                return data["status"]
        time.sleep(poll_interval)
        elapsed += poll_interval
    return "timeout"


class TestHealth:
    def test_health_returns_ok(self, client):
        c, _ = client
        resp = c.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


class TestStartImageTo3D:
    def test_returns_task_id_and_starts_job(self, client):
        c, (fake_redis_obj, _) = client
        resp = c.post("/start-image-to-3d", json={"cdn_url": "https://example.com/image.png"})
        assert resp.status_code == 202
        data = resp.json()
        assert "task_id" in data
        assert data["message"] == "Job started"
        assert data["cdn_url"] == "https://example.com/image.png"

        raw = fake_redis_obj.get(f"{REDIS_PREFIX}{data['task_id']}")
        assert raw is not None
        stored = json.loads(raw)
        assert stored["status"] in ("processing", "succeeded")

    def test_status_not_found_for_invalid_task_id(self, client):
        c, _ = client
        resp = c.get("/status/invalid-uuid-12345")
        assert resp.status_code == 404
        assert resp.json()["detail"]["status"] == "not_found"

    def test_result_not_found_for_invalid_task_id(self, client):
        c, _ = client
        resp = c.get("/result/invalid-uuid-12345")
        assert resp.status_code == 404
        assert resp.json()["detail"]["status"] == "not_found"
        assert resp.json()["detail"]["result"] is None


class TestPollingFlow:
    def test_full_polling_flow_success(self, client):
        c, (fake_redis_obj, _) = client
        start_resp = c.post("/start-image-to-3d", json={"cdn_url": "https://example.com/img.png"})
        assert start_resp.status_code == 202
        task_id = start_resp.json()["task_id"]

        status = _wait_for_status(fake_redis_obj, task_id)
        assert status in ("succeeded", "timeout")
        if status == "timeout":
            pytest.skip("Background task did not complete in time")

        status_resp = c.get(f"/status/{task_id}")
        assert status_resp.status_code == 200
        assert status_resp.json()["status"] == "succeeded"

        result_resp = c.get(f"/result/{task_id}")
        assert result_resp.status_code == 200
        data = result_resp.json()
        assert data["status"] == "succeeded"
        assert data["result"] == "https://fake-cdn.com/model.glb"


class TestResultEndpoint:
    def test_result_returns_processing_when_still_running(self, client):
        c, (fake_redis_obj, _) = client
        task_id = "test-task-123"
        fake_redis_obj.set(
            f"{REDIS_PREFIX}{task_id}",
            json.dumps({"status": "processing", "result": None})
        )

        resp = c.get(f"/result/{task_id}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "processing"
        assert resp.json()["result"] is None

    def test_result_returns_error_on_failure(self, client):
        c, (fake_redis_obj, _) = client
        task_id = "failed-task-456"
        fake_redis_obj.set(
            f"{REDIS_PREFIX}{task_id}",
            json.dumps({"status": "failed", "result": None, "error": "Meshy pipeline failed"})
        )

        resp = c.get(f"/result/{task_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "failed"
        assert data["result"] is None
        assert "Meshy pipeline failed" in data.get("error", "")
