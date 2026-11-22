/**
 * Audit Trail, Dashboard, Settings & Benchmark Request / Response DTO Structs
 */

export class AuditFilterRequestDTO {
  search: string;
  action_type: string;
  status: string;
  limit: number;

  constructor({
    search = "",
    action_type = "",
    status = "",
    limit = 150
  }: { search?: string; action_type?: string; status?: string; limit?: number } = {}) {
    this.search = String(search || "").trim();
    this.action_type = String(action_type || "").trim();
    this.status = String(status || "").trim();
    this.limit = Number(limit || 150);
  }
}

export class UpdateSettingsRequestDTO {
  default_key_wrap_mode: string;
  organization_name?: string;
  jwt_expiration_minutes?: number;

  constructor({
    default_key_wrap_mode = "XOR_AAD",
    organization_name,
    jwt_expiration_minutes
  }: {
    default_key_wrap_mode?: string;
    organization_name?: string;
    jwt_expiration_minutes?: number;
  } = {}) {
    this.default_key_wrap_mode = default_key_wrap_mode;
    this.organization_name = organization_name;
    this.jwt_expiration_minutes = jwt_expiration_minutes;
  }
}

export class AuditLogItemDTO {
  id: number;
  timestamp: string;
  user_id: number | null;
  actor_identity: string;
  action_type: string;
  status: string;
  document_id: number | null;
  document_name: string | null;
  document_hash: string | null;
  ip_address: string;
  metadata: Record<string, any>;
  prev_log_hash: string;
  server_signature: string;
  signature_verified: boolean;

  constructor(data: Record<string, any> = {}) {
    this.id = Number(data.id || 0);
    this.timestamp = data.timestamp || "";
    this.user_id = data.user_id ?? null;
    this.actor_identity = data.actor_identity || "";
    this.action_type = data.action_type || "";
    this.status = data.status || "SUCCESS";
    this.document_id = data.document_id ?? null;
    this.document_name = data.document_name || data.metadata?.document_name || null;
    this.document_hash = data.document_hash || null;
    this.ip_address = data.ip_address || "";
    this.metadata = data.metadata || {};
    this.prev_log_hash = data.prev_log_hash || "";
    this.server_signature = data.server_signature || "";
    this.signature_verified = Boolean(data.signature_verified ?? true);
  }
}

export class AuditLogListResponseDTO {
  static schema = {
    logs: [AuditLogItemDTO]
  };

  server_signing_public_key_pem: string;
  logs: AuditLogItemDTO[];
  total: number;

  constructor(data: Record<string, any> = {}) {
    this.server_signing_public_key_pem = data.server_signing_public_key_pem || "";
    this.logs = Array.isArray(data.logs) ? data.logs : [];
    this.total = Number(data.total ?? this.logs.length);
  }
}

export class AuthLogItemDTO {
  id: number;
  timestamp: string;
  user_id: number | null;
  username_attempted: string;
  event_type: string;
  status: string;
  ip_address: string;
  user_agent: string;
  failure_reason: string | null;

  constructor(data: Record<string, any> = {}) {
    this.id = Number(data.id || 0);
    this.timestamp = data.timestamp || "";
    this.user_id = data.user_id ?? null;
    this.username_attempted = data.username_attempted || "";
    this.event_type = data.event_type || "";
    this.status = data.status || "";
    this.ip_address = data.ip_address || "";
    this.user_agent = data.user_agent || "";
    this.failure_reason = data.failure_reason || null;
  }
}

export class DashboardMetricsDTO {
  total_users: number;
  active_keys: number;
  total_documents: number;
  encrypted_documents: number;
  total_encryptions: number;
  total_decryptions: number;
  tamper_alerts: number;
  failed_logins: number;
  total_storage_bytes: number;

  constructor(data: Record<string, any> = {}) {
    this.total_users = Number(data.total_users || 0);
    this.active_keys = Number(data.active_keys || 0);
    this.total_documents = Number(data.total_documents || 0);
    this.encrypted_documents = Number(data.encrypted_documents ?? data.total_encryptions ?? 0);
    this.total_encryptions = Number(data.total_encryptions || 0);
    this.total_decryptions = Number(data.total_decryptions || 0);
    this.tamper_alerts = Number(data.tamper_alerts || 0);
    this.failed_logins = Number(data.failed_logins || 0);
    this.total_storage_bytes = Number(data.total_storage_bytes || 0);
  }
}

