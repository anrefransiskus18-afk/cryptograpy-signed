"""
User Management Request / Response DTO Structs (Backend)
"""
from ..core.config import Config


class UserFilterRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.search = str(data.get("search") or "").strip().lower()
        self.role = str(data.get("role") or "").strip().upper()
        self.include_deleted = str(data.get("include_deleted") or "false").lower() == "true"


class CreateUserRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.username = str(data.get("username") or "").strip()
        self.email = str(data.get("email") or "").strip()
        self.full_name = str(data.get("full_name") or "").strip()
        self.department = str(data.get("department") or "").strip()
        self.role = str(data.get("role") or "STAFF").strip().upper()
        self.password = str(data.get("password") or "")
        self.nik = str(data.get("nik") or "").strip() or None
        self.auto_generate_key = bool(data.get("auto_generate_key", True))
        self.key_passphrase = str(data.get("key_passphrase") or Config.FALLBACK_KEY_PASSPHRASE)


class UpdateUserRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.full_name = str(data["full_name"]).strip() if "full_name" in data and data["full_name"] else None
        self.email = str(data["email"]).strip() if "email" in data and data["email"] else None
        self.department = str(data["department"]).strip() if "department" in data and data["department"] else None
        self.nik = str(data["nik"]).strip() if "nik" in data and data["nik"] else None
        self.role = str(data["role"]).strip().upper() if "role" in data and data["role"] else None
        self.is_active = bool(data["is_active"]) if "is_active" in data and data["is_active"] is not None else None
        self.password = str(data["password"]) if "password" in data and data["password"] else None
        self.reset_ecc_key = bool(data.get("reset_ecc_key", False))
        self.key_passphrase = str(data.get("key_passphrase") or Config.FALLBACK_KEY_PASSPHRASE)


class UserResponseDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.id = int(data.get("id") or 0)
        self.nik = str(data.get("nik") or f"XYZ-{self.id:04d}")
        self.username = str(data.get("username") or "")
        self.email = str(data.get("email") or "")
        self.full_name = str(data.get("full_name") or "")
        self.department = str(data.get("department") or "")
        self.role = str(data.get("role") or "STAFF")
        self.roles = list(data.get("roles") or [self.role])
        self.clearance_level = int(data.get("clearance_level") or 1)
        self.is_active = bool(data.get("is_active", True))
        self.deleted_at = data.get("deleted_at")
        self.created_at = data.get("created_at")
        self.key_fingerprint = data.get("key_fingerprint")
        self.public_key_pem = data.get("public_key_pem")


class UserMutationResponseDTO:
    schema = {
        "user": UserResponseDTO,
    }

    def __init__(self, data: dict = None):
        data = data or {}
        self.message = str(data.get("message") or "")
        self.id = data.get("id")
        self.user = data.get("user") or {}
