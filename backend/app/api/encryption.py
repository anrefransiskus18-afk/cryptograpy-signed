import io
import uuid
from pathlib import Path
from flask import Blueprint, request, jsonify, send_file, g
from Crypto.Hash import SHA256

from ..database import get_db_session
from ..models import PublicKey, Document, DocumentRecipient, EncryptionMetadata
from ..core.config import Config
from ..core.security import sanitize_filename
from ..core.permissions import jwt_required
from ..cryptography.hybrid_engine import HybridCryptoEngine
from ..services.AuditService import AuditService
from ..dto import Lazy, EncryptDocumentRequestDTO, EncryptDocumentJsonResponseDTO

encryption_bp = Blueprint("encryption_bp", __name__)

CLASSIFICATION_MIN_CLEARANCE = {
    "INTERNAL": 1,
    "CONFIDENTIAL": 2,
    "SECRET": 3,
    "TOP_SECRET": 4,
}


@encryption_bp.route("/api/documents/encrypt", methods=["POST"])
@encryption_bp.route("/api/v1/encrypt", methods=["POST"])
@jwt_required()
def encrypt_document_route():
    """
    Mengenkripsi dokumen dengan AES-256-GCM + ECDH NIST P-256 + HKDF-SHA256,
    menyimpan kontainer `.enc` beserta metadata kriptografi ke database MySQL,
    dan mengembalikan kontainer `.enc`.
    """
    uploaded_file = request.files.get("document") or request.files.get("file")
    if not uploaded_file:
        return jsonify({"detail": "File dokumen tidak ditemukan dalam request."}), 400

    form_data = request.form.to_dict()
    if "wrap_mode" not in form_data or not form_data["wrap_mode"]:
        form_data["wrap_mode"] = Config.DEFAULT_KEY_WRAP_MODE

    req_dto: EncryptDocumentRequestDTO = Lazy.transform(
        form_data, EncryptDocumentRequestDTO
    )

    if not req_dto.recipient_key_id and not req_dto.recipient_user_id:
        return jsonify({"detail": "ID Kunci Publik atau ID Penerima wajib dipilih."}), 400

    if not req_dto.aad_valid:
        return jsonify({"detail": "Format AAD harus berupa objek JSON yang valid."}), 400

    aad_dict = req_dto.aad_dict
    safe_orig_name = sanitize_filename(uploaded_file.filename or "document.bin")
    ext = Path(safe_orig_name).suffix.lower()

    if ext and ext not in Config.ALLOWED_EXTENSIONS:
        return jsonify({
            "detail": f"Format berkas '{ext}' tidak diizinkan demi keamanan sistem."
        }), 400

    plaintext_bytes = uploaded_file.read()
    if not plaintext_bytes:
        return jsonify({"detail": "Dokumen yang diunggah kosong (0 byte)."}), 400

    classification = str(aad_dict.get("classification", "CONFIDENTIAL")).upper()
    if classification not in CLASSIFICATION_MIN_CLEARANCE:
        return jsonify({
            "detail": f"Tingkat kerahasiaan '{classification}' tidak dikenal. "
                      f"Gunakan salah satu: {', '.join(CLASSIFICATION_MIN_CLEARANCE)}."
        }), 400
    aad_dict["classification"] = classification
    required_clearance = CLASSIFICATION_MIN_CLEARANCE[classification]

    db = get_db_session()
    try:
        if req_dto.recipient_key_id:
            recipient_key = db.query(PublicKey).filter(
                PublicKey.id == req_dto.recipient_key_id,
                PublicKey.is_revoked == False,
            ).first()
        else:
            recipient_key = db.query(PublicKey).filter(
                PublicKey.user_id == req_dto.recipient_user_id,
                PublicKey.is_revoked == False,
            ).order_by(PublicKey.id.desc()).first()

        if not recipient_key:
            return jsonify({"detail": "Kunci publik penerima tidak ditemukan atau telah dicabut."}), 404

        owner = recipient_key.owner
        if not owner or not owner.is_active or getattr(owner, "deleted_at", None) is not None:
            return jsonify({"detail": "Akun penerima sedang dinonaktifkan dan tidak dapat menerima dokumen."}), 403

        recipient_clearance = (
            recipient_key.owner.role.clearance_level
            if recipient_key.owner and recipient_key.owner.role
            else 1
        )
        if recipient_clearance < required_clearance:
            recipient_name = recipient_key.owner.full_name if recipient_key.owner else "Penerima"
            return jsonify({
                "detail": (
                    f"Penerima '{recipient_name}' memiliki izin akses Level {recipient_clearance}, "
                    f"sedangkan dokumen berklasifikasi {classification} membutuhkan minimal Level {required_clearance}."
                )
            }), 403

        try:
            enc_result = HybridCryptoEngine.encrypt_document_with_metrics(
                plaintext_bytes=plaintext_bytes,
                recipient_public_key_pem=recipient_key.public_key_pem,
                aad_metadata=aad_dict,
                wrap_mode=req_dto.wrap_mode,
            )
        except Exception as err:
            return jsonify({"detail": f"Kegagalan mesin enkripsi: {str(err)}"}), 500

        enc_container: bytes = enc_result["container_bytes"]
        c_info = enc_result["container_info"]
        doc_uid = uuid.uuid4().hex
        output_filename = f"{safe_orig_name}.enc"
        storage_file_path = Config.ENCRYPTED_STORAGE_DIR / f"{doc_uid}_{output_filename}"
        storage_file_path.write_bytes(enc_container)

        pt_hash = SHA256.new(plaintext_bytes).hexdigest()
        ct_hash = SHA256.new(enc_container).hexdigest()

        try:
            doc_record = Document(
                doc_uid=doc_uid,
                original_filename=safe_orig_name,
                encrypted_filename=output_filename,
                file_extension=ext,
                mime_type=uploaded_file.mimetype or "application/octet-stream",
                original_size_bytes=len(plaintext_bytes),
                encrypted_size_bytes=len(enc_container),
                overhead_bytes=len(enc_container) - len(plaintext_bytes),
                sha256_plaintext_hash=pt_hash,
                sha256_ciphertext_hash=ct_hash,
                storage_path=str(storage_file_path),
                sender_id=g.current_user["id"],
                classification=classification,
                status="ENCRYPTED",
                is_deleted=False,
            )
            db.add(doc_record)
            db.flush()  # dapatkan doc_record.id tanpa commit terpisah

            recip_record = DocumentRecipient(
                document_id=doc_record.id,
                recipient_user_id=recipient_key.user_id,
                recipient_key_id=recipient_key.id,
                recipient_key_fingerprint=recipient_key.key_fingerprint,
                wrapped_session_key_hex=c_info["c_key_hex"],
                ephemeral_public_key_hex=c_info["q_eph_hex"],
                access_status="AUTHORIZED",
            )
            meta_record = EncryptionMetadata(
                document_id=doc_record.id,
                container_magic=c_info["magic"],
                container_version=c_info["version"],
                cipher_algorithm="AES-256-GCM",
                ecc_curve="NIST P-256",
                kdf_algorithm="HKDF-SHA256",
                key_wrap_mode=c_info["wrap_mode"],
                iv_nonce_hex=c_info["iv_nonce_hex"],
                auth_tag_hex=c_info["auth_tag_hex"],
                ephemeral_pub_hex=c_info["q_eph_hex"],
                hkdf_context="HYBRID-CRYPTO-FRAMEWORK-ECDH-AES256GCM-V1",
                aad_json=aad_dict,
                shannon_entropy=enc_result["shannon_entropy"],
                encryption_time_ms=enc_result["encryption_time_ms"],
            )
            db.add(recip_record)
            db.add(meta_record)
            db.commit()
        except Exception:
            db.rollback()
            # Hapus berkas .enc agar tidak tertinggal tanpa catatan di database
            storage_file_path.unlink(missing_ok=True)
            raise

        AuditService.record_event(
            db=db,
            user_id=g.current_user["id"],
            actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
            action_type="ENCRYPTION",
            ip_address=request.remote_addr or "127.0.0.1",
            document_id=doc_record.id,
            document_name=safe_orig_name,
            status="SUCCESS",
            metadata={
                "document_id": doc_record.id,
                "doc_uid": doc_uid,
                "recipient_username": recipient_key.owner.username,
                "recipient_fingerprint": recipient_key.key_fingerprint,
                "original_size_bytes": len(plaintext_bytes),
                "container_size_bytes": len(enc_container),
                "overhead_bytes": c_info["header_size_bytes"],
                "encryption_time_ms": enc_result["encryption_time_ms"],
                "shannon_entropy": enc_result["shannon_entropy"],
                "classification": classification,
            },
        )

        if req_dto.response_mode == "json" or request.args.get("format") == "json":
            res_payload = Lazy.transform(
                {
                    "message": "Dokumen berhasil dienkripsi dan disimpan.",
                    "document_id": doc_record.id,
                    "doc_uid": doc_uid,
                    "encrypted_filename": output_filename,
                    "original_size_bytes": len(plaintext_bytes),
                    "encrypted_size_bytes": len(enc_container),
                    "overhead_bytes": c_info["header_size_bytes"],
                    "encryption_time_ms": enc_result["encryption_time_ms"],
                    "throughput_mibs": enc_result["throughput_mibs"],
                    "shannon_entropy": enc_result["shannon_entropy"],
                    "recipient_fingerprint": recipient_key.key_fingerprint,
                    "container_info": c_info,
                },
                EncryptDocumentJsonResponseDTO,
                serialize=True,
            )
            return jsonify(res_payload), 201

        del enc_container
        response = send_file(
            storage_file_path,
            mimetype="application/octet-stream",
            as_attachment=True,
            download_name=output_filename,
        )
        response.headers["X-Container-Header"] = c_info["magic"]
        response.headers["X-Recipient-Fingerprint"] = recipient_key.key_fingerprint
        response.headers["X-Document-Id"] = str(doc_record.id)
        response.headers["X-Encryption-Time-Ms"] = str(enc_result["encryption_time_ms"])
        response.headers["X-Shannon-Entropy"] = str(enc_result["shannon_entropy"])
        return response
    finally:
        db.close()
