from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import or_
from ..database import get_db_session
from ..models import User, Role, UserRole, PublicKey, UserKey
from ..core.security import get_password_hash
from ..core.permissions import jwt_required, is_admin_user
from ..schemas import RequestValidator, EMAIL_REGEX
from ..repositories import KeyRepository, UserRepository
from ..cryptography.hybrid_engine import HybridCryptoEngine
from ..services.AuditService import AuditService
from ..dto import (
    Lazy,
    UserFilterRequestDTO,
    CreateUserRequestDTO,
    UpdateUserRequestDTO,
    UserResponseDTO,
    UserMutationResponseDTO,
)

users_bp = Blueprint("users_bp", __name__)


ADMIN_ROLES = {"ADMINISTRATOR", "SECURITY_ADMIN"}


def _active_key_map(db, user_ids) -> dict:
    """Ambil kunci publik aktif terbaru untuk banyak pengguna sekaligus (menghindari N+1 query)."""
    if not user_ids:
        return {}
    rows = (
        db.query(PublicKey)
        .filter(PublicKey.user_id.in_(list(user_ids)), PublicKey.is_revoked == False)
        .order_by(PublicKey.id.asc())
        .all()
    )
    return {k.user_id: k for k in rows}  # id terbesar menimpa -> kunci terbaru


def _serialize_user(db, u: User, key_map: dict = None) -> dict:
    if key_map is not None:
        active_key = key_map.get(u.id)
    else:
        active_key = db.query(PublicKey).filter(
            PublicKey.user_id == u.id,
            PublicKey.is_revoked == False,
        ).order_by(PublicKey.id.desc()).first()
    extra_roles = [ur.role.name for ur in getattr(u, "user_roles", []) if ur.role]
    raw_user = {
        "id": u.id,
        "nik": u.nik or f"XYZ-{u.id:04d}",
        "username": u.username,
        "email": u.email,
        "full_name": u.full_name,
        "department": u.department,
        "role": u.role.name if u.role else "STAFF",
        "roles": list(dict.fromkeys(([u.role.name] if u.role else []) + extra_roles)),
        "clearance_level": u.role.clearance_level if u.role else 1,
        "is_active": u.is_active,
        "deleted_at": u.deleted_at.isoformat() if getattr(u, "deleted_at", None) else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "key_fingerprint": active_key.key_fingerprint if active_key else None,
        "public_key_pem": active_key.public_key_pem if active_key else None,
    }
    return Lazy.transform(raw_user, UserResponseDTO, serialize=True)


@users_bp.route("/api/roles", methods=["GET"])
@users_bp.route("/api/v1/roles", methods=["GET"])
@jwt_required()
def list_roles():
    db = get_db_session()
    try:
        roles = db.query(Role).order_by(Role.clearance_level.asc()).all()
        return jsonify([
            {
                "id": r.id,
                "name": r.name,
                "clearance_level": r.clearance_level,
                "description": r.description,
            }
            for r in roles
        ])
    finally:
        db.close()


@users_bp.route("/api/users", methods=["GET"])
@users_bp.route("/api/v1/users", methods=["GET"])
@jwt_required()
def list_users():
    filter_req: UserFilterRequestDTO = Lazy.transform(
        request.args.to_dict(), UserFilterRequestDTO
    )

    db = get_db_session()
    try:
        include_deleted = bool(filter_req.include_deleted and is_admin_user(g.current_user))
        users = UserRepository.list_filtered(
            db=db,
            include_deleted=include_deleted,
            role_name=filter_req.role,
            search=filter_req.search,
        )
        key_map = _active_key_map(db, {u.id for u in users})
        result = [_serialize_user(db, u, key_map) for u in users]
        return jsonify(Lazy.transform(result, [UserResponseDTO], serialize=True))
    finally:
        db.close()


