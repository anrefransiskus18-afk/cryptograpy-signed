"""
Audit, Dashboard & Settings Request / Response DTO Structs (Backend)
"""


class AuditFilterRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.action_type = str(data.get("action_type") or "").strip().upper()
        self.status = str(data.get("status") or "").strip().upper()
        self.search = str(data.get("search") or "").strip().lower()
        try:
            self.limit = min(250, max(1, int(data.get("limit") or 100)))
        except (ValueError, TypeError):
            self.limit = 100


class AuditLogItemDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.id = int(data.get("id") or 0)
        self.timestamp = data.get("timestamp")
        self.user_id = data.get("user_id")
        self.actor_identity = str(data.get("actor_identity") or "")
        self.action_type = str(data.get("action_type") or "")
        self.status = str(data.get("status") or "SUCCESS")
        self.document_id = data.get("document_id")
        self.document_name = data.get("document_name")
        self.document_hash = data.get("document_hash")
        self.ip_address = str(data.get("ip_address") or "")
        self.metadata = data.get("metadata") or {}
        self.prev_log_hash = data.get("prev_log_hash")
        self.server_signature = data.get("server_signature")
        self.signature_verified = bool(data.get("signature_verified", True))


class AuditLogListResponseDTO:
    schema = {
        "logs": [AuditLogItemDTO],
    }

    def __init__(self, data: dict = None):
        data = data or {}
        self.server_signing_public_key_pem = str(data.get("server_signing_public_key_pem") or "")
        self.total = int(data.get("total") or 0)
        self.logs = data.get("logs") or []


class AuthLogItemDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.id = int(data.get("id") or 0)
        self.timestamp = data.get("timestamp")
        self.user_id = data.get("user_id")
        self.username_attempted = str(data.get("username_attempted") or "")
        self.event_type = str(data.get("event_type") or "")
        self.status = str(data.get("status") or "")
        self.ip_address = str(data.get("ip_address") or "")
        self.user_agent = data.get("user_agent") or ""
        self.failure_reason = data.get("failure_reason")


class DashboardMetricsDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.total_users = int(data.get("total_users") or 0)
        self.active_keys = int(data.get("active_keys") or 0)
        self.total_documents = int(data.get("total_documents") or 0)
        self.encrypted_documents = int(data.get("encrypted_documents") or 0)
        self.total_encryptions = int(data.get("total_encryptions") or 0)
        self.total_decryptions = int(data.get("total_decryptions") or 0)
        self.tamper_alerts = int(data.get("tamper_alerts") or 0)
        self.failed_logins = int(data.get("failed_logins") or 0)
        self.total_storage_bytes = int(data.get("total_storage_bytes") or 0)


class DashboardResponseDTO:
    schema = {
        "metrics": DashboardMetricsDTO,
        "recent_logs": [AuditLogItemDTO],
    }

    def __init__(self, data: dict = None):
        data = data or {}
        self.metrics = data.get("metrics") or {}
        self.usage_statistics = data.get("usage_statistics") or {}
        self.my_key = data.get("my_key") or {}
        self.recent_logs = data.get("recent_logs") or []


class UpdateSettingsRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.organization_name = str(data["organization_name"]).strip() if "organization_name" in data and data["organization_name"] is not None else None
        self.raw_key_wrap_mode = data.get("default_key_wrap_mode")
        self.default_key_wrap_mode = (
            self.raw_key_wrap_mode
            if self.raw_key_wrap_mode in ("XOR_AAD", "AES_GCM_KW")
            else None
        )
        raw_exp = data.get("jwt_expiration_minutes")
        if "jwt_expiration_minutes" in data and raw_exp is not None:
            try:
                self.jwt_expiration_minutes = max(15, min(1440, int(raw_exp)))
                self.invalid_jwt_expiration = False
            except (ValueError, TypeError):
                self.jwt_expiration_minutes = None
                self.invalid_jwt_expiration = True
        else:
            self.jwt_expiration_minutes = None
            self.invalid_jwt_expiration = False
