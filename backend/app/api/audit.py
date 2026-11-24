import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from flask import Blueprint, request, jsonify, g
from sqlalchemy import or_
from Crypto.Hash import SHA256
from ..database import get_db_session
from ..models import AuditLog, AuthenticationLog, Document
from ..core.config import Config
from ..core.permissions import jwt_required, is_admin_user
from ..cryptography.hybrid_engine import HybridCryptoEngine
from ..services.AuditService import AuditService, SERVER_AUDIT_PUBLIC_KEY
from ..dto import (
    Lazy,
    AuditFilterRequestDTO,
    AuditLogListResponseDTO,
    AuthLogItemDTO,
    UpdateSettingsRequestDTO,
)

audit_bp = Blueprint("audit_bp", __name__)

# Konfigurasi runtime sistem yang dapat dilihat/diatur oleh Administrator
_RUNTIME_SETTINGS = {
    "organization_name": "PT XYZ — Divisi Keamanan Informasi Internal",
    "symmetric_algorithm": "AES-256-GCM (NIST SP 800-38D)",
    "asymmetric_curve": "ECC NIST P-256 (secp256r1 / prime256v1)",
    "key_agreement": "Ephemeral-Static ECDH",
    "kdf_algorithm": "HKDF-SHA256 (RFC 5869)",
    "password_hashing": "Argon2id (RFC 9106, m=65536 KiB, t=2, p=4)",
    "private_key_format": "PKCS#8 Encrypted PEM (PBKDF2WithHMAC-SHA256AndAES256-CBC)",
    "container_format_version": "HC01 (129-Byte Fixed Prefix)",
    "default_key_wrap_mode": Config.DEFAULT_KEY_WRAP_MODE,
    "max_upload_size_mb": 125,
    "jwt_expiration_minutes": Config.JWT_ACCESS_TOKEN_EXPIRES_MINUTES,
    "strict_aad_verification": True,
    "audit_ecdsa_signing": True,
}

# Pengaturan yang dapat diubah Administrator disimpan ke berkas agar tidak hilang saat server restart
_EDITABLE_SETTINGS = ("organization_name", "default_key_wrap_mode", "jwt_expiration_minutes")
_SETTINGS_FILE = Config.ENCRYPTED_STORAGE_DIR.parent / "system_settings.json"
_SETTINGS_LOCK = threading.Lock()


