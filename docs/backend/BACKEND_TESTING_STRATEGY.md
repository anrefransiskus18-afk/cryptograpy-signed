# Backend Testing Strategy

## 1. Existing Test Suites (`backend/tests/`)
- `test_api_workflow.py` — End-to-end API authentication, key generation, encryption, decryption, document listing, and audit workflow tests
- `test_crypto_engine.py` — AES-256-GCM, ECC NIST P-256, HKDF-SHA256, `HC01`/`HC02` container packing/unpacking, and tamper detection tests
- `test_lazy_dto.py` — Backend `Lazy` DTO serialization and validation tests
- `test_security_hardening.py` — RBAC, lockout, path traversal, and security header checks
- `run_performance_benchmarks.py` — Throughput, entropy, avalanche effect, and 12-scenario tamper detection benchmark runner

## 2. Execution Status in Current Environment
- **Python Syntax Validation**: `python3 -m py_compile` passed across all modules in `backend/app/`.
- **Pytest Execution**: `pytest -v` could not collect tests in this local environment because `flask` (and `backend/requirements.txt` packages) are not installed in system Python (`/usr/bin/python3`) and the sandbox has no network access to PyPI. Full `pytest -v` runs in `.github/workflows/ci.yml` (`backend-check` job).
