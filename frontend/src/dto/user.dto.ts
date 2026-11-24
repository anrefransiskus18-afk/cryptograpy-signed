/**
 * User Management Request / Response DTO Structs
 */
import { DEMO_KEY_PASSPHRASE, DEMO_NEW_USER_PASSWORD } from "../config/demo";
import {
  asBoolean,
  asNullableNumber,
  asNullableString,
  asNumber,
  asRecord,
  asString,
  asStringArray
} from "../utils/validators";

export class UserFilterRequestDTO {
  search: string;
  role: string;
  include_deleted?: string;

  constructor({
    search = "",
    role = "",
    include_deleted = false
  }: { search?: string; role?: string; include_deleted?: boolean } = {}) {
    this.search = search;
    this.role = role;
    this.include_deleted = include_deleted ? "true" : undefined;
  }
}

export class CreateUserRequestDTO {
  username: string;
  nik?: string;
  full_name: string;
  email: string;
  department: string;
  role: string;
  password: string;
  key_passphrase: string;
  auto_generate_key: boolean;

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
  }: {
    username?: string;
    nik?: string;
    full_name?: string;
    email?: string;
    department?: string;
    role?: string;
    password?: string;
    key_passphrase?: string;
    auto_generate_key?: boolean;
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
  full_name?: string;
  email?: string;
  department?: string;
  nik?: string;
  role?: string;
  is_active?: boolean;
  password?: string;
  reset_ecc_key?: boolean;
  key_passphrase?: string;

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
  }: {
    full_name?: string;
    email?: string;
    department?: string;
    nik?: string;
    role?: string;
    is_active?: boolean;
    password?: string;
    reset_ecc_key?: boolean;
    key_passphrase?: string;
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
  id: number;
  nik: string;
  username: string;
  email: string;
  full_name: string;
  department: string;
  role: string;
  roles: string[];
  clearance_level: number;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string | null;
  key_fingerprint: string | null;
  public_key_pem: string | null;

  constructor(data: Record<string, unknown> = {}) {
    this.id = asNumber(data.id, 0);
    this.nik = asString(data.nik);
    this.username = asString(data.username);
    this.email = asString(data.email);
    this.full_name = asString(data.full_name);
    this.department = asString(data.department);
    this.role = asString(data.role, "STAFF");
    const parsedRoles = asStringArray(data.roles);
    this.roles = parsedRoles.length > 0 ? parsedRoles : [this.role];
    this.clearance_level = asNumber(data.clearance_level, 1);
    this.is_active = asBoolean(data.is_active, true);
    this.deleted_at = asNullableString(data.deleted_at);
    this.created_at = asNullableString(data.created_at);
    this.key_fingerprint = asNullableString(data.key_fingerprint);
    this.public_key_pem = asNullableString(data.public_key_pem);
  }
}

export class UserMutationResponseDTO {
  static schema = {
    user: UserResponseDTO
  };

  message: string;
  id: number | null;
  user: UserResponseDTO;

  constructor(data: Record<string, unknown> = {}) {
    const rawUser = asRecord(data.user);
    this.message = asString(data.message);
    this.id = asNullableNumber(data.id ?? rawUser.id);
    this.user = data.user instanceof UserResponseDTO ? data.user : new UserResponseDTO(rawUser);
  }
}