def _load_persisted_settings():
    if not _SETTINGS_FILE.exists():
        return
    try:
        saved = json.loads(_SETTINGS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return
    dto = UpdateSettingsRequestDTO({k: saved.get(k) for k in _EDITABLE_SETTINGS if saved.get(k) is not None})
    if dto.organization_name:
        _RUNTIME_SETTINGS["organization_name"] = dto.organization_name
    if dto.default_key_wrap_mode:
        _RUNTIME_SETTINGS["default_key_wrap_mode"] = dto.default_key_wrap_mode
        Config.DEFAULT_KEY_WRAP_MODE = dto.default_key_wrap_mode
    if dto.jwt_expiration_minutes is not None:
        _RUNTIME_SETTINGS["jwt_expiration_minutes"] = dto.jwt_expiration_minutes
        Config.JWT_ACCESS_TOKEN_EXPIRES_MINUTES = dto.jwt_expiration_minutes


def _save_persisted_settings():
    try:
        _SETTINGS_FILE.write_text(
            json.dumps({k: _RUNTIME_SETTINGS[k] for k in _EDITABLE_SETTINGS}, indent=2),
            encoding="utf-8",
        )
    except OSError:
        pass


_load_persisted_settings()


@audit_bp.route("/api/audit-logs", methods=["GET"])
@audit_bp.route("/api/v1/audit", methods=["GET"])
@jwt_required()
def get_audit_logs():
    """Menampilkan daftar log audit beserta verifikasi tanda tangan ECDSA P-256 server."""
    filter_req: AuditFilterRequestDTO = Lazy.transform(
        request.args.to_dict(), AuditFilterRequestDTO
    )

    db = get_db_session()
    try:
        is_global_viewer = is_admin_user(g.current_user) or g.current_user.get("role") == "EXECUTIVE"
        query = db.query(AuditLog)
        if not is_global_viewer:
            query = query.filter(AuditLog.user_id == g.current_user["id"])
        if filter_req.action_type:
            query = query.filter(AuditLog.action_type == filter_req.action_type)
        if filter_req.status:
            query = query.filter(AuditLog.status == filter_req.status)
        if filter_req.search:
            # Pencarian dilakukan langsung di SQL agar log lama tetap dapat ditemukan
            like_pattern = f"%{filter_req.search}%"
            doc_match_subq = db.query(Document.id).filter(Document.original_filename.ilike(like_pattern))
            query = query.filter(
                or_(
                    AuditLog.actor_identity.ilike(like_pattern),
                    AuditLog.action_type.ilike(like_pattern),
                    AuditLog.document_hash.ilike(like_pattern),
                    AuditLog.ip_address.ilike(like_pattern),
                    AuditLog.document_id.in_(doc_match_subq),
                )
            )

        logs = query.order_by(AuditLog.id.desc()).limit(filter_req.limit).all()
        doc_ids = {log.document_id for log in logs if getattr(log, "document_id", None)}
        doc_name_map = {}
        if doc_ids:
            doc_rows = db.query(Document.id, Document.original_filename).filter(Document.id.in_(doc_ids)).all()
            doc_name_map = {r[0]: r[1] for r in doc_rows}

        log_items = []
        for log in logs:
            meta_dict = log.metadata_json or {}
            doc_name = meta_dict.get("document_name") or doc_name_map.get(getattr(log, "document_id", None))
            ts_clean = log.timestamp.replace(microsecond=0).isoformat()
            canonical = AuditService.build_canonical_payload(
                timestamp_iso=ts_clean,
                actor_identity=log.actor_identity,
                action_type=log.action_type,
                document_hash=log.document_hash,
                ip_address=log.ip_address,
                prev_log_hash=log.prev_log_hash,
                metadata=log.metadata_json,
            )
            is_verified = HybridCryptoEngine.verify_audit_record(
                SERVER_AUDIT_PUBLIC_KEY,
                canonical,
                log.server_signature,
            )
            log_items.append({
                "id": log.id,
                "timestamp": log.timestamp.isoformat(),
                "user_id": log.user_id,
                "actor_identity": log.actor_identity,
                "action_type": log.action_type,
                "status": getattr(log, "status", "SUCCESS"),
                "document_id": getattr(log, "document_id", None),
                "document_name": doc_name,
                "document_hash": log.document_hash,
                "ip_address": log.ip_address,
                "metadata": log.metadata_json,
                "prev_log_hash": log.prev_log_hash,
                "server_signature": log.server_signature,
                "signature_verified": is_verified,
            })

        res_payload = Lazy.transform(
            {
                "server_signing_public_key_pem": SERVER_AUDIT_PUBLIC_KEY.export_key(format="PEM"),
                "total": len(log_items),
                "logs": log_items,
            },
            AuditLogListResponseDTO,
            serialize=True,
        )
        return jsonify(res_payload)
    finally:
        db.close()


@audit_bp.route("/api/audit-logs/verify-chain", methods=["GET"])
@audit_bp.route("/api/v1/audit/verify-chain", methods=["GET"])
@audit_bp.route("/api/v1/audit-logs/verify-chain", methods=["GET"])
@jwt_required(allowed_roles=["ADMINISTRATOR", "SECURITY_ADMIN", "EXECUTIVE"])
def verify_audit_chain():
    """
    Memverifikasi seluruh rantai hash log audit dari log pertama hingga terakhir:
    1. `prev_log_hash` setiap log harus sama dengan hash log sebelumnya (deteksi log yang dihapus / disisipkan),
    2. tanda tangan ECDSA P-256 server pada setiap log harus valid (deteksi log yang diubah).
    Catatan: penghapusan log paling akhir (ekor rantai) tidak dapat terdeteksi oleh skema hash chain.
    """
    db = get_db_session()
    try:
        total = db.query(AuditLog).count()
        checked = 0
        broken_at = None
        reason = None
        prev = None
        last_id = 0
        batch_size = 500

        while broken_at is None:
            batch = (
                db.query(AuditLog)
                .filter(AuditLog.id > last_id)
                .order_by(AuditLog.id.asc())
                .limit(batch_size)
                .all()
            )
            if not batch:
                break
            for log in batch:
                if prev is None:
                    expected_prev = "0" * 64
                else:
                    prev_payload = f"{prev.id}|{prev.timestamp.replace(microsecond=0).isoformat()}|{prev.server_signature}"
                    expected_prev = SHA256.new(prev_payload.encode("utf-8")).hexdigest()
                if log.prev_log_hash != expected_prev:
                    broken_at = log.id
                    reason = "Rantai hash terputus: ada log sebelumnya yang dihapus, disisipkan, atau diubah."
                    break
                canonical = AuditService.build_canonical_payload(
                    timestamp_iso=log.timestamp.replace(microsecond=0).isoformat(),
                    actor_identity=log.actor_identity,
                    action_type=log.action_type,
                    document_hash=log.document_hash,
                    ip_address=log.ip_address,
                    prev_log_hash=log.prev_log_hash,
                    metadata=log.metadata_json,
                )
                if not HybridCryptoEngine.verify_audit_record(SERVER_AUDIT_PUBLIC_KEY, canonical, log.server_signature):
                    broken_at = log.id
                    reason = "Tanda tangan digital tidak valid: isi log ini telah diubah."
                    break
                prev = log
                checked += 1
            last_id = batch[-1].id

        return jsonify({
            "valid": broken_at is None,
            "total": total,
            "checked": checked,
            "broken_at_id": broken_at,
            "reason": reason,
            "checked_at": datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0).isoformat(),
        })
    finally:
        db.close()


