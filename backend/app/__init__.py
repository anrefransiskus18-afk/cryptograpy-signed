import logging
from flask import Flask, jsonify, request
from sqlalchemy import text, inspect
from .database import engine, Base, get_db_session
from .core.config import Config, DEFAULT_JWT_SECRET
from .core.security import get_password_hash
from .models import (
    Role,
    User,
    UserRole,
    PublicKey,
    UserKey,
    Document,
    DocumentRecipient,
    EncryptionMetadata,
    AuditLog,
    AuthenticationLog,
)
from .repositories import KeyRepository
from .cryptography.hybrid_engine import HybridCryptoEngine
from .services.AuditService import AuditService

from .api.auth import auth_bp
from .api.dashboard import dashboard_bp
from .api.users import users_bp
from .api.keys import keys_bp
from .api.encryption import encryption_bp
from .api.decryption import decryption_bp
from .api.documents import documents_bp
from .api.audit import audit_bp

logger = logging.getLogger(__name__)


def _ensure_schema_columns():
    """Memastikan kolom-kolom baru tersedia pada tabel MySQL/SQLite yang sudah ada."""
    insp = inspect(engine)
    existing_tables = set(insp.get_table_names())
    with engine.connect() as conn:
        if "users" in existing_tables:
            cols = {c["name"] for c in insp.get_columns("users")}
            if "nik" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN nik VARCHAR(30) NULL"))
            if "deleted_at" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL"))
            if "updated_at" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN updated_at DATETIME NULL"))
            if "password_changed_at" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_changed_at DATETIME NULL"))
            conn.commit()
        if "audit_logs" in existing_tables:
            cols = {c["name"] for c in insp.get_columns("audit_logs")}
            if "status" not in cols:
                conn.execute(text("ALTER TABLE audit_logs ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS'"))
            if "document_id" not in cols:
                conn.execute(text("ALTER TABLE audit_logs ADD COLUMN document_id INTEGER NULL"))
            conn.commit()


