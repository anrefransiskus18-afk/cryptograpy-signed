"""
Document & Hybrid Crypto Metadata Request / Response DTO Structs (Backend)
"""

import json


class DocumentFilterRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.search = str(data.get("search") or "").strip().lower()
        self.classification = str(data.get("classification") or "").strip().upper()
        self.scope = str(data.get("scope") or "all").strip().lower()
        try:
            self.page = max(1, int(data.get("page") or 1))
        except (ValueError, TypeError):
            self.page = 1
        try:
            self.per_page = min(100, max(1, int(data.get("per_page") or 50)))
        except (ValueError, TypeError):
            self.per_page = 50


class EncryptDocumentRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        try:
            self.recipient_key_id = int(data["recipient_key_id"]) if data.get("recipient_key_id") else None
        except (ValueError, TypeError):
            self.recipient_key_id = None
        try:
            self.recipient_user_id = int(data["recipient_user_id"]) if data.get("recipient_user_id") else None
        except (ValueError, TypeError):
            self.recipient_user_id = None

        self.wrap_mode = str(data.get("wrap_mode") or "XOR_AAD").strip().upper()
        self.response_mode = str(data.get("response_mode") or "").strip().lower()
        try:
            hrs = int(data["expires_in_hours"]) if data.get("expires_in_hours") else None
            self.expires_in_hours = hrs if (hrs and hrs > 0) else None
        except (ValueError, TypeError):
            self.expires_in_hours = None
        self.aad_raw = data.get("aad_json", "{}")
        self.aad_valid = True
        if isinstance(self.aad_raw, dict):
            self.aad_dict = self.aad_raw
        else:
            try:
                parsed = json.loads(self.aad_raw) if self.aad_raw else {}
                if not isinstance(parsed, dict):
                    raise ValueError()
                self.aad_dict = parsed
            except ValueError:
                self.aad_dict = {}
                self.aad_valid = False


class EncryptDocumentJsonResponseDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.message = str(data.get("message") or "")
        self.document_id = int(data.get("document_id") or 0)
        self.doc_uid = str(data.get("doc_uid") or "")
        self.encrypted_filename = str(data.get("encrypted_filename") or "")
        self.original_size_bytes = int(data.get("original_size_bytes") or 0)
        self.encrypted_size_bytes = int(data.get("encrypted_size_bytes") or 0)
        self.overhead_bytes = int(data.get("overhead_bytes") or 0)
        self.encryption_time_ms = float(data.get("encryption_time_ms") or 0.0)
        self.throughput_mibs = float(data.get("throughput_mibs") or 0.0)
        self.shannon_entropy = float(data.get("shannon_entropy") or 0.0)
        self.recipient_fingerprint = str(data.get("recipient_fingerprint") or "")
        self.container_info = data.get("container_info") or {}


class DecryptDocumentRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        try:
            self.document_id = int(data["document_id"]) if data.get("document_id") else None
        except (ValueError, TypeError):
            self.document_id = None

        self.private_key_pkcs8 = str(data.get("private_key_pkcs8") or "").strip()
        self.passphrase = str(data.get("passphrase") or "")
        self.aad_json = str(data.get("aad_json") or "")
        self.original_filename = str(data.get("original_filename") or "").strip()
        self.use_stored_key = str(data.get("use_stored_key") or "false").lower() == "true"


class DocumentRecipientDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.recipient_user_id = data.get("recipient_user_id")
        self.recipient_username = data.get("recipient_username")
        self.recipient_full_name = data.get("recipient_full_name")
        self.recipient_department = data.get("recipient_department")
        self.recipient_key_fingerprint = data.get("recipient_key_fingerprint")
        self.access_status = data.get("access_status") or "AUTHORIZED"
        self.decrypted_count = int(data.get("decrypted_count") or 0)
        self.last_decrypted_at = data.get("last_decrypted_at")


class EncryptionMetadataDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.container_magic = data.get("container_magic") or "HC01"
        self.container_version = data.get("container_version") or self.container_magic
        self.cipher_algorithm = data.get("cipher_algorithm") or "AES-256-GCM"
        self.ecc_curve = data.get("ecc_curve") or "NIST P-256"
        self.kdf_algorithm = data.get("kdf_algorithm") or "HKDF-SHA256"
        self.key_wrap_mode = data.get("key_wrap_mode") or "XOR_AAD"
        self.iv_nonce_hex = data.get("iv_nonce_hex") or ""
        self.iv_gcm_hex = data.get("iv_gcm_hex") or self.iv_nonce_hex
        self.auth_tag_hex = data.get("auth_tag_hex") or ""
        self.auth_tag_gcm_hex = data.get("auth_tag_gcm_hex") or self.auth_tag_hex
        self.ephemeral_pub_hex = data.get("ephemeral_pub_hex") or ""
        self.ephemeral_public_point_hex = data.get("ephemeral_public_point_hex") or self.ephemeral_pub_hex
        self.hkdf_context = data.get("hkdf_context") or ""
        self.aad_json = data.get("aad_json") or {}
        self.shannon_entropy = float(data.get("shannon_entropy") or 0.0)
        self.encryption_time_ms = float(data.get("encryption_time_ms") or 0.0)
        self.encryption_duration_ms = float(data.get("encryption_duration_ms") or self.encryption_time_ms)


class DocumentResponseDTO:
    schema = {
        "recipients": [DocumentRecipientDTO],
        "encryption_metadata": EncryptionMetadataDTO,
        "cryptographic_parameters": EncryptionMetadataDTO,
    }

    def __init__(self, data: dict = None):
        data = data or {}
        self.id = int(data.get("id") or 0)
        self.doc_uid = str(data.get("doc_uid") or "")
        self.original_filename = str(data.get("original_filename") or "")
        self.encrypted_filename = str(data.get("encrypted_filename") or "")
        self.file_extension = str(data.get("file_extension") or "")
        self.mime_type = str(data.get("mime_type") or "application/octet-stream")
        self.original_size_bytes = int(data.get("original_size_bytes") or 0)
        self.encrypted_size_bytes = int(data.get("encrypted_size_bytes") or 0)
        self.overhead_bytes = int(data.get("overhead_bytes") or 0)
        self.sha256_plaintext_hash = str(data.get("sha256_plaintext_hash") or "")
        self.sha256_ciphertext_hash = str(data.get("sha256_ciphertext_hash") or "")
        self.sender_id = data.get("sender_id")
        self.sender_username = data.get("sender_username")
        self.sender_full_name = data.get("sender_full_name")
        self.classification = str(data.get("classification") or "INTERNAL")
        self.status = str(data.get("status") or "ENCRYPTED")
        self.expires_at = data.get("expires_at")
        self.created_at = data.get("created_at")
        self.recipients = data.get("recipients") or []
        self.aad_json = data.get("aad_json") or {}
        self.shannon_entropy = data.get("shannon_entropy")
        self.encryption_time_ms = data.get("encryption_time_ms")
        self.container_magic = data.get("container_magic") or "HC01"
        self.encryption_metadata = data.get("encryption_metadata") or {}
        self.cryptographic_parameters = data.get("cryptographic_parameters") or self.encryption_metadata


class DocumentListResponseDTO:
    schema = {
        "items": [DocumentResponseDTO],
    }

    def __init__(self, data: dict = None):
        data = data or {}
        self.items = data.get("items") or []
        self.total = int(data.get("total") or 0)
        self.page = int(data.get("page") or 1)
        self.per_page = int(data.get("per_page") or 50)
