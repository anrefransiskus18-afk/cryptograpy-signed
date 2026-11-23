export type Brand<T, B extends string> = T & { readonly __brand: B };

export type PlaintextBytes = Brand<Uint8Array, "PlaintextBytes">;
export type CiphertextBytes = Brand<Uint8Array, "CiphertextBytes">;
export type KeyFingerprint = Brand<string, "KeyFingerprint">;

export type UserRole =
  | "SECURITY_ADMIN"
  | "ADMINISTRATOR"
  | "EXECUTIVE"
  | "MANAGER"
  | "AUTHORIZED_RECIPIENT"
  | "STAFF";

export type ClassificationLevel =
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "SECRET"
  | "TOP_SECRET";

export type KeyWrapMode = "XOR_AAD" | "AES_GCM_KW";

export interface MessageResponse {
  message: string;
}

export interface ChangePasswordResponse {
  message: string;
  relogin_required?: boolean;
}

export interface VerifyAuditChainResponse {
  valid: boolean;
  total: number;
  checked: number;
  broken_at_id: number | null;
  reason: string | null;
  checked_at: string;
}

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export interface UserProfile {
  id: number;
  nik: string;
  username: string;
  email: string;
  full_name: string;
  department: string;
  role: UserRole;
  roles?: UserRole[];
  clearance_level: number;
  active_key_fingerprint?: string | null;
  has_encrypted_private_key?: boolean;
}

export interface DocumentItem {
  id: number;
  doc_uid: string;
  original_filename: string;
  encrypted_filename: string;
  original_size_bytes: number;
  encrypted_size_bytes: number;
  classification: ClassificationLevel;
  sender_id: number;
  status: string;
  created_at: string;
}

export interface ApiErrorPayload {
  detail?: string | { error_code?: string; message?: string };
  message?: string;
}
