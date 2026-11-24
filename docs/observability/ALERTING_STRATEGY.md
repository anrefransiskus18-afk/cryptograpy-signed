# Alerting Strategy

## 1. Alert Severity Matrix
| Severity | Condition | Action / Escalation |
| :--- | :--- | :--- |
| **Critical (P1)** | `/api/v1/health` returns `503` or unreachable for `> 1m` | Verify MySQL & backend container health; inspect `docker compose logs backend` |
| **Critical (P1)** | Audit hash-chain verification failure (`/api/v1/audit/verify-chain`) | Freeze audit exports; escalate to Security Admin for tamper forensics |
| **High (P2)** | `5xx` error rate `> 2%` over `5m` window | Correlate failing `X-Correlation-ID` across frontend & backend JSON logs |
| **Medium (P3)** | Elevated `401`/`422` spikes (`TAMPER_DETECTED` or failed logins) | Inspect `/api/v1/auth-logs` and `/api/v1/audit` for brute-force or corrupted uploads |
