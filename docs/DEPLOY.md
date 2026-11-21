# Panduan Git / GitLab & Deployment (Staging & Production)

## 1. Hubungkan ke GitHub atau GitLab
Repository lokal sudah diinisialisasi pada branch `main` dengan `.gitignore` yang melindungi seluruh berkas rahasia (`.env`, `.env.staging`, `.env.production`, `server_audit_key.pem`, `storage/`, `*.db`).

```bash
# Tambah remote GitLab atau GitHub
git remote add origin <URL_REPO_GITLAB_ATAU_GITHUB>

# Commit & push awal
git add .
git commit -m "chore: initial enterprise release with staging and production config"
git push -u origin main

# Opsional: buat branch staging
git checkout -b staging
git push -u origin staging
```

## 2. Siapkan Environment Staging & Production
```bash
# Generate secret acak untuk JWT_SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"

# Staging
cp .env.staging.example .env.staging
# Isi seluruh password, JWT_SECRET_KEY, dan CORS_ORIGINS di .env.staging

# Production
cp .env.production.example .env.production
# Isi seluruh password, JWT_SECRET_KEY, dan CORS_ORIGINS di .env.production
```

## 3. Deploy dengan Docker Compose
```bash
# Deploy Staging (Frontend :5174, Backend :8001, MySQL :3307)
docker compose -p ptxyz-staging --env-file .env.staging up -d --build

# Deploy Production (Frontend :5173, Backend :8000, MySQL :3306)
docker compose -p ptxyz-prod --env-file .env.production up -d --build
```

> **Catatan Produksi:** Pasang reverse proxy TLS/HTTPS (mis. Nginx/Caddy/Traefik) di depan port `5173` dengan sertifikat SSL aktif dan header `Strict-Transport-Security`.