def init_database_and_seed():
    """Membuat skema 9+ tabel MySQL 8.0 / SQLite dan mengisi data awal (Roles, Users, ECC Keys)."""
    url_str = engine.url.render_as_string(hide_password=False)
    if url_str.startswith("mysql"):
        raw_url = url_str.rsplit("/", 1)[0]
        from sqlalchemy import create_engine as _ce
        try:
            root_engine = _ce(raw_url)
            with root_engine.connect() as conn:
                conn.execute(text(
                    "CREATE DATABASE IF NOT EXISTS hybrid_crypto_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
                ))
                conn.commit()
            root_engine.dispose()
        except Exception:
            pass

    Base.metadata.create_all(bind=engine)
    try:
        _ensure_schema_columns()
    except Exception:
        logger.exception("Gagal menyelaraskan kolom skema database (migrasi ringan dilewati).")

    db = get_db_session()
    try:
        default_roles = [
            ("STAFF", 1, "Staf Operasional Internal — Enkripsi & Akses Dokumen Operasional"),
            ("AUTHORIZED_RECIPIENT", 2, "Penerima Dokumen Berwenang — Dekripsi & Verifikasi Dokumen"),
            ("MANAGER", 2, "Manajer Departemen — Akses Dokumen Rahasia Divisi"),
            ("EXECUTIVE", 3, "Direksi / Eksekutif — Akses Dokumen Strategis Sangat Rahasia"),
            ("SECURITY_ADMIN", 4, "Administrator Keamanan & Auditor Kriptografi"),
            ("ADMINISTRATOR", 4, "Administrator Sistem TI — Pengelolaan Penuh Pengguna, Role & Konfigurasi"),
        ]
        existing_roles = {r.name: r for r in db.query(Role).all()}
        for r_name, clearance, desc in default_roles:
            if r_name not in existing_roles:
                db.add(Role(name=r_name, clearance_level=clearance, description=desc))
        db.commit()

        role_map = {r.name: r.id for r in db.query(Role).all()}

        seed_specs = [
            ("XYZ-IT-001", "admin.security", "admin.security@enterprise.co.id", "Anre Franciscus (Chief Security Engineer)", "Cybersecurity & Cryptography Division", "SECURITY_ADMIN"),
            ("XYZ-MGT-001", "direktur.keuangan", "direktur.keuangan@enterprise.co.id", "Dr. Hendra Wijaya (Direktur Keuangan)", "Executive Board & Finance", "EXECUTIVE"),
            ("XYZ-RND-001", "manajer.riset", "manajer.riset@enterprise.co.id", "Citra Lestari (Manajer R&D)", "Research & Product Engineering", "MANAGER"),
            ("XYZ-OPS-001", "staf.operasional", "staf.operasional@enterprise.co.id", "Budi Santoso (Staf Operasional)", "Internal Operations", "STAFF"),
            ("XYZ-REC-001", "penerima.sah", "penerima.sah@enterprise.co.id", "Dewi Kartika (Authorized Recipient)", "Legal & Compliance Division", "AUTHORIZED_RECIPIENT"),
        ]

        existing_usernames = {u.username for u in db.query(User).all()}
        new_users_added = False
        default_pass_hash = None

        for nik, uname, email, fname, dept, rname in seed_specs:
            if uname not in existing_usernames:
                if default_pass_hash is None:
                    default_pass_hash = get_password_hash(Config.SEED_DEFAULT_PASSWORD)
                u = User(
                    nik=nik,
                    username=uname,
                    email=email,
                    password_hash=default_pass_hash,
                    full_name=fname,
                    department=dept,
                    role_id=role_map[rname],
                    is_active=True,
                )
                db.add(u)
                new_users_added = True
        if new_users_added:
            db.commit()

        # Pastikan setiap user memiliki UserRole, NIK, dan pasangan kunci pada `public_keys` serta `user_keys`
        for u in db.query(User).all():
            if not u.nik:
                u.nik = f"XYZ-{u.id:04d}"
            has_ur = db.query(UserRole).filter(UserRole.user_id == u.id, UserRole.role_id == u.role_id).first()
            if not has_ur:
                db.add(UserRole(user_id=u.id, role_id=u.role_id, assigned_by="SYSTEM_BOOTSTRAP"))

            active_pub = db.query(PublicKey).filter(PublicKey.user_id == u.id, PublicKey.is_revoked == False).first()
            active_ukey = db.query(UserKey).filter(UserKey.user_id == u.id, UserKey.is_revoked == False).first()
            if not active_pub or not active_ukey:
                bundle = HybridCryptoEngine.generate_ecc_keypair(Config.SEED_KEY_PASSPHRASE)
                KeyRepository.register_keypair(
                    db=db,
                    user_id=u.id,
                    fingerprint=bundle["fingerprint"],
                    public_key_pem=bundle["public_key_pem"],
                    encrypted_private_key_pem=bundle["private_key_pkcs8_pem"],
                )
        db.commit()

        if db.query(AuditLog).count() == 0:
            AuditService.record_event(
                db=db,
                actor_identity="SYSTEM_BOOTSTRAP",
                action_type="KEY_GENERATED",
                ip_address="127.0.0.1",
                status="SUCCESS",
                metadata={"event": "Initial PT XYZ enterprise users and ECC NIST P-256 directory initialized"},
            )
    finally:
        db.close()


def _resolve_cors_origin(request_origin: str | None) -> str | None:
    """Kembalikan origin yang boleh mengakses API berdasarkan `Config.CORS_ORIGINS`."""
    allowed = [o.strip() for o in Config.CORS_ORIGINS.split(",") if o.strip()]
    if "*" in allowed:
        return "*"
    if request_origin and request_origin in allowed:
        return request_origin
    return None


