from flask import Blueprint, request, jsonify, g
from ..database import get_db_session
from ..models import PublicKey, UserKey, User
from ..core.permissions import jwt_required
from ..core.security import check_rate_limit
from ..repositories import KeyRepository
from ..cryptography.hybrid_engine import HybridCryptoEngine
from ..services.AuditService import AuditService
from ..dto import (
    Lazy,
    KeyPassphraseRequestDTO,
    VerifyKeyRequestDTO,
    PublicKeyDirectoryItemDTO,
    MyKeyStatusResponseDTO,
    KeyPairGeneratedResponseDTO,
)

keys_bp = Blueprint("keys_bp", __name__)


@keys_bp.route("/api/keys", methods=["GET"])
@keys_bp.route("/api/v1/keys", methods=["GET"])
@jwt_required()
def list_public_keys():
    """Mendistribusikan direktori kunci publik ECC NIST P-256 aktif dari seluruh pengguna."""
    db = get_db_session()
    try:
        keys = (
            db.query(PublicKey)
            .filter(PublicKey.is_revoked == False)
            .order_by(PublicKey.created_at.desc())
            .all()
        )
        raw_items = [
            {
                "key_id": k.id,
                "user_id": k.user_id,
                "full_name": k.owner.full_name,
                "username": k.owner.username,
                "email": k.owner.email,
                "department": k.owner.department,
                "role": k.owner.role.name,
                "clearance_level": k.owner.role.clearance_level,
                "fingerprint": k.key_fingerprint,
                "curve": k.curve_name,
                "public_key_pem": k.public_key_pem,
                "created_at": k.created_at.isoformat(),
            }
            for k in keys
            if k.owner and k.owner.is_active and getattr(k.owner, "deleted_at", None) is None
        ]
        return jsonify(Lazy.transform(raw_items, [PublicKeyDirectoryItemDTO], serialize=True))
    finally:
        db.close()


@keys_bp.route("/api/keys/me", methods=["GET"])
@keys_bp.route("/api/v1/keys/me", methods=["GET"])
@jwt_required()
def get_my_key():
    """Mengambil status kunci ECC aktif dan riwayat rotasi kunci milik pengguna yang sedang login."""
    db = get_db_session()
    try:
        active_pub = KeyRepository.get_active_public_key_by_user(db, g.current_user["id"])
        active_ukey = KeyRepository.get_active_user_key(db, g.current_user["id"])
        history = (
            db.query(UserKey)
            .filter(UserKey.user_id == g.current_user["id"])
            .order_by(UserKey.id.desc())
            .limit(10)
            .all()
        )
        res_payload = Lazy.transform(
            {
                "has_active_key": active_pub is not None,
                "key_id": active_pub.id if active_pub else None,
                "user_id": g.current_user["id"],
                "username": g.current_user["username"],
                "fingerprint": active_pub.key_fingerprint if active_pub else None,
                "curve": active_pub.curve_name if active_pub else "NIST P-256",
                "kdf_protection": active_ukey.kdf_protection if active_ukey else "PBKDF2WithHMAC-SHA256AndAES256-CBC",
                "public_key_pem": active_pub.public_key_pem if active_pub else None,
                "encrypted_private_key_pem": active_ukey.encrypted_private_key_pem if active_ukey else None,
                "created_at": active_pub.created_at.isoformat() if active_pub else None,
                "key_history": [
                    {
                        "id": hk.id,
                        "fingerprint": hk.key_fingerprint,
                        "curve": hk.curve_name,
                        "status": hk.status,
                        "is_revoked": hk.is_revoked,
                        "created_at": hk.created_at.isoformat() if hk.created_at else None,
                        "rotated_at": hk.rotated_at.isoformat() if hk.rotated_at else None,
                    }
                    for hk in history
                ],
            },
            MyKeyStatusResponseDTO,
            serialize=True,
        )
        return jsonify(res_payload)
    finally:
        db.close()


