/**
 * User Management Request / Response DTO Structs
 */
import { DEMO_KEY_PASSPHRASE, DEMO_NEW_USER_PASSWORD } from "../config/demo";

export class UserFilterRequestDTO {
  constructor({ search = "", role = "", include_deleted = false } = {}) {
    this.search = search;
    this.role = role;
    this.include_deleted = include_deleted ? "true" : undefined;
  }
}

export class CreateUserRequestDTO {
  constructor({
    username = "",
    nik = "",
    full_name = "",
    email = "",
    department = "Operasional & Kepatuhan",
    role = "STAFF",
    password = DEMO_NEW_USER_PASSWORD,
    key_passphrase = DEMO_KEY_PASSPHRASE,
    auto_generate_key = true
  } = {}) {
    this.username = String(username || "").trim();
    this.nik = String(nik || "").trim() || undefined;
    this.full_name = String(full_name || "").trim();
    this.email = String(email || "").trim();
    this.department = String(department || "").trim();
    this.role = String(role || "STAFF").trim().toUpperCase();
    this.password = String(password || "");
    this.key_passphrase = String(key_passphrase || "");
    this.auto_generate_key = Boolean(auto_generate_key);
  }
}

export class UpdateUserRequestDTO {
  constructor({
    full_name,
    email,
    department,
    nik,
    role,
    is_active,
    password,
    reset_ecc_key,
    key_passphrase
  } = {}) {
    this.full_name = full_name;
    this.email = email;
    this.department = department;
    this.nik = nik;
    this.role = role;
    this.is_active = is_active;
    this.password = password;
    this.reset_ecc_key = reset_ecc_key;
    this.key_passphrase = key_passphrase;
  }
}

export class UserResponseDTO {
  constructor(data = {}) {
    this.id = Number(data.id || 0);
    this.nik = data.nik || "";
    this.username = data.username || "";
    this.email = data.email || "";
    this.full_name = data.full_name || "";
    this.department = data.department || "";
    this.role = data.role || "STAFF";
    this.roles = Array.isArray(data.roles) ? data.roles : [this.role];
    this.clearance_level = Number(data.clearance_level || 1);
    this.is_active = Boolean(data.is_active ?? true);
    this.deleted_at = data.deleted_at || null;
    this.created_at = data.created_at || null;
    this.key_fingerprint = data.key_fingerprint || null;
    this.public_key_pem = data.public_key_pem || null;
  }
}

export class UserMutationResponseDTO {
  static schema = {
    user: UserResponseDTO
  };

  constructor(data = {}) {
    this.message = data.message || "";
    this.id = data.id ?? data.user?.id ?? null;
    this.user = data.user || {};
  }
}
