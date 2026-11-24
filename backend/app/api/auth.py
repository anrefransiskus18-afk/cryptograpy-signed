from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func
from ..database import get_db_session
from ..core.config import Config
from ..models import User, AuthenticationLog
from ..repositories import KeyRepository
from ..core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    revoke_token,
    check_rate_limit,
    burn_password_check,
)
from ..core.permissions import jwt_required
from ..schemas import RequestValidator, EMAIL_REGEX
from ..services.AuditService import AuditService
from ..dto import (
    Lazy,
    LoginRequestDTO,
    ChangePasswordRequestDTO,
    UpdateProfileRequestDTO,
    UserProfileDTO,
    LoginResponseDTO,
)

auth_bp = Blueprint("auth_bp", __name__)


def _is_account_locked(db, username: str) -> bool:
    """
    Akun terkunci sementara bila jumlah login gagal (kredensial salah) mencapai batas dalam jendela waktu,
    dihitung sejak login sukses terakhir. Data dibaca dari tabel `authentication_logs`, sehingga tetap
    berlaku setelah server restart dan konsisten antar-proses.
    """
    key = (username or "").strip().lower()
    if not key:
        return False
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    since = now - timedelta(seconds=Config.LOGIN_LOCKOUT_SECONDS)
    last_success = db.query(func.max(AuthenticationLog.timestamp)).filter(
        func.lower(AuthenticationLog.username_attempted) == key,
        AuthenticationLog.event_type == "LOGIN_SUCCESS",
    ).scalar()
    if last_success and last_success > since:
        since = last_success
    failures = db.query(func.count(AuthenticationLog.id)).filter(
        func.lower(AuthenticationLog.username_attempted) == key,
        AuthenticationLog.event_type == "LOGIN_FAILED",
        AuthenticationLog.failure_reason == "Invalid credentials",
        AuthenticationLog.timestamp > since,
    ).scalar() or 0
    return failures >= Config.LOGIN_MAX_FAILED_ATTEMPTS


def handle_login():
    raw_body = request.get_json(silent=True) or request.form.to_dict() or {}
    login_req: LoginRequestDTO = Lazy.transform(raw_body, LoginRequestDTO)
    username = login_req.username
    password = login_req.password
    client_ip = request.remote_addr or "127.0.0.1"
    user_agent = request.headers.get("User-Agent", "")

    if not check_rate_limit(
        f"login:{client_ip}",
        max_requests=Config.RATE_LIMIT_LOGIN_MAX,
        window_seconds=Config.RATE_LIMIT_WINDOW_SECONDS,
    ):
        return jsonify({"detail": "Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit."}), 429

    valid, msg = RequestValidator.validate_login({"username": username, "password": password})
    if not valid:
        return jsonify({"detail": msg}), 400

    db = get_db_session()
    try:
        if _is_account_locked(db, username):
            AuditService.record_auth_event(
                db=db,
                username_attempted=username,
                event_type="LOGIN_LOCKED",
                status="FAILED",
                ip_address=client_ip,
                user_agent=user_agent,
                failure_reason="Account temporarily locked (too many failed attempts)",
            )
            minutes = max(1, Config.LOGIN_LOCKOUT_SECONDS // 60)
            return jsonify({
                "detail": f"Akun dikunci sementara karena terlalu banyak percobaan login gagal. Coba lagi dalam {minutes} menit."
            }), 429

        user = db.query(User).filter(
            (User.username == username) | (User.email == username) | (User.nik == username)
        ).first()

        if not user or getattr(user, "deleted_at", None) is not None or not verify_password(password, user.password_hash):
            if not user:
                burn_password_check(password)  # samakan waktu respons dengan username yang valid
            AuditService.record_auth_event(
                db=db,
                username_attempted=username,
                event_type="LOGIN_FAILED",
                status="FAILED",
                ip_address=client_ip,
                user_id=user.id if user else None,
                user_agent=user_agent,
                failure_reason="Invalid credentials",
            )
            AuditService.record_event(
                db=db,
                actor_identity=username or "UNKNOWN",
                action_type="UNAUTHORIZED_ACCESS",
                ip_address=client_ip,
                status="FAILURE",
                metadata={"reason": "Invalid username or password"},
            )
            return jsonify({"detail": "Username/Email atau password salah."}), 401

        if not user.is_active:
            AuditService.record_auth_event(
                db=db,
                username_attempted=username,
                event_type="LOGIN_FAILED",
                status="FAILED",
                ip_address=client_ip,
                user_id=user.id,
                user_agent=user_agent,
                failure_reason="Account disabled",
            )
            return jsonify({"detail": "Akun pengguna dinonaktifkan."}), 403

        # Auto-upgrade hash dari PBKDF2 ke Argon2id saat login berhasil
        if user.password_hash.startswith("pbkdf2_sha256$"):
            user.password_hash = get_password_hash(password)
            db.commit()

        access_token = create_access_token({
            "sub": user.username,
            "user_id": user.id,
            "role": user.role.name,
            "clearance_level": user.role.clearance_level,
        })

        active_key = KeyRepository.get_active_public_key_by_user(db, user.id)
        user_key = KeyRepository.get_active_user_key(db, user.id)

        AuditService.record_auth_event(
            db=db,
            username_attempted=user.username,
            event_type="LOGIN_SUCCESS",
            status="SUCCESS",
            ip_address=client_ip,
            user_id=user.id,
            user_agent=user_agent,
        )
        AuditService.record_event(
            db=db,
            user_id=user.id,
            actor_identity=f"{user.username} ({user.role.name})",
            action_type="LOGIN",
            ip_address=client_ip,
            status="SUCCESS",
            metadata={"department": user.department, "clearance": user.role.clearance_level},
        )

        res_payload = Lazy.transform(
            {
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": user.id,
                    "nik": user.nik or f"XYZ-{user.id:04d}",
                    "username": user.username,
                    "email": user.email,
                    "full_name": user.full_name,
                    "department": user.department,
                    "role": user.role.name,
                    "clearance_level": user.role.clearance_level,
                    "active_key_fingerprint": active_key.key_fingerprint if active_key else None,
                    "has_encrypted_private_key": bool(user_key and user_key.encrypted_private_key_pem),
                },
            },
            LoginResponseDTO,
            serialize=True,
        )
        cookie_secure = Config.IS_PRODUCTION or Config.COOKIE_SAMESITE.lower() == "none"
        response = jsonify(res_payload)
        response.set_cookie(
            "access_token_cookie",
            access_token,
            max_age=Config.JWT_ACCESS_TOKEN_EXPIRES_MINUTES * 60,
            httponly=True,
            secure=cookie_secure,
            samesite=Config.COOKIE_SAMESITE,
            path="/",
        )
        return response
    finally:
        db.close()