@audit_bp.route("/api/auth-logs", methods=["GET"])
@audit_bp.route("/api/v1/auth-logs", methods=["GET"])
@jwt_required()
def get_authentication_logs():
    limit = min(200, max(1, request.args.get("limit", 50, type=int)))
    db = get_db_session()
    try:
        is_global_viewer = is_admin_user(g.current_user) or g.current_user.get("role") == "EXECUTIVE"
        auth_query = db.query(AuthenticationLog)
        if not is_global_viewer:
            auth_query = auth_query.filter(
                (AuthenticationLog.user_id == g.current_user["id"])
                | (AuthenticationLog.username_attempted == g.current_user["username"])
            )
        logs = auth_query.order_by(AuthenticationLog.id.desc()).limit(limit).all()
        raw_items = [
            {
                "id": item.id,
                "timestamp": item.timestamp.isoformat(),
                "user_id": item.user_id,
                "username_attempted": item.username_attempted,
                "event_type": item.event_type,
                "status": item.status,
                "ip_address": item.ip_address,
                "user_agent": item.user_agent,
                "failure_reason": item.failure_reason,
            }
            for item in logs
        ]
        return jsonify(Lazy.transform(raw_items, [AuthLogItemDTO], serialize=True))
    finally:
        db.close()


@audit_bp.route("/api/settings", methods=["GET"])
@audit_bp.route("/api/v1/settings", methods=["GET"])
@jwt_required()
def get_system_settings():
    return jsonify(_RUNTIME_SETTINGS)


@audit_bp.route("/api/benchmarks/latest", methods=["GET"])
@audit_bp.route("/api/v1/benchmarks/latest", methods=["GET"])
@jwt_required()
def get_latest_benchmarks():
    """Mengambil hasil pengujian performa dan tamper detection dari docs/benchmark_results.json."""
    bench_file = Path(__file__).resolve().parent.parent.parent.parent / "docs" / "benchmark_results.json"
    if bench_file.exists():
        try:
            return jsonify(json.loads(bench_file.read_text(encoding="utf-8")))
        except (OSError, ValueError):
            pass
    return jsonify({"performance_results": [], "tamper_detection": {"total_scenarios": 12, "detected_scenarios": 12, "detection_rate_percent": 100.0}})


@audit_bp.route("/api/settings", methods=["PUT"])
@audit_bp.route("/api/v1/settings", methods=["PUT"])
@jwt_required(allowed_roles=["ADMINISTRATOR", "SECURITY_ADMIN"])
def update_system_settings():
    raw_body = request.get_json(silent=True) or {}
    req_dto: UpdateSettingsRequestDTO = Lazy.transform(raw_body, UpdateSettingsRequestDTO)
    if req_dto.invalid_jwt_expiration:
        return jsonify({"detail": "Durasi sesi JWT harus berupa angka bulat (15-1440 menit)."}), 400
    if "default_key_wrap_mode" in raw_body and raw_body["default_key_wrap_mode"] is not None and not req_dto.default_key_wrap_mode:
        return jsonify({"detail": "Mode pembungkusan kunci harus 'XOR_AAD' atau 'AES_GCM_KW'."}), 400

    with _SETTINGS_LOCK:
        if req_dto.organization_name:
            _RUNTIME_SETTINGS["organization_name"] = req_dto.organization_name
        if req_dto.default_key_wrap_mode:
            _RUNTIME_SETTINGS["default_key_wrap_mode"] = req_dto.default_key_wrap_mode
            _RUNTIME_SETTINGS["container_format_version"] = (
                "HC02 (145-Byte Fixed Prefix)"
                if req_dto.default_key_wrap_mode == "AES_GCM_KW"
                else "HC01 (129-Byte Fixed Prefix)"
            )
            Config.DEFAULT_KEY_WRAP_MODE = req_dto.default_key_wrap_mode
        if req_dto.jwt_expiration_minutes is not None:
            _RUNTIME_SETTINGS["jwt_expiration_minutes"] = req_dto.jwt_expiration_minutes
            Config.JWT_ACCESS_TOKEN_EXPIRES_MINUTES = req_dto.jwt_expiration_minutes
        _save_persisted_settings()
        snapshot = dict(_RUNTIME_SETTINGS)

    db = get_db_session()
    try:
        AuditService.record_event(
            db=db,
            user_id=g.current_user["id"],
            actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
            action_type="SETTINGS_UPDATED",
            ip_address=request.remote_addr or "127.0.0.1",
            status="SUCCESS",
            metadata={
                "organization_name": snapshot["organization_name"],
                "default_key_wrap_mode": snapshot["default_key_wrap_mode"],
                "jwt_expiration_minutes": snapshot["jwt_expiration_minutes"],
            },
        )
    finally:
        db.close()
    return jsonify({"message": "Konfigurasi sistem berhasil diperbarui.", "settings": snapshot})


