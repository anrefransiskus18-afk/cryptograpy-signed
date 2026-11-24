# Observability Architecture

## 1. End-to-End Telemetry Topology
```text
Vue 3 Frontend (logger.ts + interceptors.ts + ErrorBoundary.vue)
   │  X-Correlation-ID (UUID v4) + performance.now() durationMs
   ▼
Flask Backend (app/__init__.py)
   ├─ before_request / after_request: validates/echoes X-Correlation-ID, logs JSON http_request
   ├─ /health, /api/v1/health: DB readiness probe (SELECT 1)
   └─ /metrics, /api/v1/metrics: Prometheus text exposition
         │
         ▼
Prometheus (v2.55.1, 15s scrape) ──► Grafana (11.3.0)
```

## 2. Implemented Components
- **Frontend Structured Logger**: `frontend/src/utils/logger.ts`
- **HTTP Correlation & Timing**: `frontend/src/api/interceptors.ts`
- **UI Error Boundary**: `frontend/src/components/ErrorBoundary.vue` (`onErrorCaptured`)
- **Backend Request Telemetry, Health & Metrics**: `backend/app/__init__.py`
- **Metrics Stack**: `monitoring/prometheus.yml` + `monitoring/grafana/provisioning/` + `docker-compose.yml`
