# Metrics and SLOs

## 1. Exposed Prometheus Metrics (`/api/v1/metrics`, scraped every `15s`)
- `app_http_requests_total` (counter)
- `app_http_errors_4xx_total` (counter)
- `app_http_errors_5xx_total` (counter)
- `app_http_request_duration_seconds_sum` (counter)
- `app_http_request_duration_seconds_count` (counter)

## 2. Health & Readiness Endpoints
- `GET /health`, `GET /api/health`, `GET /api/v1/health`: Executes `SELECT 1` against MySQL/SQLite; returns HTTP `200` (`status: "ok"`) or HTTP `503` (`status: "degraded"`).

## 3. Target SLIs & SLOs (Design Targets — Not Historical Measurements)
| SLI | Target SLO | Measurement Source |
| :--- | :--- | :--- |
| API Availability (non-5xx ratio) | `>= 99.5%` | `1 - (rate(app_http_errors_5xx_total[5m]) / rate(app_http_requests_total[5m]))` |
| API Mean Request Latency | `<= 250 ms` (non-bulk) | `rate(app_http_request_duration_seconds_sum[5m]) / rate(app_http_request_duration_seconds_count[5m])` |
| Readiness Probe Success | `>= 99.9%` | `/api/v1/health` HTTP `200` |
| Tamper Detection Accuracy | `100%` | AES-GCM tag verification (`12/12` benchmark scenarios) |
