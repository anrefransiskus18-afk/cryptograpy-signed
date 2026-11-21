"""
Authentication & Profile Request / Response DTO Structs (Backend)
"""


class LoginRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.username = str(data.get("username") or "").strip()
        self.password = str(data.get("password") or "")


class ChangePasswordRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.current_password = str(data.get("current_password") or "")
        self.new_password = str(data.get("new_password") or "")


class UpdateProfileRequestDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.full_name = str(data["full_name"]).strip() if "full_name" in data and data["full_name"] else None
        self.email = str(data["email"]).strip() if "email" in data and data["email"] else None
        self.department = str(data["department"]).strip() if "department" in data and data["department"] else None


class UserProfileDTO:
    def __init__(self, data: dict = None):
        data = data or {}
        self.id = int(data.get("id") or 0)
        self.nik = str(data.get("nik") or f"XYZ-{self.id:04d}")
        self.username = str(data.get("username") or "")
        self.email = str(data.get("email") or "")
        self.full_name = str(data.get("full_name") or "")
        self.department = str(data.get("department") or "")
        self.role = str(data.get("role") or "STAFF")
        self.clearance_level = int(data.get("clearance_level") or 1)
        self.active_key_fingerprint = data.get("active_key_fingerprint")
        self.active_public_key_pem = data.get("active_public_key_pem")
        self.encrypted_private_key_pem = data.get("encrypted_private_key_pem")
        self.has_encrypted_private_key = bool(
            data.get("has_encrypted_private_key") or self.encrypted_private_key_pem
        )


class LoginResponseDTO:
    schema = {
        "user": UserProfileDTO,
    }

    def __init__(self, data: dict = None):
        data = data or {}
        self.access_token = str(data.get("access_token") or "")
        self.token_type = str(data.get("token_type") or "bearer")
        self.user = data.get("user") or {}