@keys_bp.route("/api/keys/public/<int:user_id>", methods=["GET"])
@keys_bp.route("/api/v1/keys/public/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user_public_key(user_id: int):
    """Mengambil kunci publik aktif milik pengguna tertentu berdasarkan user_id."""
    db = get_db_session()
    try:
        user = db.query(User).filter(
            User.id == user_id,
            User.is_active == True,
            User.deleted_at == None,
        ).first()
        if not user:
            return jsonify({"detail": "Pengguna tidak ditemukan."}), 404
        pub = KeyRepository.get_active_public_key_by_user(db, user.id)
        if not pub:
            return jsonify({"detail": "Pengguna belum memiliki kunci publik ECC aktif."}), 404
        res_payload = Lazy.transform(
            {
                "key_id": pub.id,
                "user_id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "email": user.email,
                "department": user.department,
                "role": user.role.name,
                "clearance_level": user.role.clearance_level,
                "fingerprint": pub.key_fingerprint,
                "curve": pub.curve_name,
                "public_key_pem": pub.public_key_pem,
                "created_at": pub.created_at.isoformat(),
            },
            PublicKeyDirectoryItemDTO,
            serialize=True,
        )
        return jsonify(res_payload)
    finally:
        db.close()


def _generate_or_rotate_key(action_label: str):
    if not check_rate_limit(f"keygen:{g.current_user['id']}", max_requests=10, window_seconds=60):
        return jsonify({"detail": "Terlalu banyak permintaan pembuatan/rotasi kunci. Coba lagi sesaat."}), 429

    req_dto: KeyPassphraseRequestDTO = Lazy.transform(
        request.get_json(silent=True) or {}, KeyPassphraseRequestDTO
    )

    try:
        key_bundle = HybridCryptoEngine.generate_ecc_keypair(req_dto.passphrase)
    except ValueError as err:
        return jsonify({"detail": str(err)}), 400

    db = get_db_session()
    try:
        new_pub_key, _ = KeyRepository.register_keypair(
            db=db,
            user_id=g.current_user["id"],
            fingerprint=key_bundle["fingerprint"],
            public_key_pem=key_bundle["public_key_pem"],
            encrypted_private_key_pem=key_bundle["private_key_pkcs8_pem"],
        )

        AuditService.record_event(
            db=db,
            user_id=g.current_user["id"],
            actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
            action_type=action_label,
            ip_address=request.remote_addr or "127.0.0.1",
            status="SUCCESS",
            metadata={"fingerprint": key_bundle["fingerprint"], "curve": "NIST P-256"},
        )

        res_payload = Lazy.transform(
            {
                "message": "Pasangan kunci ECC NIST P-256 berhasil dibuat.",
                "key_id": new_pub_key.id,
                "fingerprint": key_bundle["fingerprint"],
                "curve": "NIST P-256",
                "public_key_pem": key_bundle["public_key_pem"],
                "private_key_pkcs8_pem": key_bundle["private_key_pkcs8_pem"],
            },
            KeyPairGeneratedResponseDTO,
            serialize=True,
        )
        return jsonify(res_payload)
    finally:
        db.close()


@keys_bp.route("/api/keys/generate", methods=["POST"])
@keys_bp.route("/api/v1/keys/generate", methods=["POST"])
@jwt_required()
def generate_keypair_route():
    return _generate_or_rotate_key("KEY_GENERATED")


@keys_bp.route("/api/keys/rotate", methods=["POST"])
@keys_bp.route("/api/v1/keys/rotate", methods=["POST"])
@jwt_required()
def rotate_keypair_route():
    return _generate_or_rotate_key("KEY_ROTATED")


@keys_bp.route("/api/keys/verify", methods=["POST"])
@keys_bp.route("/api/v1/keys/verify", methods=["POST"])
@jwt_required()
def verify_key_ownership_route():
    """Memvalidasi kepemilikan private key PKCS#8 terhadap public key aktif pengguna."""
    # Batasi percobaan agar passphrase kunci tidak dapat ditebak berulang kali (brute-force)
    if not check_rate_limit(f"verifykey:{g.current_user['id']}", max_requests=10, window_seconds=60):
        return jsonify({"detail": "Terlalu banyak percobaan verifikasi kunci. Coba lagi sesaat."}), 429
    req_dto: VerifyKeyRequestDTO = Lazy.transform(
        request.get_json(silent=True) or {}, VerifyKeyRequestDTO
    )
    private_key_pem = req_dto.private_key_pkcs8_pem

    db = get_db_session()
    try:
        active_pub = KeyRepository.get_active_public_key_by_user(db, g.current_user["id"])
        if not active_pub:
            return jsonify({"detail": "Anda belum memiliki kunci publik aktif."}), 404

        if not private_key_pem:
            ukey = KeyRepository.get_active_user_key(db, g.current_user["id"])
            if ukey and ukey.encrypted_private_key_pem:
                private_key_pem = ukey.encrypted_private_key_pem

        try:
            result = HybridCryptoEngine.verify_key_ownership(
                encrypted_private_key_pem=private_key_pem,
                passphrase=req_dto.passphrase,
                expected_fingerprint=active_pub.key_fingerprint,
            )
            return jsonify(result)
        except ValueError as err:
            return jsonify({"is_valid": False, "detail": str(err)}), 400
    finally:
        db.close()