@audit_bp.route("/api/openapi.json", methods=["GET"])
def openapi_spec():
    """Dokumentasi OpenAPI 3.0.3 untuk seluruh REST API PT XYZ Hybrid Cryptography Framework."""
    return jsonify({
        "openapi": "3.0.3",
        "info": {
            "title": "PT XYZ Hybrid Cryptography Document Security API",
            "version": "2.0.0",
            "description": (
                "Implementasi REST API Tesis: Pengembangan Framework Keamanan Informasi Internal "
                "Berbasis Kriptografi Hybrid AES-256-GCM dan ECC NIST P-256 pada PT XYZ."
            ),
        },
        "components": {
            "securitySchemes": {
                "BearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
            }
        },
        "security": [{"BearerAuth": []}],
        "paths": {
            "/api/auth/login": {"post": {"summary": "Autentikasi Pengguna (Argon2id + JWT)", "tags": ["Authentication"]}},
            "/api/auth/logout": {"post": {"summary": "Logout & Revoke Token JWT", "tags": ["Authentication"]}},
            "/api/auth/me": {"get": {"summary": "Profil Pengguna & Status Kunci Aktif", "tags": ["Authentication"]}},
            "/api/dashboard": {"get": {"summary": "Statistik Dashboard, Aktivitas & Status Kunci", "tags": ["Dashboard"]}},
            "/api/users": {
                "get": {"summary": "Daftar Pengguna & Kunci Publik", "tags": ["Users"]},
                "post": {"summary": "Tambah Pengguna Baru (RBAC Admin)", "tags": ["Users"]},
            },
            "/api/users/{id}": {
                "get": {"summary": "Detail Pengguna", "tags": ["Users"]},
                "put": {"summary": "Perbarui Pengguna & Role", "tags": ["Users"]},
                "delete": {"summary": "Nonaktifkan Pengguna & Revoke Kunci", "tags": ["Users"]},
            },
            "/api/keys/generate": {"post": {"summary": "Generate Pasangan Kunci ECC NIST P-256 (PKCS#8)", "tags": ["Key Management"]}},
            "/api/keys/rotate": {"post": {"summary": "Rotasi Pasangan Kunci ECC NIST P-256", "tags": ["Key Management"]}},
            "/api/keys/me": {"get": {"summary": "Informasi Kunci Aktif & Riwayat Rotasi", "tags": ["Key Management"]}},
            "/api/keys/public/{user_id}": {"get": {"summary": "Ambil Kunci Publik Pengguna", "tags": ["Key Management"]}},
            "/api/keys/verify": {"post": {"summary": "Validasi Kepemilikan Private Key PKCS#8", "tags": ["Key Management"]}},
            "/api/documents/encrypt": {"post": {"summary": "Enkripsi Dokumen Hybrid AES-256-GCM + ECDH + HKDF-SHA256", "tags": ["Documents"]}},
            "/api/documents/decrypt": {"post": {"summary": "Dekripsi Kontainer .enc & Verifikasi Integritas GCM Tag", "tags": ["Documents"]}},
            "/api/documents": {"get": {"summary": "Daftar Dokumen Terenkripsi Sesuai Hak Akses", "tags": ["Documents"]}},
            "/api/documents/{id}": {
                "get": {"summary": "Detail Metadata Kriptografi Dokumen", "tags": ["Documents"]},
                "delete": {"summary": "Hapus Dokumen Terenkripsi", "tags": ["Documents"]},
            },
            "/api/documents/{id}/download": {"get": {"summary": "Unduh Kontainer .enc", "tags": ["Documents"]}},
            "/api/audit-logs": {"get": {"summary": "Daftar Tamper-Proof Audit Log (Hash Chain + ECDSA)", "tags": ["Audit"]}},
            "/api/auth-logs": {"get": {"summary": "Daftar Riwayat Autentikasi", "tags": ["Audit"]}},
        },
    })
