from pathlib import Path
from flask import Blueprint, request, jsonify, send_file, g

from ..database import get_db_session
from ..models import Document
from ..repositories import DocumentRepository
from ..core.permissions import jwt_required, is_admin_user
from ..services.AuditService import AuditService
from ..dto import (
    Lazy,
    DocumentFilterRequestDTO,
    DocumentResponseDTO,
    DocumentListResponseDTO,
)

documents_bp = Blueprint("documents_bp", __name__)


def _serialize_document(doc: Document, include_details: bool = False) -> dict:
    recipients_list = [
        {
            "recipient_user_id": r.recipient_user_id,
            "recipient_username": r.recipient.username if r.recipient else None,
            "recipient_full_name": r.recipient.full_name if r.recipient else None,
            "recipient_department": r.recipient.department if r.recipient else None,
            "recipient_key_fingerprint": r.recipient_key_fingerprint,
            "access_status": r.access_status,
            "decrypted_count": r.decrypted_count,
            "last_decrypted_at": r.last_decrypted_at.isoformat() if r.last_decrypted_at else None,
        }
        for r in doc.recipients
    ]
    meta = doc.encryption_meta
    data = {
        "id": doc.id,
        "doc_uid": doc.doc_uid,
        "original_filename": doc.original_filename,
        "encrypted_filename": doc.encrypted_filename,
        "file_extension": doc.file_extension,
        "mime_type": doc.mime_type,
        "original_size_bytes": doc.original_size_bytes,
        "encrypted_size_bytes": doc.encrypted_size_bytes,
        "overhead_bytes": doc.overhead_bytes,
        "sha256_plaintext_hash": doc.sha256_plaintext_hash,
        "sha256_ciphertext_hash": doc.sha256_ciphertext_hash,
        "sender_id": doc.sender_id,
        "sender_username": doc.sender.username if doc.sender else None,
        "sender_full_name": doc.sender.full_name if doc.sender else None,
        "classification": doc.classification,
        "status": doc.status,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "recipients": recipients_list,
        "aad_json": meta.aad_json if meta else {},
        "shannon_entropy": meta.shannon_entropy if meta else None,
        "encryption_time_ms": meta.encryption_time_ms if meta else None,
        "container_magic": meta.container_magic if meta else "HC01",
    }
    if include_details and meta:
        crypto_params = {
            "container_magic": meta.container_magic,
            "container_version": meta.container_magic or meta.container_version,
            "cipher_algorithm": meta.cipher_algorithm,
            "ecc_curve": meta.ecc_curve,
            "kdf_algorithm": meta.kdf_algorithm,
            "key_wrap_mode": meta.key_wrap_mode,
            "iv_nonce_hex": meta.iv_nonce_hex,
            "iv_gcm_hex": meta.iv_nonce_hex,
            "auth_tag_hex": meta.auth_tag_hex,
            "auth_tag_gcm_hex": meta.auth_tag_hex,
            "ephemeral_pub_hex": meta.ephemeral_pub_hex,
            "ephemeral_public_point_hex": meta.ephemeral_pub_hex,
            "hkdf_context": meta.hkdf_context,
            "aad_json": meta.aad_json,
            "shannon_entropy": meta.shannon_entropy,
            "encryption_time_ms": meta.encryption_time_ms,
            "encryption_duration_ms": meta.encryption_time_ms,
        }
        data["cryptographic_parameters"] = crypto_params
        data["encryption_metadata"] = crypto_params
    return Lazy.transform(data, DocumentResponseDTO, serialize=True)


def _user_can_access_doc(doc: Document, current_user: dict) -> bool:
    if is_admin_user(current_user):
        return True
    if doc.sender_id == current_user["id"]:
        return True
    return any(r.recipient_user_id == current_user["id"] for r in doc.recipients)


@documents_bp.route("/api/documents", methods=["GET"])
@documents_bp.route("/api/v1/documents", methods=["GET"])
@jwt_required()
def list_documents():
    filter_req: DocumentFilterRequestDTO = Lazy.transform(
        request.args.to_dict(), DocumentFilterRequestDTO
    )

    db = get_db_session()
    try:
        page_docs, total = DocumentRepository.list_accessible(
            db=db,
            user_id=g.current_user["id"],
            is_admin=is_admin_user(g.current_user),
            scope=filter_req.scope,
            classification=filter_req.classification,
            search=filter_req.search,
            page=filter_req.page,
            per_page=filter_req.per_page,
        )
        items = [_serialize_document(d, include_details=True) for d in page_docs]

        res_payload = Lazy.transform(
            {
                "items": items,
                "total": total,
                "page": filter_req.page,
                "per_page": filter_req.per_page,
            },
            DocumentListResponseDTO,
            serialize=True,
        )
        return jsonify(res_payload)
    finally:
        db.close()


