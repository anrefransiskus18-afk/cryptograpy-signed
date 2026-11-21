import os
from app import create_app
from app.core.security import create_access_token


def test_correlation_id_echo_and_security_headers():
    os.environ.setdefault("APP_ENV", "development")
    app = create_app()
    client = app.test_client()

    custom_cid = "audit-trace-12345"
    res = client.get("/api/v1/health", headers={"X-Correlation-ID": custom_cid})
    assert res.status_code == 200
    assert res.headers.get("X-Correlation-ID") == custom_cid
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert res.headers.get("Cache-Control") == "no-store"

    # Malicious / non-alphanumeric correlation ID should be replaced with a clean UUID
    bad_res = client.get("/api/v1/health", headers={"X-Correlation-ID": "bad<script>alert(1)</script>"})
    assert bad_res.status_code == 200
    assert bad_res.headers.get("X-Correlation-ID") != "bad<script>alert(1)</script>"
    assert len(bad_res.headers.get("X-Correlation-ID", "")) == 36


def test_profile_update_rejects_oversized_fields():
    os.environ.setdefault("APP_ENV", "development")
    app = create_app()
    client = app.test_client()

    token = create_access_token({
        "sub": "admin.security",
        "user_id": 1,
        "role": "SECURITY_ADMIN",
        "clearance_level": 4,
    })
    res = client.put(
        "/api/v1/me",
        json={"full_name": "A" * 200},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400


def test_metrics_endpoint_and_httponly_cookie_auth():
    os.environ.setdefault("APP_ENV", "development")
    app = create_app()
    client = app.test_client()

    metrics_res = client.get("/api/v1/metrics")
    assert metrics_res.status_code == 200
    assert b"app_http_requests_total" in metrics_res.data

    token = create_access_token({
        "sub": "admin.security",
        "user_id": 1,
        "role": "SECURITY_ADMIN",
        "clearance_level": 4,
    })
    client.set_cookie("access_token_cookie", token)
    me_res = client.get("/api/v1/me")
    assert me_res.status_code == 200
    assert me_res.get_json()["username"] == "admin.security"
