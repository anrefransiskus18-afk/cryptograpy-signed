"""
Key Management Request / Response DTO Structs (Backend)
"""


class KeyPassphraseRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.passphrase = str(data.get("passphrase") or "")


class VerifyKeyRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.private_key_pkcs8_pem = str(
            data.get("private_key_pkcs8_pem") or data.get("private_key_pkcs8") or ""
        ).strip()
        self.passphrase = str(data.get("passphrase") or "")


class PublicKeyDirectoryItemDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.key_id = int(data.get("key_id") or 0)
        self.user_id = int(data.get("user_id") or 0)
        self.full_name = str(data.get("full_name") or "")
        self.username = str(data.get("username") or "")
        self.email = str(data.get("email") or "")
        self.department = str(data.get("department") or "")
        self.role = str(data.get("role") or "STAFF")
        self.clearance_level = int(data.get("clearance_level") or 1)
        self.fingerprint = str(data.get("fingerprint") or "")
        self.curve = str(data.get("curve") or "NIST P-256")
        self.public_key_pem = str(data.get("public_key_pem") or "")
        self.created_at = data.get("created_at")


class KeyHistoryItemDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.id = int(data.get("id") or 0)
        self.fingerprint = str(data.get("fingerprint") or "")
        self.curve = str(data.get("curve") or "NIST P-256")
        self.status = str(data.get("status") or "ACTIVE")
        self.is_revoked = bool(data.get("is_revoked", False))
        self.created_at = data.get("created_at")
        self.rotated_at = data.get("rotated_at")


class MyKeyStatusResponseDTO:
    schema = {
        "key_history": [KeyHistoryItemDTO],
    }

    def __init__(self, data: dict = None):
        data = data or {}
        self.has_active_key = bool(data.get("has_active_key", False))
        self.key_id = data.get("key_id")
        self.user_id = data.get("user_id")
        self.username = data.get("username")
        self.fingerprint = data.get("fingerprint")
        self.curve = str(data.get("curve") or "NIST P-256")
        self.kdf_protection = str(data.get("kdf_protection") or "PBKDF2WithHMAC-SHA256AndAES256-CBC")
        self.public_key_pem = data.get("public_key_pem")
        self.encrypted_private_key_pem = data.get("encrypted_private_key_pem")
        self.created_at = data.get("created_at")
        self.key_history = data.get("key_history") or []


class KeyPairGeneratedResponseDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.message = str(data.get("message") or "")
        self.key_id = data.get("key_id")
        self.fingerprint = str(data.get("fingerprint") or "")
        self.curve = str(data.get("curve") or "NIST P-256")
        self.public_key_pem = str(data.get("public_key_pem") or "")
        self.private_key_pkcs8_pem = str(data.get("private_key_pkcs8_pem") or "")
