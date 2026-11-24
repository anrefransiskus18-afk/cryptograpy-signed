/**
 * Audit Trail, Dashboard, Settings & Benchmark Request / Response DTO Structs
 */
import {
  asBoolean,
  asNullableNumber,
  asNullableString,
  asNumber,
  asRecord,
  asRecordArray,
  asString
} from "../utils/validators";

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
  metadata: Record<string, unknown>;
  prev_log_hash: string;
  server_signature: string;
  signature_verified: boolean;

  constructor(data: Record<string, unknown> = {}) {
    const meta = asRecord(data.metadata);
    this.id = asNumber(data.id, 0);
    this.timestamp = asString(data.timestamp);
    this.user_id = asNullableNumber(data.user_id);
    this.actor_identity = asString(data.actor_identity);
    this.action_type = asString(data.action_type);
    this.status = asString(data.status, "SUCCESS");
    this.document_id = asNullableNumber(data.document_id);
    this.document_name = asNullableString(data.document_name ?? meta.document_name);
    this.document_hash = asNullableString(data.document_hash);
    this.ip_address = asString(data.ip_address);
    this.metadata = meta;
    this.prev_log_hash = asString(data.prev_log_hash);
    this.server_signature = asString(data.server_signature);
    this.signature_verified = asBoolean(data.signature_verified, true);
  }
}

export class AuditLogListResponseDTO {
  static schema = {
    logs: [AuditLogItemDTO]
  };

  server_signing_public_key_pem: string;
  logs: AuditLogItemDTO[];
  total: number;

  constructor(data: Record<string, unknown> = {}) {
    this.server_signing_public_key_pem = asString(data.server_signing_public_key_pem);
    this.logs = Array.isArray(data.logs)
      ? data.logs.map((log) => (log instanceof AuditLogItemDTO ? log : new AuditLogItemDTO(asRecord(log))))
      : [];
    this.total = asNumber(data.total, this.logs.length);
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

  constructor(data: Record<string, unknown> = {}) {
    this.id = asNumber(data.id, 0);
    this.timestamp = asString(data.timestamp);
    this.user_id = asNullableNumber(data.user_id);
    this.username_attempted = asString(data.username_attempted);
    this.event_type = asString(data.event_type);
    this.status = asString(data.status);
    this.ip_address = asString(data.ip_address);
    this.user_agent = asString(data.user_agent);
    this.failure_reason = asNullableString(data.failure_reason);
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

  constructor(data: Record<string, unknown> = {}) {
    this.total_users = asNumber(data.total_users, 0);
    this.active_keys = asNumber(data.active_keys, 0);
    this.total_documents = asNumber(data.total_documents, 0);
    this.encrypted_documents = asNumber(data.encrypted_documents ?? data.total_encryptions, 0);
    this.total_encryptions = asNumber(data.total_encryptions, 0);
    this.total_decryptions = asNumber(data.total_decryptions, 0);
    this.tamper_alerts = asNumber(data.tamper_alerts, 0);
    this.failed_logins = asNumber(data.failed_logins, 0);
    this.total_storage_bytes = asNumber(data.total_storage_bytes, 0);
  }
}

export class DashboardMyKeyDTO {
  has_active_key: boolean;
  fingerprint: string | null;
  curve: string;
  created_at: string | null;
  public_key_pem: string | null;
  has_backup_private_key: boolean;

  constructor(data: Record<string, unknown> = {}) {
    this.has_active_key = asBoolean(data.has_active_key);
    this.fingerprint = asNullableString(data.fingerprint);
    this.curve = asString(data.curve, "NIST P-256");
    this.created_at = asNullableString(data.created_at);
    this.public_key_pem = asNullableString(data.public_key_pem);
    this.has_backup_private_key = asBoolean(data.has_backup_private_key);
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

  constructor(data: Record<string, unknown> = {}) {
    this.metrics =
      data.metrics instanceof DashboardMetricsDTO
        ? data.metrics
        : new DashboardMetricsDTO(asRecord(data.metrics));
    const rawUsage = asRecord(data.usage_statistics);
    const rawBreakdown = asRecord(rawUsage.classification_breakdown);
    const breakdown: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawBreakdown)) {
      breakdown[k] = asNumber(v, 0);
    }
    this.usage_statistics = { classification_breakdown: breakdown };
    this.my_key =
      data.my_key instanceof DashboardMyKeyDTO
        ? data.my_key
        : new DashboardMyKeyDTO(asRecord(data.my_key));
    this.recent_logs = Array.isArray(data.recent_logs)
      ? data.recent_logs.map((log) => (log instanceof AuditLogItemDTO ? log : new AuditLogItemDTO(asRecord(log))))
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

  constructor(data: Record<string, unknown> = {}) {
    const src = data.settings ? asRecord(data.settings) : data;
    this.organization_name = asString(src.organization_name, "PT XYZ — Divisi Keamanan Informasi Internal");
    this.symmetric_algorithm = asString(src.symmetric_algorithm, "AES-256-GCM");
    this.asymmetric_curve = asString(src.asymmetric_curve, "ECC NIST P-256");
    this.key_agreement = asString(src.key_agreement, "Ephemeral-Static ECDH");
    this.kdf_algorithm = asString(src.kdf_algorithm, "HKDF-SHA256");
    this.password_hashing = asString(src.password_hashing, "Argon2id");
    this.private_key_format = asString(src.private_key_format, "PKCS#8 PEM");
    this.container_format_version = asString(src.container_format_version, "HC01");
    this.default_key_wrap_mode = asString(src.default_key_wrap_mode, "XOR_AAD");
    this.jwt_expiration_minutes = asNumber(src.jwt_expiration_minutes, 120);
    this.max_upload_size_mb = asNumber(src.max_upload_size_mb, 125);
  }
}

export interface BenchmarkPerformanceRow {
  code: string;
  label: string;
  avg_encrypt_ms: number;
  avg_decrypt_ms: number;
  throughput_encrypt_mibs: number;
  throughput_decrypt_mibs: number;
  overhead_bytes: number;
  ciphertext_entropy: number;
  avalanche_effect_percent: number;
}

export class BenchmarkResponseDTO {
  performance_results: BenchmarkPerformanceRow[];
  tamper_detection: {
    total_scenarios: number;
    detected_scenarios: number;
    detection_rate_percent: number;
    scenarios: Array<Record<string, unknown>>;
  };

  constructor(data: Record<string, unknown> = {}) {
    this.performance_results = asRecordArray(data.performance_results).map((row) => ({
      code: asString(row.code),
      label: asString(row.label),
      avg_encrypt_ms: asNumber(row.avg_encrypt_ms, 0),
      avg_decrypt_ms: asNumber(row.avg_decrypt_ms, 0),
      throughput_encrypt_mibs: asNumber(row.throughput_encrypt_mibs, 0),
      throughput_decrypt_mibs: asNumber(row.throughput_decrypt_mibs, 0),
      overhead_bytes: asNumber(row.overhead_bytes, 0),
      ciphertext_entropy: asNumber(row.ciphertext_entropy, 0),
      avalanche_effect_percent: asNumber(row.avalanche_effect_percent, 0)
    }));
    const td = asRecord(data.tamper_detection);
    this.tamper_detection = {
      total_scenarios: asNumber(td.total_scenarios, 12),
      detected_scenarios: asNumber(td.detected_scenarios, 12),
      detection_rate_percent: asNumber(td.detection_rate_percent, 100.0),
      scenarios: asRecordArray(td.scenarios)
    };
  }
}
