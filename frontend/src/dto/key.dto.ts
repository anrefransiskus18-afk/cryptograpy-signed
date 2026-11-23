/**
 * ECC Key Management Request / Response DTO Structs
 */

export class KeyPassphraseRequestDTO {
  passphrase: string;

  constructor({ passphrase = "" }: { passphrase?: string } = {}) {
    this.passphrase = String(passphrase || "");
  }
}

export class VerifyKeyRequestDTO {
  private_key_pkcs8?: string;
  passphrase: string;

  constructor({
    private_key_pkcs8 = "",
    passphrase = ""
  }: { private_key_pkcs8?: string; passphrase?: string } = {}) {
    this.private_key_pkcs8 = String(private_key_pkcs8 || "") || undefined;
    this.passphrase = String(passphrase || "");
  }
}

export class PublicKeyDirectoryItemDTO {
  key_id: number;
  user_id: number;
  full_name: string;
  username: string;
  email: string;
  department: string;
  role: string;
  clearance_level: number;
  fingerprint: string;
  curve: string;
  public_key_pem: string;
  created_at: string | null;

  constructor(data: Record<string, any> = {}) {
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
  has_active_key: boolean;
  key_id: number | null;
  user_id: number | null;
  username: string;
  fingerprint: string;
  curve: string;
  kdf_protection: string;
  public_key_pem: string;
  encrypted_private_key_pem: string;
  created_at: string | null;
  key_history: Array<Record<string, any>>;

  constructor(data: Record<string, any> = {}) {
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
  message: string;
  key_id: number | null;
  fingerprint: string;
  curve: string;
  public_key_pem: string;
  private_key_pkcs8_pem: string;

  constructor(data: Record<string, any> = {}) {
    this.message = data.message || "Pasangan kunci ECC berhasil dibuat.";
    this.key_id = data.key_id ?? null;
    this.fingerprint = data.fingerprint || "";
    this.curve = data.curve || "NIST P-256";
    this.public_key_pem = data.public_key_pem || "";
    this.private_key_pkcs8_pem = data.private_key_pkcs8_pem || "";
  }
}

export class VerifyKeyResponseDTO {
  is_valid: boolean;
  actual_fingerprint: string;
  expected_fingerprint: string;
  curve: string;
  detail: string;

  constructor(data: Record<string, any> = {}) {
    this.is_valid = Boolean(data.is_valid);
    this.actual_fingerprint = data.actual_fingerprint || "";
    this.expected_fingerprint = data.expected_fingerprint || "";
    this.curve = data.curve || "NIST P-256";
    this.detail = data.detail || "";
  }
}
