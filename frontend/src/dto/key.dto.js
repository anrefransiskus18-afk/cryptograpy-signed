/**
 * ECC Key Management Request / Response DTO Structs
 */

export class KeyPassphraseRequestDTO {
  constructor({ passphrase = "" } = {}) {
    this.passphrase = String(passphrase || "");
  }
}

export class VerifyKeyRequestDTO {
  constructor({ private_key_pkcs8 = "", passphrase = "" } = {}) {
    this.private_key_pkcs8 = String(private_key_pkcs8 || "") || undefined;
    this.passphrase = String(passphrase || "");
  }
}

export class PublicKeyDirectoryItemDTO {
  constructor(data = {}) {
    this.key_id = Number(data.key_id || 0);
    this.user_id = Number(data.user_id || 0);
    this.full_name = data.full_name || "";
    this.username = data.username || "";
    this.email = data.email || "";
    this.department = data.department || "";
    this.role = data.role || "STAFF";
    this.clearance_level = Number(data.clearance_level || 1);
    this.fingerprint = data.fingerprint || "";
    this.curve = data.curve || "NIST P-256";
    this.public_key_pem = data.public_key_pem || "";
    this.created_at = data.created_at || null;
  }
}

export class MyKeyStatusResponseDTO {
  constructor(data = {}) {
    this.has_active_key = Boolean(data.has_active_key);
    this.key_id = data.key_id ?? null;
    this.user_id = data.user_id ?? null;
    this.username = data.username || "";
    this.fingerprint = data.fingerprint || "";
    this.curve = data.curve || "NIST P-256";
    this.kdf_protection = data.kdf_protection || "";
    this.public_key_pem = data.public_key_pem || "";
    this.encrypted_private_key_pem = data.encrypted_private_key_pem || "";
    this.created_at = data.created_at || null;
    this.key_history = Array.isArray(data.key_history) ? data.key_history : [];
  }
}

export class KeyPairGeneratedResponseDTO {
  constructor(data = {}) {
    this.message = data.message || "Pasangan kunci ECC berhasil dibuat.";
    this.key_id = data.key_id ?? null;
    this.fingerprint = data.fingerprint || "";
    this.curve = data.curve || "NIST P-256";
    this.public_key_pem = data.public_key_pem || "";
    this.private_key_pkcs8_pem = data.private_key_pkcs8_pem || "";
  }
}

export class VerifyKeyResponseDTO {
  constructor(data = {}) {
    this.is_valid = Boolean(data.is_valid);
    this.actual_fingerprint = data.actual_fingerprint || "";
    this.expected_fingerprint = data.expected_fingerprint || "";
    this.curve = data.curve || "NIST P-256";
    this.detail = data.detail || "";
  }
}
