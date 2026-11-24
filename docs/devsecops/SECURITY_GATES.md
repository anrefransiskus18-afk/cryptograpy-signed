# Security Gates

## 1. Implemented Automated Gates
- **Static Architecture & Security Rules (`scripts/check-architecture.mjs`)**: Blocks `eval`, `new Function`, `v-html`, `console.*` in `src/`, and `Math.random()` in cryptographic modules.
- **Backend Production Config Gate (`Config.validate_for_production`)**: Fails startup in `APP_ENV=production` if `JWT_SECRET_KEY`, `DATABASE_URL`, `SEED_DEFAULT_PASSWORD`, `SEED_KEY_PASSPHRASE`, or `CORS_ORIGINS` retain development defaults or wildcards.
- **Dependency SCA**: `pip-audit -r requirements.txt` (backend) and `npm audit --audit-level=high` (frontend) in CI.
- **Build Artifact Hygiene**: Vite builds with `sourcemap: false`; CI verifies `dist/` has zero `.map` files and zero private key or default JWT secret strings.

## 2. Environment-Dependent Gates
- In this offline sandbox (`registry.npmjs.org` unreachable and Flask not installed in system Python), `pip-audit`, `npm audit`, and `pytest` collection cannot run locally and must execute in CI or a provisioned container/venv.
