import re
from typing import Dict, Any, Tuple

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RequestValidator:
    """Validator request schema setara Marshmallow untuk validasi input REST API."""

    @staticmethod
    def validate_login(data: Dict[str, Any]) -> Tuple[bool, str]:
        username = str(data.get("username", "")).strip()
        password = str(data.get("password", ""))
        if not username or not password:
            return False, "Username/Email dan password wajib diisi."
        if len(username) > 150 or len(password) > 256:
            return False, "Panjang kredensial melebihi batas maksimum."
        return True, ""

    @staticmethod
    def validate_user_create(data: Dict[str, Any]) -> Tuple[bool, str]:
        username = str(data.get("username", "")).strip()
        email = str(data.get("email", "")).strip()
        full_name = str(data.get("full_name", "")).strip()
        department = str(data.get("department", "")).strip()
        password = str(data.get("password", ""))

        if not all([username, email, full_name, department, password]):
            return False, "Seluruh kolom pengguna baru (username, email, full_name, department, password) wajib diisi."
        if not EMAIL_REGEX.match(email):
            return False, "Format alamat email korporat tidak valid."
        if len(password) < 8:
            return False, "Password pengguna minimal harus 8 karakter."
        return True, ""

    @staticmethod
    def validate_key_passphrase(passphrase: str) -> Tuple[bool, str]:
        if not passphrase or len(passphrase) < 8:
            return False, "Passphrase kunci privat PKCS#8 minimal harus 8 karakter."
        return True, ""