@users_bp.route("/api/users/<int:user_id>", methods=["GET"])
@users_bp.route("/api/v1/users/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user_detail(user_id: int):
    db = get_db_session()
    try:
        u = db.query(User).filter(User.id == user_id, User.deleted_at == None).first()
        if not u:
            return jsonify({"detail": "Pengguna tidak ditemukan."}), 404
        return jsonify(_serialize_user(db, u))
    finally:
        db.close()


@users_bp.route("/api/users", methods=["POST"])
@users_bp.route("/api/v1/users", methods=["POST"])
@jwt_required(allowed_roles=["ADMINISTRATOR", "SECURITY_ADMIN"])
def create_user():
    raw_data = request.get_json(silent=True) or {}
    valid, msg = RequestValidator.validate_user_create(raw_data)
    if not valid:
        return jsonify({"detail": msg}), 400

    req_dto: CreateUserRequestDTO = Lazy.transform(raw_data, CreateUserRequestDTO)

    # Validasi passphrase kunci SEBELUM akun dibuat, agar tidak ada akun tanpa kunci secara diam-diam
    if req_dto.auto_generate_key and len(req_dto.key_passphrase) < 8:
        return jsonify({"detail": "Kata sandi kunci keamanan minimal 8 karakter."}), 400

    db = get_db_session()
    try:
        role = db.query(Role).filter(Role.name == req_dto.role).first()
        if not role:
            return jsonify({"detail": f"Role '{req_dto.role}' tidak ditemukan."}), 400

        existing = db.query(User).filter(
            (User.username == req_dto.username) | (User.email == req_dto.email)
        ).first()
        if existing:
            return jsonify({"detail": "Username atau email sudah terdaftar."}), 400

        if req_dto.nik:
            dup_nik = db.query(User).filter(User.nik == req_dto.nik).first()
            if dup_nik:
                return jsonify({"detail": f"NIK '{req_dto.nik}' sudah terdaftar pada pengguna lain."}), 400

        new_user = User(
            nik=req_dto.nik,
            username=req_dto.username,
            email=req_dto.email,
            password_hash=get_password_hash(req_dto.password),
            full_name=req_dto.full_name,
            department=req_dto.department,
            role_id=role.id,
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        if not new_user.nik:
            new_user.nik = f"XYZ-{new_user.id:04d}"
            db.commit()

        db.add(UserRole(
            user_id=new_user.id,
            role_id=role.id,
            assigned_by=g.current_user["username"],
        ))
        db.commit()

        fingerprint = None
        if req_dto.auto_generate_key:
            bundle = HybridCryptoEngine.generate_ecc_keypair(req_dto.key_passphrase)
            KeyRepository.register_keypair(
                db=db,
                user_id=new_user.id,
                fingerprint=bundle["fingerprint"],
                public_key_pem=bundle["public_key_pem"],
                encrypted_private_key_pem=bundle["private_key_pkcs8_pem"],
            )
            fingerprint = bundle["fingerprint"]

        AuditService.record_event(
            db=db,
            user_id=g.current_user["id"],
            actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
            action_type="USER_CREATED",
            ip_address=request.remote_addr or "127.0.0.1",
            status="SUCCESS",
            metadata={"target_username": new_user.username, "role": role.name, "key_fingerprint": fingerprint},
        )

        res_payload = Lazy.transform(
            {
                "message": f"Pengguna {req_dto.full_name} berhasil ditambahkan.",
                "id": new_user.id,
                "user": _serialize_user(db, new_user),
            },
            UserMutationResponseDTO,
            serialize=True,
        )
        return jsonify(res_payload), 201
    finally:
        db.close()


@users_bp.route("/api/users/<int:user_id>", methods=["PUT"])
@users_bp.route("/api/v1/users/<int:user_id>", methods=["PUT"])
@jwt_required(allowed_roles=["ADMINISTRATOR", "SECURITY_ADMIN"])
def update_user(user_id: int):
    req_dto: UpdateUserRequestDTO = Lazy.transform(
        request.get_json(silent=True) or {}, UpdateUserRequestDTO
    )
    is_self = user_id == g.current_user["id"]
    db = get_db_session()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return jsonify({"detail": "Pengguna tidak ditemukan."}), 404

        # ---- Tahap 1: Validasi seluruh input sebelum ada perubahan yang disimpan ----
        if is_self and req_dto.is_active is False:
            return jsonify({"detail": "Anda tidak dapat menonaktifkan akun Anda sendiri."}), 400
        if is_self and req_dto.role and req_dto.role not in ADMIN_ROLES:
            return jsonify({"detail": "Anda tidak dapat menurunkan peran akun Anda sendiri."}), 400
        if getattr(user, "deleted_at", None) is not None and req_dto.reset_ecc_key and not req_dto.is_active:
            return jsonify({"detail": "Pulihkan akun terlebih dahulu sebelum memperbarui kunci."}), 400
        if req_dto.email:
            if not EMAIL_REGEX.match(req_dto.email):
                return jsonify({"detail": "Format alamat email korporat tidak valid."}), 400
            dup_email = db.query(User).filter(User.email == req_dto.email, User.id != user.id).first()
            if dup_email:
                return jsonify({"detail": "Alamat email sudah terdaftar pada pengguna lain."}), 400
        if req_dto.nik:
            dup_nik = db.query(User).filter(User.nik == req_dto.nik, User.id != user.id).first()
            if dup_nik:
                return jsonify({"detail": f"NIK '{req_dto.nik}' sudah digunakan oleh pengguna lain."}), 400
        if req_dto.password and len(req_dto.password) < 8:
            return jsonify({"detail": "Password minimal harus 8 karakter."}), 400
        role = None
        if req_dto.role:
            role = db.query(Role).filter(Role.name == req_dto.role).first()
            if not role:
                return jsonify({"detail": f"Role '{req_dto.role}' tidak ditemukan."}), 400
        needs_key_passphrase = req_dto.reset_ecc_key or (
            getattr(user, "deleted_at", None) is not None and req_dto.is_active
        )
        if needs_key_passphrase and len(req_dto.key_passphrase) < 8:
            return jsonify({"detail": "Kata sandi kunci minimal 8 karakter."}), 400

        # ---- Tahap 2: Terapkan perubahan ----
        if req_dto.full_name:
            user.full_name = req_dto.full_name
        if req_dto.email:
            user.email = req_dto.email
        if req_dto.department:
            user.department = req_dto.department
        if req_dto.nik:
            user.nik = req_dto.nik
        if req_dto.password:
            user.password_hash = get_password_hash(req_dto.password)
            user.password_changed_at = datetime.now(timezone.utc).replace(tzinfo=None)  # paksa sesi lama keluar
        if role:
            user.role_id = role.id
            exists_ur = db.query(UserRole).filter(
                UserRole.user_id == user.id,
                UserRole.role_id == role.id,
            ).first()
            if not exists_ur:
                db.add(UserRole(
                    user_id=user.id,
                    role_id=role.id,
                    assigned_by=g.current_user["username"],
                ))

        restored = False
        if req_dto.is_active is not None:
            user.is_active = req_dto.is_active
            if not req_dto.is_active:
                db.query(PublicKey).filter(PublicKey.user_id == user.id, PublicKey.is_revoked == False).update({"is_revoked": True})
                db.query(UserKey).filter(UserKey.user_id == user.id, UserKey.is_revoked == False).update({"is_revoked": True, "status": "REVOKED"})
            elif getattr(user, "deleted_at", None) is not None:
                user.deleted_at = None
                restored = True
        db.commit()

        # ---- Tahap 3: Operasi kunci (register_keypair melakukan commit sendiri) ----
        need_new_key = req_dto.reset_ecc_key or (
            restored and not KeyRepository.get_active_public_key_by_user(db, user.id)
        )
        if need_new_key:
            bundle = HybridCryptoEngine.generate_ecc_keypair(req_dto.key_passphrase)
            KeyRepository.register_keypair(
                db=db,
                user_id=user.id,
                fingerprint=bundle["fingerprint"],
                public_key_pem=bundle["public_key_pem"],
                encrypted_private_key_pem=bundle["private_key_pkcs8_pem"],
            )

        db.refresh(user)

        AuditService.record_event(
            db=db,
            user_id=g.current_user["id"],
            actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
            action_type="KEY_ROTATED" if req_dto.reset_ecc_key else "USER_UPDATED",
            ip_address=request.remote_addr or "127.0.0.1",
            status="SUCCESS",
            metadata={
                "target_user_id": user.id,
                "target_username": user.username,
                "is_active": user.is_active,
                "reset_ecc_key": req_dto.reset_ecc_key,
            },
        )
        res_payload = Lazy.transform(
            {
                "message": f"Data pengguna {user.full_name} berhasil diperbarui.",
                "id": user.id,
                "user": _serialize_user(db, user),
            },
            UserMutationResponseDTO,
            serialize=True,
        )
        return jsonify(res_payload)
    finally:
        db.close()


@users_bp.route("/api/users/<int:user_id>", methods=["DELETE"])
@users_bp.route("/api/v1/users/<int:user_id>", methods=["DELETE"])
@jwt_required(allowed_roles=["ADMINISTRATOR", "SECURITY_ADMIN"])
def delete_user(user_id: int):
    if user_id == g.current_user["id"]:
        return jsonify({"detail": "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif."}), 400

    db = get_db_session()
    try:
        user = db.query(User).filter(User.id == user_id, User.deleted_at == None).first()
        if not user:
            return jsonify({"detail": "Pengguna tidak ditemukan."}), 404

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        user.is_active = False
        user.deleted_at = now

        # Revoke seluruh kunci publik pengguna yang dihapus/dinonaktifkan demi keamanan
        db.query(PublicKey).filter(PublicKey.user_id == user.id).update({"is_revoked": True})
        db.query(UserKey).filter(UserKey.user_id == user.id).update({"is_revoked": True, "status": "REVOKED"})
        db.commit()

        AuditService.record_event(
            db=db,
            user_id=g.current_user["id"],
            actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
            action_type="USER_DELETED",
            ip_address=request.remote_addr or "127.0.0.1",
            status="SUCCESS",
            metadata={"target_user_id": user.id, "target_username": user.username, "keys_revoked": True},
        )
        return jsonify({"message": f"Pengguna {user.username} berhasil dinonaktifkan (soft-delete) dan kuncinya telah dicabut."})
    finally:
        db.close()
