# Release Checklist

- [x] `npm run lint:arch` passed (`91` files scanned, `0` violations)
- [x] `npm run typecheck` (`vue-tsc --noEmit`) passed (`0` errors)
- [x] `npm test` passed (`54/54` tests, `0` failed, `0` skipped)
- [x] `npm run build` passed (`217` modules, `sourcemap: false`)
- [x] Backend Python syntax check (`py_compile`) passed
- [x] API route & CORS contract mismatches fixed (`/api/v1/audit/verify-chain`, `X-CSRF-Token`, `PATCH`)
- [ ] Run CI `backend-check` (`pip-audit`, `pytest -v`) and `frontend-check` (`npm audit --audit-level=high`) on GitHub Actions runner
- [ ] Confirm `.env.production` secrets (`JWT_SECRET_KEY >= 32 chars`, `MYSQL_*`, `SEED_*`, `CORS_ORIGINS`) on target host
- [ ] Obtain human release approval for `environment: production`