def handle_logout():
    client_ip = request.remote_addr or "127.0.0.1"
    user_agent = request.headers.get("User-Agent", "")
    revoke_token(g.current_user.get("jti"), g.current_user.get("exp"))

    db = get_db_session()
    try:
        AuditService.record_auth_event(
            db=db,
            username_attempted=g.current_user["username"],
            event_type="LOGOUT",
            status="SUCCESS",
            ip_address=client_ip,
            user_id=g.current_user["id"],
            user_agent=user_agent,
        )
        AuditService.record_event(
            db=db,
            user_id=g.current_user["id"],
            actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
            action_type="LOGOUT",
            ip_address=client_ip,
            status="SUCCESS",
            metadata={"event": "User session terminated and JWT revoked"},
        )
        cookie_secure = Config.IS_PRODUCTION or Config.COOKIE_SAMESITE.lower() == "none"
        response = jsonify({"message": "Logout berhasil. Token sesi telah dicabut."})
        response.delete_cookie(
            "access_token_cookie",
            path="/",
            samesite=Config.COOKIE_SAMESITE,
            secure=cookie_secure,
        )
        return response
    finally:
        db.close()


def handle_me():
    db = get_db_session()
    try:
        active_key = KeyRepository.get_active_public_key_by_user(db, g.current_user["id"])
        user_key = KeyRepository.get_active_user_key(db, g.current_user["id"])

        profile = dict(g.current_user)
        profile["active_key_fingerprint"] = active_key.key_fingerprint if active_key else None
        profile["active_public_key_pem"] = active_key.public_key_pem if active_key else None
        profile["has_encrypted_private_key"] = bool(user_key and user_key.encrypted_private_key_pem)
        return jsonify(Lazy.transform(profile, UserProfileDTO, serialize=True))
    finally:
        db.close()


