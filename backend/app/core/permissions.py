from functools import wraps
from datetime import timezone
from typing import List, Optional
from flask import request, jsonify, g
from ..database import get_db_session
from ..models import User
from .security import decode_access_token

# Pemetaan grup peran untuk kompatibilitas antara penamaan tesis & RBAC enterprise
ROLE_EQUIVALENTS = {
    "ADMINISTRATOR": {"ADMINISTRATOR", "SECURITY_ADMIN", "ADMIN"},
    "SECURITY_ADMIN": {"ADMINISTRATOR", "SECURITY_ADMIN", "ADMIN"},
    "STAFF": {"STAFF", "MANAGER", "EXECUTIVE", "ADMINISTRATOR", "SECURITY_ADMIN"},
    "AUTHORIZED_RECIPIENT": {"AUTHORIZED_RECIPIENT", "STAFF", "MANAGER", "EXECUTIVE", "ADMINISTRATOR", "SECURITY_ADMIN"},
    "EXECUTIVE": {"EXECUTIVE", "ADMINISTRATOR", "SECURITY_ADMIN"},
    "MANAGER": {"MANAGER", "EXECUTIVE", "ADMINISTRATOR", "SECURITY_ADMIN"},
}


def has_role_permission(user_role_name: str, user_extra_roles: list[str], allowed_roles: List[str]) -> bool:
    all_user_roles = {user_role_name.upper()} | {r.upper() for r in user_extra_roles}
    expanded_allowed = set()
    for req_role in allowed_roles:
        req_upper = req_role.upper()
        expanded_allowed.add(req_upper)
        if req_upper in ROLE_EQUIVALENTS:
            expanded_allowed |= ROLE_EQUIVALENTS[req_upper]
    return bool(all_user_roles & expanded_allowed)


def is_admin_user(user_dict: dict) -> bool:
    roles = {user_dict.get("role", "").upper()} | {r.upper() for r in user_dict.get("roles", [])}
    return bool(roles & {"ADMINISTRATOR", "SECURITY_ADMIN", "ADMIN"})


def jwt_required(allowed_roles: Optional[List[str]] = None, min_clearance: int = 1):
    """
    Decorator Middleware untuk memproteksi endpoint dengan JWT Authentication
    dan Role-Based Access Control (RBAC).
    Identitas pengguna diambil secara eksklusif dari token JWT yang terverifikasi.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            token = ""
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1].strip()
            elif request.cookies.get("access_token_cookie"):
                token = request.cookies.get("access_token_cookie", "").strip()

            if not token:
                return jsonify({"detail": "Sesi tidak ditemukan. Harap sertakan Bearer Token JWT."}), 401
            try:
                payload = decode_access_token(token)
            except ValueError as err:
                return jsonify({"detail": str(err)}), 401

            db = get_db_session()
            try:
                user = db.query(User).filter(
                    User.username == payload.get("sub"),
                    User.is_active == True
                ).first()
                if not user or getattr(user, "deleted_at", None) is not None:
                    return jsonify({"detail": "Pengguna tidak ditemukan atau tidak aktif."}), 401

                # Token yang diterbitkan sebelum kata sandi diganti/di-reset tidak lagi berlaku
                changed_at = getattr(user, "password_changed_at", None)
                if changed_at is not None:
                    changed_ts = int(changed_at.replace(tzinfo=timezone.utc).timestamp())
                    if int(payload.get("iat", 0)) < changed_ts:
                        return jsonify({
                            "detail": "Sesi berakhir karena kata sandi diubah. Silakan masuk kembali."
                        }), 401

                extra_roles = [ur.role.name for ur in getattr(user, "user_roles", []) if ur.role]
                all_roles = list(dict.fromkeys([user.role.name] + extra_roles))

                if allowed_roles and not has_role_permission(user.role.name, extra_roles, allowed_roles):
                    return jsonify({
                        "detail": f"Akses ditolak (RBAC). Membutuhkan salah satu peran: {', '.join(allowed_roles)}"
                    }), 403

                if user.role.clearance_level < min_clearance:
                    return jsonify({
                        "detail": f"Wewenang jabatan Anda (Level {user.role.clearance_level}) tidak mencukupi (Minimal Level {min_clearance})."
                    }), 403

                g.current_user = {
                    "id": user.id,
                    "nik": getattr(user, "nik", None) or f"XYZ-{user.id:04d}",
                    "username": user.username,
                    "email": user.email,
                    "full_name": user.full_name,
                    "department": user.department,
                    "role": user.role.name,
                    "roles": all_roles,
                    "clearance_level": user.role.clearance_level,
                    "jti": payload.get("jti"),
                    "exp": payload.get("exp"),
                }
            finally:
                db.close()

            return fn(*args, **kwargs)
        return wrapper
    return decorator