def create_app() -> Flask:
    import os
    import re
    import threading
    import uuid
    from flask import g, Response
    from werkzeug.middleware.proxy_fix import ProxyFix

    Config.validate_for_production()  # gagal start bila produksi memakai rahasia bawaan
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH

    _metrics_lock = threading.Lock()
    _metrics_state = {"requests_total": 0, "errors_4xx": 0, "errors_5xx": 0}

    if Config.IS_PRODUCTION or os.getenv("TRUST_PROXY", "").lower() == "true":
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    @app.before_request
    def attach_correlation_id():
        incoming = (request.headers.get("X-Correlation-ID") or "").strip()
        if incoming and re.fullmatch(r"[A-Za-z0-9._-]{1,64}", incoming):
            g.correlation_id = incoming
        else:
            g.correlation_id = str(uuid.uuid4())

    @app.after_request
    def add_cors_and_security_headers(response):
        allowed_origin = _resolve_cors_origin(request.headers.get("Origin"))
        if allowed_origin:
            response.headers["Access-Control-Allow-Origin"] = allowed_origin
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Correlation-ID"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Expose-Headers"] = (
                "Content-Disposition, X-Container-Header, X-Recipient-Fingerprint, "
                "X-GCM-Auth-Status, X-Document-Id, X-Encryption-Time-Ms, X-Shannon-Entropy, X-Correlation-ID"
            )
            if allowed_origin != "*":
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers.add("Vary", "Origin")
        cid = getattr(g, "correlation_id", None)
        if cid:
            response.headers["X-Correlation-ID"] = cid
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "no-referrer"
        # Respons API memuat data sensitif: jangan biarkan browser / proxy menyimpannya di cache
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        with _metrics_lock:
            _metrics_state["requests_total"] += 1
            if 400 <= response.status_code < 500:
                _metrics_state["errors_4xx"] += 1
            elif response.status_code >= 500:
                _metrics_state["errors_5xx"] += 1
        return response

    @app.route("/api/<path:subpath>", methods=["OPTIONS"])
    @app.route("/api/v1/<path:subpath>", methods=["OPTIONS"])
    def handle_options(subpath):
        return ("", 204)

    @app.route("/health", methods=["GET"])
    @app.route("/api/health", methods=["GET"])
    @app.route("/api/v1/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "ok",
            "framework": Config.APP_NAME,
            "version": Config.VERSION,
            "crypto": "AES-256-GCM + ECC NIST P-256 + ECDH + HKDF-SHA256 + Argon2id",
        })

    @app.route("/metrics", methods=["GET"])
    @app.route("/api/v1/metrics", methods=["GET"])
    def prometheus_metrics():
        with _metrics_lock:
            req_total = _metrics_state["requests_total"]
            err_4xx = _metrics_state["errors_4xx"]
            err_5xx = _metrics_state["errors_5xx"]
        body = (
            "# HELP app_http_requests_total Total HTTP requests handled\n"
            "# TYPE app_http_requests_total counter\n"
            f"app_http_requests_total {req_total}\n"
            "# HELP app_http_errors_4xx_total Total HTTP 4xx responses\n"
            "# TYPE app_http_errors_4xx_total counter\n"
            f"app_http_errors_4xx_total {err_4xx}\n"
            "# HELP app_http_errors_5xx_total Total HTTP 5xx responses\n"
            "# TYPE app_http_errors_5xx_total counter\n"
            f"app_http_errors_5xx_total {err_5xx}\n"
        )
        return Response(body, mimetype="text/plain; version=0.0.4; charset=utf-8")

    @app.errorhandler(413)
    def handle_file_too_large(_err):
        max_mb = Config.MAX_CONTENT_LENGTH // (1024 * 1024)
        return jsonify({
            "detail": f"Ukuran berkas yang diunggah melebihi batas maksimum sistem ({max_mb} MB)."
        }), 413

    @app.errorhandler(404)
    def handle_not_found(_err):
        return jsonify({"detail": "Endpoint atau sumber daya yang diminta tidak ditemukan."}), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(_err):
        return jsonify({"detail": "Metode HTTP tidak diizinkan untuk endpoint ini."}), 405

    @app.errorhandler(500)
    def handle_internal_error(err):
        # Catat jejak error di log server (tidak dikirim ke klien) agar mudah ditelusuri
        app.logger.error("Unhandled server error: %s", getattr(err, "original_exception", err), exc_info=getattr(err, "original_exception", None))
        return jsonify({"detail": "Terjadi kesalahan internal pada server."}), 500

    if Config.JWT_SECRET_KEY == DEFAULT_JWT_SECRET:
        app.logger.warning(
            "JWT_SECRET_KEY masih memakai nilai bawaan. Setel environment variable JWT_SECRET_KEY "
            "dengan nilai acak yang kuat sebelum digunakan di lingkungan produksi."
        )

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(keys_bp)
    app.register_blueprint(encryption_bp)
    app.register_blueprint(decryption_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(audit_bp)

    return app
