/**
 * Document & Cryptographic Operation Request / Response DTO Structs
 */

export class DocumentFilterRequestDTO {
  search: string;
  classification: string;
  scope: string;
  page: number;
  per_page: number;

  constructor({
    search = "",
    classification = "",
    scope = "all",
    page = 1,
    per_page = 50
  }: {
    search?: string;
    classification?: string;
    scope?: string;
    page?: number;
    per_page?: number;
  } = {}) {
    this.search = String(search || "").trim();
    this.classification = String(classification || "").trim();
    this.scope = String(scope || "all").trim();
    this.page = Number(page || 1);
    this.per_page = Number(per_page || 50);
  }
}

export class AadMetadataDTO {
  classification: string;
  origin_department: string;
  document_version: string;

  constructor({
    classification = "CONFIDENTIAL",
    origin_department = "Divisi Keamanan Informasi",
    document_version = "1.0"
  }: {
    classification?: string;
    origin_department?: string;
    document_version?: string;
  } = {}) {
    this.classification = classification;
    this.origin_department = origin_department;
    this.document_version = document_version;
  }

  toJSONString(): string {
    return JSON.stringify({
      classification: this.classification,
      origin_department: this.origin_department,
      document_version: this.document_version
    });
  }
}

export class EncryptDocumentRequestDTO {
  static schema = {
    aad: AadMetadataDTO
  };

  document: File | null;
  recipient_key_id: number | null;
  aad: AadMetadataDTO;
  wrap_mode: string;

  constructor({
    document = null,
    recipient_key_id = null,
    aad = new AadMetadataDTO(),
    wrap_mode = "XOR_AAD"
  }: {
    document?: File | null;
    recipient_key_id?: number | null;
    aad?: AadMetadataDTO | Record<string, any>;
    wrap_mode?: string;
  } = {}) {
    this.document = document;
    this.recipient_key_id = recipient_key_id;
    this.aad = aad instanceof AadMetadataDTO ? aad : new AadMetadataDTO(aad);
    this.wrap_mode = wrap_mode || "XOR_AAD";
  }

  toFormData(): FormData {
    const formData = new FormData();
    if (this.document) {
      formData.append("document", this.document);
    }
    if (this.recipient_key_id !== null && this.recipient_key_id !== undefined) {
      formData.append("recipient_key_id", String(this.recipient_key_id));
    }
    const aadStr =
      typeof this.aad?.toJSONString === "function"
        ? this.aad.toJSONString()
        : JSON.stringify(this.aad || {});
    formData.append("aad_json", aadStr);
    formData.append("wrap_mode", this.wrap_mode);
    return formData;
  }
}

export class DecryptDocumentRequestDTO {
  enc_file: File | null;
  document_id: number | null;
  use_stored_key: boolean;
  private_key_pkcs8: string;
  passphrase: string;
  aad_json: string;
  original_filename: string;

  constructor({
    enc_file = null,
    document_id = null,
    use_stored_key = true,
    private_key_pkcs8 = "",
    passphrase = "",
    aad_json = "",
    original_filename = ""
  }: {
    enc_file?: File | null;
    document_id?: number | null;
    use_stored_key?: boolean;
    private_key_pkcs8?: string;
    passphrase?: string;
    aad_json?: string | Record<string, unknown>;
    original_filename?: string;
  } = {}) {
    this.enc_file = enc_file;
    this.document_id = document_id;
    this.use_stored_key = Boolean(use_stored_key);
    this.private_key_pkcs8 = String(private_key_pkcs8 || "");
    this.passphrase = String(passphrase || "");
    this.aad_json =
      typeof aad_json === "string"
        ? aad_json
        : aad_json && Object.keys(aad_json).length
          ? JSON.stringify(aad_json)
          : "";
    this.original_filename = String(original_filename || "");
  }

  toFormData(): FormData {
    const formData = new FormData();
    if (this.enc_file) {
      formData.append("enc_file", this.enc_file);
    } else if (this.document_id) {
      formData.append("document_id", String(this.document_id));
    }
    if (this.use_stored_key) {
      formData.append("use_stored_key", "true");
    } else {
      formData.append("private_key_pkcs8", this.private_key_pkcs8);
    }
    formData.append("passphrase", this.passphrase);
    if (this.aad_json && this.aad_json.trim() !== "{}") {
      formData.append("aad_json", this.aad_json);
    }
    if (this.original_filename) {
      formData.append("original_filename", this.original_filename);
    }
    return formData;
  }
}

export class DocumentRecipientDTO {
  recipient_user_id: number | null;
  recipient_username: string;
  recipient_full_name: string;
  recipient_department: string;
  recipient_key_fingerprint: string;
  access_status: string;
  decrypted_count: number;
  last_decrypted_at: string | null;

  constructor(data: Record<string, any> = {}) {
    this.recipient_user_id = data.recipient_user_id ?? null;
    this.recipient_username = data.recipient_username || "";
    this.recipient_full_name = data.recipient_full_name || "Penerima";
    this.recipient_department = data.recipient_department || "";
    this.recipient_key_fingerprint = data.recipient_key_fingerprint || "";
    this.access_status = data.access_status || "GRANTED";
    this.decrypted_count = Number(data.decrypted_count || 0);
    this.last_decrypted_at = data.last_decrypted_at || null;
  }
}

