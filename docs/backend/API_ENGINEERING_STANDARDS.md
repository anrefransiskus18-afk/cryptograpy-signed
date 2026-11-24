# Backend API Engineering Standards

## 1. Versioning & Routing
- Canonical versioned prefix: `/api/v1/*` with legacy `/api/*` aliases maintained for backward compatibility.
- Centralized error handlers in `backend/app/__init__.py` normalize `404`, `405`, `413`, and `500` into `{"detail": "..."}` JSON payloads.

## 2. Request Correlation, CORS & Security Headers
- `@app.before_request`: Validates incoming `X-Correlation-ID` (`[A-Za-z0-9._-]{1,64}`) or generates a UUID v4 (`g.correlation_id`).
- `@app.after_request`:
  - Echoes `X-Correlation-ID`
  - Sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`
  - Sets `Cache-Control: no-store` on `/api/*`
  - Configures CORS (`Access-Control-Allow-Headers: Content-Type, Authorization, X-Correlation-ID, X-CSRF-Token`, `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`, `Access-Control-Expose-Headers` for crypto telemetry).
