/**
 * Auth & Profile Request / Response DTO Structs
 */

export class LoginRequestDTO {
  constructor({ username = "", password = "" } = {}) {
    this.username = String(username).trim();
    this.password = String(password);
  }
}

export class ChangePasswordRequestDTO {
  constructor({ current_password = "", new_password = "" } = {}) {
    this.current_password = String(current_password);
    this.new_password = String(new_password);
  }
}

export class UpdateProfileRequestDTO {
  constructor({ full_name = "", email = "", department = "" } = {}) {
    this.full_name = String(full_name || "").trim();
    this.email = String(email || "").trim();
    this.department = String(department || "").trim();
  }
}

export class UserProfileDTO {
  constructor(data = {}) {
    this.id = Number(data.id || 0);
    this.nik = data.nik || "";
    this.username = data.username || "";
    this.email = data.email || "";
    this.full_name = data.full_name || "";
    this.department = data.department || "";
    this.role = data.role || "STAFF";
    this.clearance_level = Number(data.clearance_level || 1);
    this.active_key_fingerprint = data.active_key_fingerprint || null;
    this.active_public_key_pem = data.active_public_key_pem || null;
    this.encrypted_private_key_pem = data.encrypted_private_key_pem || null;
    this.has_encrypted_private_key = Boolean(
      data.has_encrypted_private_key ?? data.encrypted_private_key_pem
    );
  }
}

export class LoginResponseDTO {
  static schema = {
    user: UserProfileDTO
  };

  constructor(data = {}) {
    this.access_token = data.access_token || "";
    this.token_type = data.token_type || "bearer";
    this.user = data.user || {};
  }
}
