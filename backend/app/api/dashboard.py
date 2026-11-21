from flask import Blueprint, jsonify, g
from sqlalchemy import func, or_
from ..database import get_db_session
from ..models import User, PublicKey, UserKey, Document, DocumentRecipient, AuditLog, AuthenticationLog
from ..core.permissions import jwt_required, is_admin_user
from ..dto import Lazy, DashboardResponseDTO

dashboard_bp = Blueprint("dashboard_bp", __name__)


def _apply_doc_access_filter(query, db, uid: int, is_global_viewer: bool):
    if is_global_viewer:
        return query
    received_subq = db.query(DocumentRecipient.document_id).filter(
        DocumentRecipient.recipient_user_id == uid
    )
    return query.filter(or_(Document.sender_id == uid, Document.id.in_(received_subq)))


@dashboard_bp.route("/api/dashboard", methods=["GET"])
@dashboard_bp.route("/api/v1/stats", methods=["GET"])
@jwt_required()
def get_dashboard():
    db = get_db_session()
    try:
        uid = g.current_user["id"]
        is_global_viewer = is_admin_user(g.current_user) or g.current_user.get("role") == "EXECUTIVE"

        total_users = db.query(User).filter(User.is_active == True, User.deleted_at == None).count()
        # Hanya hitung kunci milik pengguna yang masih aktif (siap menerima dokumen)
        active_keys = (
            db.query(PublicKey)
            .join(User, PublicKey.user_id == User.id)
            .filter(PublicKey.is_revoked == False, User.is_active == True, User.deleted_at == None)
            .count()
        )

        doc_base_q = _apply_doc_access_filter(
            db.query(Document).filter(Document.is_deleted == False), db, uid, is_global_viewer
        )

        total_documents = doc_base_q.count()
        encrypted_documents = doc_base_q.filter(Document.status == "ENCRYPTED").count()

        audit_base_q = db.query(AuditLog)
        if not is_global_viewer:
            audit_base_q = audit_base_q.filter(AuditLog.user_id == uid)

        total_encryptions = audit_base_q.filter(AuditLog.action_type == "ENCRYPTION").count()
        total_decryptions = audit_base_q.filter(AuditLog.action_type == "DECRYPTION_SUCCESS").count()
        tamper_alerts = audit_base_q.filter(AuditLog.action_type == "TAMPER_DETECTED").count()
        failed_q = db.query(AuthenticationLog).filter(AuthenticationLog.status == "FAILED")
        if not is_global_viewer:
            failed_q = failed_q.filter(
                (AuthenticationLog.user_id == uid)
                | (AuthenticationLog.username_attempted == g.current_user["username"])
            )
        failed_logins = failed_q.count()

        storage_q = _apply_doc_access_filter(
            db.query(func.coalesce(func.sum(Document.encrypted_size_bytes), 0)).filter(
                Document.is_deleted == False
            ),
            db,
            uid,
            is_global_viewer,
        )
        total_storage_bytes = storage_q.scalar() or 0

        my_key = db.query(PublicKey).filter(
            PublicKey.user_id == uid,
            PublicKey.is_revoked == False,
        ).order_by(PublicKey.id.desc()).first()

        my_user_key = db.query(UserKey).filter(
            UserKey.user_id == uid,
            UserKey.is_revoked == False,
        ).order_by(UserKey.id.desc()).first()

        recent_logs = audit_base_q.order_by(AuditLog.id.desc()).limit(10).all()

        cls_q = _apply_doc_access_filter(
            db.query(Document.classification, func.count(Document.id)).filter(
                Document.is_deleted == False
            ),
            db,
            uid,
            is_global_viewer,
        )
        classifications = cls_q.group_by(Document.classification).all()
        classification_breakdown = {c: cnt for c, cnt in classifications}

        res_payload = Lazy.transform(
            {
                "metrics": {
                    "total_users": total_users,
                    "active_keys": active_keys,
                    "total_documents": total_documents,
                    "encrypted_documents": encrypted_documents,
                    "total_encryptions": total_encryptions,
                    "total_decryptions": total_decryptions,
                    "tamper_alerts": tamper_alerts,
                    "failed_logins": failed_logins,
                    "total_storage_bytes": int(total_storage_bytes),
                },
                "usage_statistics": {
                    "classification_breakdown": classification_breakdown,
                    "algorithms": {
                        "symmetric_cipher": "AES-256-GCM (96-bit Nonce, 128-bit Auth Tag)",
                        "asymmetric_curve": "ECC NIST P-256 (secp256r1)",
                        "key_agreement": "Ephemeral-Static ECDH",
                        "kdf": "HKDF-SHA256 (RFC 5869)",
                        "password_kdf": "Argon2id (RFC 9106)",
                    },
                },
                "my_key": {
                    "has_active_key": my_key is not None,
                    "fingerprint": my_key.key_fingerprint if my_key else None,
                    "curve": my_key.curve_name if my_key else "NIST P-256",
                    "created_at": my_key.created_at.isoformat() if my_key else None,
                    "public_key_pem": my_key.public_key_pem if my_key else None,
                    "has_backup_private_key": bool(my_user_key and my_user_key.encrypted_private_key_pem),
                },
                "recent_logs": [
                    {
                        "id": log.id,
                        "timestamp": log.timestamp.isoformat(),
                        "actor_identity": log.actor_identity,
                        "action_type": log.action_type,
                        "status": getattr(log, "status", "SUCCESS"),
                        "document_hash": log.document_hash,
                        "ip_address": log.ip_address,
                        "server_signature": log.server_signature,
                    }
                    for log in recent_logs
                ],
            },
            DashboardResponseDTO,
            serialize=True,
        )
        return jsonify(res_payload)
    finally:
        db.close()
