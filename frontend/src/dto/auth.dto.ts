/**
 * Auth & Profile Request / Response DTO Structs
 */

export class LoginRequestDTO {
  username: string;
  password: string;

  constructor({ username = "", password = "" }: { username?: string; password?: string } = {}) {
    this.username = String(username).trim();
    this.password = String(password);
  }
}

export class ChangePasswordRequestDTO {
  current_password: string;
  new_password: string;

  constructor({
    current_password = "",
    new_password = ""
  }: { current_password?: string; new_password?: string } = {}) {
    this.current_password = String(current_password);
    this.new_password = String(new_password);
  }
}

export class UpdateProfileRequestDTO {
  full_name: string;
  email: string;
  department: string;

  constructor({
    full_name = "",
    email = "",
    department = ""
  }: { full_name?: string; email?: string; department?: string } = {}) {
    this.full_name = String(full_name || "").trim();
    this.email = String(email || "").trim();
    this.department = String(department || "").trim();
  }
}

export class UserProfileDTO {
  id: number;
  nik: string;
  username: string;
  email: string;
  full_name: string;
  department: string;
  role: string;
  clearance_level: number;
  active_key_fingerprint: string | null;
  active_public_key_pem: string | null;
  encrypted_private_key_pem: string | null;
  has_encrypted_private_key: boolean;

  constructor(data: Record<string, any> = {}) {
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

  access_token: string;
  token_type: string;
  user: UserProfileDTO;

  constructor(data: Record<string, any> = {}) {
    this.access_token = data.access_token || "";
    this.token_type = data.token_type || "bearer";
    this.user = (data.user instanceof UserProfileDTO ? data.user : new UserProfileDTO(data.user || {}));
  }
}
