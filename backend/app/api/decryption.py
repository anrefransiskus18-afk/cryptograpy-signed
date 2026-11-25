import io
import json
from datetime import datetime, timezone
from pathlib import Path
from flask import Blueprint, request, jsonify, send_file, g
from Crypto.Hash import SHA256

from ..database import get_db_session
from ..models import Document, DocumentRecipient, EncryptionMetadata, UserKey
from ..core.security import sanitize_filename, check_rate_limit
from ..core.permissions import jwt_required, is_admin_user
from ..cryptography.hybrid_engine import HybridCryptoEngine
from ..cryptography.container_format import TamperDetectedError
from ..services.AuditService import AuditService
from ..dto import Lazy, DecryptDocumentRequestDTO

decryption_bp = Blueprint("decryption_bp", __name__)


@decryption_bp.route("/api/documents/decrypt", methods=["POST"])
@decryption_bp.route("/api/v1/decrypt", methods=["POST"])
@jwt_required()
def decrypt_document_route():
    """
    Memvalidasi format kontainer `.enc`, memverifikasi hak akses penerima,
    melakukan ECDH + HKDF-SHA256, dan memverifikasi Authentication Tag GCM 16-byte
    sebelum mengembalikan dokumen asli.
    Jika autentikasi atau integritas gagal, proses dihentikan dan tidak mengembalikan plaintext.
    """
    client_ip = request.remote_addr or "127.0.0.1"
    if not check_rate_limit(f"decrypt:{client_ip}", max_requests=60, window_seconds=60):
        return jsonify({"detail": "Batas percobaan dekripsi terlampaui. Coba lagi sesaat."}), 429

    enc_file = request.files.get("enc_file") or request.files.get("encrypted_file")
    req_dto: DecryptDocumentRequestDTO = Lazy.transform(
        request.form.to_dict(), DecryptDocumentRequestDTO
    )

    document_id = req_dto.document_id
    private_key_pkcs8 = req_dto.private_key_pkcs8
    passphrase = req_dto.passphrase
    aad_json = req_dto.aad_json
    original_filename = req_dto.original_filename
    use_stored_key = req_dto.use_stored_key

    if not enc_file and not document_id:
        return jsonify({"detail": "File kontainer .enc atau document_id wajib disertakan."}), 400

    db = get_db_session()
    try:
        doc_record = None
        if document_id:
            doc_record = db.query(Document).filter(
                Document.id == document_id,
                Document.is_deleted == False,
            ).first()
            if not doc_record:
                return jsonify({"detail": "Dokumen terenkripsi tidak ditemukan di repositori."}), 404

            # Verifikasi otorisasi penerima / pengirim / administrator di sisi backend
            recipient_entry = db.query(DocumentRecipient).filter(
                DocumentRecipient.document_id == doc_record.id,
                DocumentRecipient.recipient_user_id == g.current_user["id"],
            ).first()
            if (
                doc_record.sender_id != g.current_user["id"]
                and not recipient_entry
                and not is_admin_user(g.current_user)
            ):
                AuditService.record_event(
                    db=db,
                    user_id=g.current_user["id"],
                    actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
                    action_type="UNAUTHORIZED_ACCESS",
                    ip_address=client_ip,
                    document_id=doc_record.id,
                    document_name=doc_record.original_filename,
                    status="FAILURE",
                    metadata={"reason": "User is not an authorized recipient for this document"},
                )
                return jsonify({
                    "detail": "Akses ditolak: Anda bukan penerima yang berwenang untuk mendekripsi dokumen ini."
                }), 403

            if (
                recipient_entry
                and recipient_entry.access_status == "REVOKED"
                and doc_record.sender_id != g.current_user["id"]
                and not is_admin_user(g.current_user)
            ):
                AuditService.record_event(
                    db=db,
                    user_id=g.current_user["id"],
                    actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
                    action_type="ACCESS_DENIED_REVOKED",
                    ip_address=client_ip,
                    document_id=doc_record.id,
                    document_name=doc_record.original_filename,
                    status="FAILURE",
                    metadata={"reason": "Recipient access was revoked by sender or administrator"},
                )
                return jsonify({
                    "detail": "Akses ditolak: Hak akses Anda terhadap dokumen ini telah dicabut."
                }), 403

            if (
                doc_record.expires_at
                and datetime.now(timezone.utc).replace(tzinfo=None) > doc_record.expires_at
                and not is_admin_user(g.current_user)
            ):
                AuditService.record_event(
                    db=db,
                    user_id=g.current_user["id"],
                    actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
                    action_type="ACCESS_DENIED_EXPIRED",
                    ip_address=client_ip,
                    document_id=doc_record.id,
                    document_name=doc_record.original_filename,
                    status="FAILURE",
                    metadata={"expires_at": doc_record.expires_at.isoformat()},
                )
                return jsonify({
                    "detail": "Akses ditolak: Masa berlaku dokumen ini telah berakhir."
                }), 403

            storage_path = Path(doc_record.storage_path)
            if not storage_path.exists():
                return jsonify({"detail": "File kontainer .enc fisik tidak ditemukan pada penyimpanan aman."}), 404
            container_bytes = storage_path.read_bytes()
            if not original_filename:
                original_filename = doc_record.original_filename
            if (not aad_json or aad_json.strip() == "{}") and doc_record.encryption_meta:
                aad_dict = doc_record.encryption_meta.aad_json or {}
            else:
                try:
                    aad_dict = json.loads(aad_json) if aad_json else {}
                    if not isinstance(aad_dict, dict):
                        raise ValueError()
                except ValueError:
                    return jsonify({"detail": "Format AAD JSON tidak valid."}), 400
        else:
            container_bytes = enc_file.read()
            raw_name = enc_file.filename or "decrypted_document.bin"
            if not original_filename:
                original_filename = raw_name[:-4] if raw_name.endswith(".enc") else f"restored_{raw_name}"

            # Coba temukan dokumen terkait di database berdasarkan hash kontainer atau Q_eph
            if container_bytes:
                ct_hash = SHA256.new(container_bytes).hexdigest()
                doc_record = db.query(Document).filter(
                    Document.sha256_ciphertext_hash == ct_hash,
                    Document.is_deleted == False,
                ).first()
                if not doc_record and len(container_bytes) >= 69:
                    q_eph_hex = container_bytes[4:69].hex()
                    meta_match = db.query(EncryptionMetadata).filter(
                        EncryptionMetadata.ephemeral_pub_hex == q_eph_hex
                    ).first()
                    if meta_match:
                        doc_record = db.query(Document).filter(
                            Document.id == meta_match.document_id,
                            Document.is_deleted == False,
                        ).first()

            if aad_json and aad_json.strip() != "{}":
                try:
                    aad_dict = json.loads(aad_json)
                    if not isinstance(aad_dict, dict):
                        raise ValueError()
                except ValueError:
                    return jsonify({"detail": "Format AAD JSON tidak valid."}), 400
            elif doc_record and doc_record.encryption_meta and doc_record.encryption_meta.aad_json:
                aad_dict = doc_record.encryption_meta.aad_json
            else:
                aad_dict = {}

        # Jika pengguna memilih kunci privat terenkripsi yang tersimpan pada profilnya (atau fallback jika kosong)
        if not private_key_pkcs8 or use_stored_key:
            ukey = None
            # Utamakan kunci yang cocok dengan fingerprint penerima pada dokumen (mendukung dokumen sebelum rotasi kunci)
            if doc_record:
                recip_for_key = db.query(DocumentRecipient).filter(
                    DocumentRecipient.document_id == doc_record.id,
                    DocumentRecipient.recipient_user_id == g.current_user["id"],
                ).first()
                if recip_for_key and recip_for_key.recipient_key_fingerprint:
                    ukey = (
                        db.query(UserKey)
                        .filter(
                            UserKey.user_id == g.current_user["id"],
                            UserKey.key_fingerprint == recip_for_key.recipient_key_fingerprint,
                        )
                        .order_by(UserKey.id.desc())
                        .first()
                    )
            if not ukey:
                ukey = (
                    db.query(UserKey)
                    .filter(UserKey.user_id == g.current_user["id"], UserKey.is_revoked == False)
                    .order_by(UserKey.id.desc())
                    .first()
                )
            if ukey and ukey.encrypted_private_key_pem and not private_key_pkcs8:
                private_key_pkcs8 = ukey.encrypted_private_key_pem

        try:
            plaintext_bytes = HybridCryptoEngine.decrypt_container(
                container_bytes=container_bytes,
                encrypted_private_key_pem=private_key_pkcs8,
                passphrase=passphrase,
                aad_metadata=aad_dict,
            )
        except TamperDetectedError as tamper_err:
            AuditService.record_event(
                db=db,
                user_id=g.current_user["id"],
                actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
                action_type="TAMPER_DETECTED",
                ip_address=client_ip,
                document_id=doc_record.id if doc_record else None,
                document_name=enc_file.filename if enc_file else (doc_record.encrypted_filename if doc_record else "unknown.enc"),
                status="ALERT",
                metadata={
                    "alert_severity": "CRITICAL",
                    "reason": str(tamper_err),
                    "container_size": len(container_bytes),
                },
            )
            return jsonify({
                "detail": {
                    "error_code": "TAMPER_DETECTED",
                    "message": str(tamper_err),
                }
            }), 422
        except ValueError as val_err:
            AuditService.record_event(
                db=db,
                user_id=g.current_user["id"],
                actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
                action_type="DECRYPTION_FAILED",
                ip_address=client_ip,
                document_id=doc_record.id if doc_record else None,
                document_name=original_filename,
                status="FAILURE",
                metadata={"reason": str(val_err)},
            )
            return jsonify({"detail": str(val_err)}), 400
        finally:
            del container_bytes

        if doc_record:
            recip = db.query(DocumentRecipient).filter(
                DocumentRecipient.document_id == doc_record.id,
                DocumentRecipient.recipient_user_id == g.current_user["id"],
            ).first()
            if recip:
                recip.access_status = "DECRYPTED"
                recip.decrypted_count = (recip.decrypted_count or 0) + 1
                recip.last_decrypted_at = datetime.now(timezone.utc).replace(tzinfo=None)
                db.commit()

        safe_download_name = sanitize_filename(original_filename)
        AuditService.record_event(
            db=db,
            user_id=g.current_user["id"],
            actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
            action_type="DECRYPTION_SUCCESS",
            ip_address=client_ip,
            document_id=doc_record.id if doc_record else None,
            document_name=safe_download_name,
            status="SUCCESS",
            metadata={"restored_size_bytes": len(plaintext_bytes)},
        )

        response = send_file(
            io.BytesIO(plaintext_bytes),
            mimetype="application/octet-stream",
            as_attachment=True,
            download_name=safe_download_name,
        )
        response.headers["X-GCM-Auth-Status"] = "VERIFIED"
        return response
    finally:
        db.close()