def handle_update_me():
    req_dto: UpdateProfileRequestDTO = Lazy.transform(
        request.get_json(silent=True) or {}, UpdateProfileRequestDTO
    )
    db = get_db_session()
    try:
        user = db.query(User).filter(User.id == g.current_user["id"], User.deleted_at == None).first()
        if not user:
            return jsonify({"detail": "Pengguna tidak ditemukan."}), 404

        if req_dto.email:
            if not EMAIL_REGEX.match(req_dto.email):
                return jsonify({"detail": "Format alamat email korporat tidak valid."}), 400
            dup = db.query(User).filter(User.email == req_dto.email, User.id != user.id).first()
            if dup:
                return jsonify({"detail": "Alamat email sudah digunakan oleh akun lain."}), 400
            user.email = req_dto.email

        if req_dto.full_name:
            if len(req_dto.full_name) > 150:
                return jsonify({"detail": "Nama lengkap melebihi batas maksimum 150 karakter."}), 400
            user.full_name = req_dto.full_name
        if req_dto.department:
            if len(req_dto.department) > 150:
                return jsonify({"detail": "Nama departemen melebihi batas maksimum 150 karakter."}), 400
            user.department = req_dto.department

        db.commit()
        db.refresh(user)

        active_key = KeyRepository.get_active_public_key_by_user(db, user.id)
        user_key = KeyRepository.get_active_user_key(db, user.id)

        AuditService.record_event(
            db=db,
            user_id=user.id,
            actor_identity=f"{user.username} ({user.role.name})",
            action_type="USER_UPDATED",
            ip_address=request.remote_addr or "127.0.0.1",
            status="SUCCESS",
            metadata={"self_profile_update": True, "department": user.department},
        )

        profile = {
            "id": user.id,
            "nik": user.nik or f"XYZ-{user.id:04d}",
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "department": user.department,
            "role": user.role.name,
            "clearance_level": user.role.clearance_level,
            "active_key_fingerprint": active_key.key_fingerprint if active_key else None,
            "active_public_key_pem": active_key.public_key_pem if active_key else None,
            "has_encrypted_private_key": bool(user_key and user_key.encrypted_private_key_pem),
        }
        return jsonify(Lazy.transform(profile, UserProfileDTO, serialize=True))
    finally:
        db.close()


def handle_change_password():
    if not check_rate_limit(f"chpass:{g.current_user['id']}", max_requests=10, window_seconds=300):
        return jsonify({"detail": "Terlalu banyak percobaan ganti kata sandi. Coba lagi beberapa menit lagi."}), 429
    req_dto: ChangePasswordRequestDTO = Lazy.transform(
        request.get_json(silent=True) or {}, ChangePasswordRequestDTO
    )
    if not req_dto.current_password or not req_dto.new_password:
        return jsonify({"detail": "Kata sandi lama dan kata sandi baru wajib diisi."}), 400
    if len(req_dto.new_password) < 8:
        return jsonify({"detail": "Kata sandi baru minimal harus 8 karakter."}), 400
    if len(req_dto.new_password) > 256:
        return jsonify({"detail": "Kata sandi baru melebihi batas maksimum 256 karakter."}), 400
    if req_dto.new_password == req_dto.current_password:
        return jsonify({"detail": "Kata sandi baru harus berbeda dari kata sandi saat ini."}), 400

    db = get_db_session()
    try:
        user = db.query(User).filter(User.id == g.current_user["id"]).first()
        if not user or not verify_password(req_dto.current_password, user.password_hash):
            return jsonify({"detail": "Kata sandi saat ini tidak sesuai."}), 400

        user.password_hash = get_password_hash(req_dto.new_password)
        # Seluruh token lama (termasuk yang sedang dipakai) tidak berlaku lagi; pengguna harus masuk ulang
        user.password_changed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        revoke_token(g.current_user.get("jti"), g.current_user.get("exp"))

        AuditService.record_event(
            db=db,
            user_id=user.id,
            actor_identity=f"{user.username} ({user.role.name})",
            action_type="PASSWORD_CHANGED",
            ip_address=request.remote_addr or "127.0.0.1",
            status="SUCCESS",
            metadata={"event": "User login password updated via Argon2id"},
        )
        return jsonify({
            "message": "Kata sandi berhasil diperbarui. Silakan masuk kembali dengan kata sandi baru.",
            "relogin_required": True,
        })
    finally:
        db.close()


@auth_bp.route("/api/auth/login", methods=["POST"])
@auth_bp.route("/api/v1/login", methods=["POST"])
def login_route():
    return handle_login()


@auth_bp.route("/api/auth/logout", methods=["POST"])
@auth_bp.route("/api/v1/logout", methods=["POST"])
@jwt_required()
def logout_route():
    return handle_logout()


@auth_bp.route("/api/auth/me", methods=["GET"])
@auth_bp.route("/api/v1/me", methods=["GET"])
@jwt_required()
def me_route():
    return handle_me()


@auth_bp.route("/api/auth/me", methods=["PUT"])
@auth_bp.route("/api/v1/me", methods=["PUT"])
@jwt_required()
def update_me_route():
    return handle_update_me()


@auth_bp.route("/api/auth/change-password", methods=["POST"])
@auth_bp.route("/api/v1/change-password", methods=["POST"])
@jwt_required()
def change_password_route():
    return handle_change_password()