export class EncryptionMetadataDTO {
  container_magic: string;
  container_version: string;
  cipher_algorithm: string;
  ecc_curve: string;
  kdf_algorithm: string;
  key_wrap_mode: string;
  iv_gcm_hex: string;
  auth_tag_gcm_hex: string;
  ephemeral_public_point_hex: string;
  aad_json: Record<string, any>;
  shannon_entropy: number | null;
  encryption_duration_ms: number | null;

  constructor(data: Record<string, any> = {}) {
    this.container_magic = data.container_magic || data.container_version || "HC01";
    this.container_version = data.container_version || data.container_magic || "HC01";
    this.cipher_algorithm = data.cipher_algorithm || "AES-256-GCM";
    this.ecc_curve = data.ecc_curve || "NIST P-256";
    this.kdf_algorithm = data.kdf_algorithm || "HKDF-SHA256";
    this.key_wrap_mode = data.key_wrap_mode || "XOR_AAD";
    this.iv_gcm_hex = data.iv_gcm_hex || data.iv_nonce_hex || "";
    this.auth_tag_gcm_hex = data.auth_tag_gcm_hex || data.auth_tag_hex || "";
    this.ephemeral_public_point_hex = data.ephemeral_public_point_hex || data.ephemeral_pub_hex || "";
    this.aad_json = data.aad_json || {};
    this.shannon_entropy = data.shannon_entropy ?? null;
    this.encryption_duration_ms = data.encryption_duration_ms ?? data.encryption_time_ms ?? null;
  }
}

export class DocumentResponseDTO {
  static schema = {
    recipients: [DocumentRecipientDTO],
    encryption_metadata: EncryptionMetadataDTO
  };

  id: number;
  doc_uid: string;
  original_filename: string;
  encrypted_filename: string;
  file_extension: string;
  mime_type: string;
  original_size_bytes: number;
  encrypted_size_bytes: number;
  overhead_bytes: number;
  sha256_plaintext_hash: string;
  sha256_ciphertext_hash: string;
  sender_id: number | null;
  sender_username: string;
  sender_full_name: string;
  classification: string;
  status: string;
  created_at: string | null;
  recipients: DocumentRecipientDTO[];
  encryption_metadata: EncryptionMetadataDTO;

  constructor(data: Record<string, any> = {}) {
    this.id = Number(data.id || 0);
    this.doc_uid = data.doc_uid || "";
    this.original_filename = data.original_filename || "";
    this.encrypted_filename = data.encrypted_filename || "";
    this.file_extension = data.file_extension || "";
    this.mime_type = data.mime_type || "application/octet-stream";
    this.original_size_bytes = Number(data.original_size_bytes || 0);
    this.encrypted_size_bytes = Number(data.encrypted_size_bytes || 0);
    this.overhead_bytes = Number(data.overhead_bytes || 129);
    this.sha256_plaintext_hash = data.sha256_plaintext_hash || "";
    this.sha256_ciphertext_hash = data.sha256_ciphertext_hash || "";
    this.sender_id = data.sender_id ?? null;
    this.sender_username = data.sender_username || "";
    this.sender_full_name = data.sender_full_name || data.sender_username || "";
    this.classification = data.classification || "CONFIDENTIAL";
    this.status = data.status || "ENCRYPTED";
    this.created_at = data.created_at || null;
    this.recipients = Array.isArray(data.recipients) ? data.recipients : [];
    const meta =
      data.encryption_metadata ||
      data.cryptographic_parameters || {
        aad_json: data.aad_json,
        shannon_entropy: data.shannon_entropy,
        encryption_time_ms: data.encryption_time_ms,
        container_magic: data.container_magic
      };
    this.encryption_metadata = meta instanceof EncryptionMetadataDTO ? meta : new EncryptionMetadataDTO(meta);
  }
}

export class DocumentListResponseDTO {
  static schema = {
    items: [DocumentResponseDTO]
  };

  items: DocumentResponseDTO[];
  total: number;
  page: number;
  per_page: number;

  constructor(data: Record<string, any> | any[] = {}) {
    const raw = Array.isArray(data) ? { items: data } : data;
    this.items = Array.isArray(data) ? data : raw.items || [];
    this.total = Number(raw.total ?? this.items.length);
    this.page = Number(raw.page || 1);
    this.per_page = Number(raw.per_page || 50);
  }
}

export class EncryptResultResponseDTO {
  blob: Blob;
  filename: string;
  docId: number | null;
  timeMs: string;
  entropy: string;
  header: string;

  constructor({
    blob,
    headers = {},
    originalFilename = "document"
  }: {
    blob: Blob;
    headers?: Record<string, string>;
    originalFilename?: string;
  }) {
    this.blob = blob;
    this.filename = `${originalFilename}.enc`;
    this.docId = headers["x-document-id"] ? Number(headers["x-document-id"]) : null;
    this.timeMs = headers["x-encryption-time-ms"] || "12.4";
    this.entropy = headers["x-shannon-entropy"] || "7.999";
    this.header = headers["x-container-header"] || "HC01";
  }
}
