/**
 * ECC Key Management Request / Response DTO Structs
 */
import {
  asBoolean,
  asNullableNumber,
  asNullableString,
  asNumber,
  asRecordArray,
  asString
} from "../utils/validators";

export interface KeyHistoryItem {
  id: number;
  fingerprint: string;
  created_at: string | null;
  is_revoked: boolean;
}

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

  constructor(data: Record<string, unknown> = {}) {
    this.key_id = asNumber(data.key_id, 0);
    this.user_id = asNumber(data.user_id, 0);
    this.full_name = asString(data.full_name);
    this.username = asString(data.username);
    this.email = asString(data.email);
    this.department = asString(data.department);
    this.role = asString(data.role, "STAFF");
    this.clearance_level = asNumber(data.clearance_level, 1);
    this.fingerprint = asString(data.fingerprint);
    this.curve = asString(data.curve, "NIST P-256");
    this.public_key_pem = asString(data.public_key_pem);
    this.created_at = asNullableString(data.created_at);
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
  key_history: KeyHistoryItem[];

  constructor(data: Record<string, unknown> = {}) {
    this.has_active_key = asBoolean(data.has_active_key);
    this.key_id = asNullableNumber(data.key_id);
    this.user_id = asNullableNumber(data.user_id);
    this.username = asString(data.username);
    this.fingerprint = asString(data.fingerprint);
    this.curve = asString(data.curve, "NIST P-256");
    this.kdf_protection = asString(data.kdf_protection);
    this.public_key_pem = asString(data.public_key_pem);
    this.encrypted_private_key_pem = asString(data.encrypted_private_key_pem);
    this.created_at = asNullableString(data.created_at);
    this.key_history = asRecordArray(data.key_history).map((item) => ({
      id: asNumber(item.id, 0),
      fingerprint: asString(item.fingerprint),
      created_at: asNullableString(item.created_at),
      is_revoked: asBoolean(item.is_revoked)
    }));
  }
}

export class KeyPairGeneratedResponseDTO {
  message: string;
  key_id: number | null;
  fingerprint: string;
  curve: string;
  public_key_pem: string;
  private_key_pkcs8_pem: string;

  constructor(data: Record<string, unknown> = {}) {
    this.message = asString(data.message, "Pasangan kunci ECC berhasil dibuat.");
    this.key_id = asNullableNumber(data.key_id);
    this.fingerprint = asString(data.fingerprint);
    this.curve = asString(data.curve, "NIST P-256");
    this.public_key_pem = asString(data.public_key_pem);
    this.private_key_pkcs8_pem = asString(data.private_key_pkcs8_pem);
  }
}

export class VerifyKeyResponseDTO {
  is_valid: boolean;
  actual_fingerprint: string;
  expected_fingerprint: string;
  curve: string;
  detail: string;

  constructor(data: Record<string, unknown> = {}) {
    this.is_valid = asBoolean(data.is_valid);
    this.actual_fingerprint = asString(data.actual_fingerprint);
    this.expected_fingerprint = asString(data.expected_fingerprint);
    this.curve = asString(data.curve, "NIST P-256");
    this.detail = asString(data.detail);
  }
}