export class DashboardMyKeyDTO {
  has_active_key: boolean;
  fingerprint: string | null;
  curve: string;
  created_at: string | null;
  public_key_pem: string | null;
  has_backup_private_key: boolean;

  constructor(data: Record<string, any> = {}) {
    this.has_active_key = Boolean(data.has_active_key);
    this.fingerprint = data.fingerprint || null;
    this.curve = data.curve || "NIST P-256";
    this.created_at = data.created_at || null;
    this.public_key_pem = data.public_key_pem || null;
    this.has_backup_private_key = Boolean(data.has_backup_private_key);
  }
}

export class DashboardResponseDTO {
  static schema = {
    metrics: DashboardMetricsDTO,
    my_key: DashboardMyKeyDTO,
    recent_logs: [AuditLogItemDTO]
  };

  metrics: DashboardMetricsDTO;
  usage_statistics: { classification_breakdown: Record<string, number> };
  my_key: DashboardMyKeyDTO;
  recent_logs: AuditLogItemDTO[];

  constructor(data: Record<string, any> = {}) {
    this.metrics =
      data.metrics instanceof DashboardMetricsDTO
        ? data.metrics
        : new DashboardMetricsDTO(data.metrics || {});
    this.usage_statistics = data.usage_statistics || { classification_breakdown: {} };
    this.my_key =
      data.my_key instanceof DashboardMyKeyDTO
        ? data.my_key
        : new DashboardMyKeyDTO(data.my_key || {});
    this.recent_logs = Array.isArray(data.recent_logs)
      ? data.recent_logs.map((log) => (log instanceof AuditLogItemDTO ? log : new AuditLogItemDTO(log)))
      : [];
  }
}

export class SystemSettingsDTO {
  organization_name: string;
  symmetric_algorithm: string;
  asymmetric_curve: string;
  key_agreement: string;
  kdf_algorithm: string;
  password_hashing: string;
  private_key_format: string;
  container_format_version: string;
  default_key_wrap_mode: string;
  jwt_expiration_minutes: number;
  max_upload_size_mb: number;

  constructor(data: Record<string, any> = {}) {
    const src = data.settings || data;
    this.organization_name = src.organization_name || "PT XYZ — Divisi Keamanan Informasi Internal";
    this.symmetric_algorithm = src.symmetric_algorithm || "AES-256-GCM";
    this.asymmetric_curve = src.asymmetric_curve || "ECC NIST P-256";
    this.key_agreement = src.key_agreement || "Ephemeral-Static ECDH";
    this.kdf_algorithm = src.kdf_algorithm || "HKDF-SHA256";
    this.password_hashing = src.password_hashing || "Argon2id";
    this.private_key_format = src.private_key_format || "PKCS#8 PEM";
    this.container_format_version = src.container_format_version || "HC01";
    this.default_key_wrap_mode = src.default_key_wrap_mode || "XOR_AAD";
    this.jwt_expiration_minutes = Number(src.jwt_expiration_minutes || 120);
    this.max_upload_size_mb = Number(src.max_upload_size_mb || 125);
  }
}

export class BenchmarkResponseDTO {
  performance_results: Array<Record<string, any>>;
  tamper_detection: {
    total_scenarios: number;
    detected_scenarios: number;
    detection_rate_percent: number;
    scenarios: Array<Record<string, any>>;
  };

  constructor(data: Record<string, any> = {}) {
    this.performance_results = Array.isArray(data.performance_results)
      ? data.performance_results
      : [];
    this.tamper_detection = {
      total_scenarios: Number(data.tamper_detection?.total_scenarios || 12),
      detected_scenarios: Number(data.tamper_detection?.detected_scenarios || 12),
      detection_rate_percent: Number(data.tamper_detection?.detection_rate_percent || 100.0),
      scenarios: Array.isArray(data.tamper_detection?.scenarios)
        ? data.tamper_detection.scenarios
        : []
    };
  }
}