@documents_bp.route("/api/documents/<int:doc_id>", methods=["GET"])
@documents_bp.route("/api/v1/documents/<int:doc_id>", methods=["GET"])
@jwt_required()
def get_document_detail(doc_id: int):
    db = get_db_session()
    try:
        doc = db.query(Document).filter(Document.id == doc_id, Document.is_deleted == False).first()
        if not doc:
            return jsonify({"detail": "Dokumen tidak ditemukan."}), 404
        if not _user_can_access_doc(doc, g.current_user):
            return jsonify({"detail": "Anda tidak memiliki izin untuk melihat metadata dokumen ini."}), 403
        return jsonify(_serialize_document(doc, include_details=True))
    finally:
        db.close()


@documents_bp.route("/api/documents/<int:doc_id>/download", methods=["GET"])
@documents_bp.route("/api/v1/documents/<int:doc_id>/download", methods=["GET"])
@jwt_required()
def download_encrypted_document(doc_id: int):
    db = get_db_session()
    try:
        doc = db.query(Document).filter(Document.id == doc_id, Document.is_deleted == False).first()
        if not doc:
            return jsonify({"detail": "Dokumen tidak ditemukan."}), 404
        if not _user_can_access_doc(doc, g.current_user):
            AuditService.record_event(
                db=db,
                user_id=g.current_user["id"],
                actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
                action_type="UNAUTHORIZED_ACCESS",
                ip_address=request.remote_addr or "127.0.0.1",
                document_id=doc.id,
                document_name=doc.encrypted_filename,
                status="FAILURE",
                metadata={"reason": "Unauthorized download attempt"},
            )
            return jsonify({"detail": "Anda tidak memiliki hak akses untuk mengunduh dokumen terenkripsi ini."}), 403

        path = Path(doc.storage_path)
        if not path.exists():
            return jsonify({"detail": "File kontainer .enc tidak ditemukan pada storage server."}), 404

        AuditService.record_event(
            db=db,
            user_id=g.current_user["id"],
            actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
            action_type="DOCUMENT_DOWNLOADED",
            ip_address=request.remote_addr or "127.0.0.1",
            document_id=doc.id,
            document_name=doc.encrypted_filename,
            status="SUCCESS",
            metadata={"doc_uid": doc.doc_uid, "encrypted_size_bytes": doc.encrypted_size_bytes},
        )
        return send_file(
            path,
            mimetype="application/octet-stream",
            as_attachment=True,
            download_name=doc.encrypted_filename,
        )
    finally:
        db.close()


@documents_bp.route("/api/documents/<int:doc_id>", methods=["DELETE"])
@documents_bp.route("/api/v1/documents/<int:doc_id>", methods=["DELETE"])
@jwt_required()
def delete_document(doc_id: int):
    db = get_db_session()
    try:
        doc = db.query(Document).filter(Document.id == doc_id, Document.is_deleted == False).first()
        if not doc:
            return jsonify({"detail": "Dokumen tidak ditemukan."}), 404
        if doc.sender_id != g.current_user["id"] and not is_admin_user(g.current_user):
            return jsonify({"detail": "Hanya pengirim dokumen atau Administrator yang dapat menghapus dokumen ini."}), 403

        doc.is_deleted = True
        doc.status = "DELETED"
        db.commit()

        # Hapus berkas fisik .enc dari storage server agar tidak menumpuk
        try:
            if doc.storage_path:
                Path(doc.storage_path).unlink(missing_ok=True)
        except OSError:
            pass

        AuditService.record_event(
            db=db,
            user_id=g.current_user["id"],
            actor_identity=f"{g.current_user['username']} ({g.current_user['role']})",
            action_type="DOCUMENT_DELETED",
            ip_address=request.remote_addr or "127.0.0.1",
            document_id=doc.id,
            document_name=doc.original_filename,
            status="SUCCESS",
            metadata={"doc_uid": doc.doc_uid},
        )
        return jsonify({"message": f"Dokumen {doc.original_filename} berhasil dihapus dari repositori aktif."})
    finally:
        db.close()
