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


class _FakeRedisPipeline:
    def __init__(self, store: dict):
        self._store = store
        self._ops = []

    def zremrangebyscore(self, key: str, min_score: float, max_score: float):
        self._ops.append(("zremrangebyscore", key, min_score, max_score))
        return self

    def zcard(self, key: str):
        self._ops.append(("zcard", key))
        return self

    def zadd(self, key: str, mapping: dict):
        self._ops.append(("zadd", key, mapping))
        return self

    def expire(self, key: str, ttl: int):
        self._ops.append(("expire", key, ttl))
        return self

    def execute(self):
        results = []
        for op in self._ops:
            kind = op[0]
            key = op[1]
            if kind == "zremrangebyscore":
                _, _, min_s, max_s = op
                zset = self._store.setdefault(key, {})
                removed = [m for m, s in zset.items() if min_s <= s <= max_s]
                for m in removed:
                    del zset[m]
                results.append(len(removed))
            elif kind == "zcard":
                results.append(len(self._store.get(key, {})))
            elif kind == "zadd":
                zset = self._store.setdefault(key, {})
                zset.update(op[2])
                results.append(len(op[2]))
            elif kind == "expire":
                results.append(True)
        self._ops.clear()
        return results


class _FakeRedis:
    def __init__(self):
        self.kv = {}
        self.zsets = {}

    def setex(self, key: str, ttl: int, value: str):
        self.kv[key] = (value, ttl)

    def exists(self, key: str) -> int:
        return 1 if key in self.kv else 0

    def pipeline(self):
        return _FakeRedisPipeline(self.zsets)


def test_redis_token_blocklist_and_rate_limiter(monkeypatch):
    from app.core import security

    fake_redis = _FakeRedis()
    monkeypatch.setattr(security, "_get_redis_client", lambda: fake_redis)

    security.revoke_token("jti-redis-123", exp=9999999999)
    assert "revoked_jwt:jti-redis-123" in fake_redis.kv
    security._REVOKED_TOKENS.clear()
    assert security._is_token_revoked("jti-redis-123") is True

    key = "login:test-redis-ip"
    assert security.check_rate_limit(key, max_requests=2, window_seconds=60) is True
    assert security.check_rate_limit(key, max_requests=2, window_seconds=60) is True
    assert security.check_rate_limit(key, max_requests=2, window_seconds=60) is False

