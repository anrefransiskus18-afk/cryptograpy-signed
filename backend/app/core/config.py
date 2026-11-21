import os
from pathlib import Path

try:  # Muat berkas .env (jika ada) sebelum membaca environment variable
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
except ImportError:  # python-dotenv bersifat opsional
    pass

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
ENCRYPTED_STORAGE_DIR = STORAGE_DIR / "encrypted"
TEMP_STORAGE_DIR = STORAGE_DIR / "temp"

for _d in (STORAGE_DIR, ENCRYPTED_STORAGE_DIR, TEMP_STORAGE_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# Nilai bawaan untuk lingkungan pengembangan / demo. DILARANG dipakai saat APP_ENV=production.
DEFAULT_JWT_SECRET = "87685dbd96a5f0063232cc24aadb46bc04029b8de44f29c7ce619640a53eae4f"
DEFAULT_SEED_PASSWORD = "Admin@2026!"
DEFAULT_SEED_KEY_PASSPHRASE = "KeyPass@2026!"

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV == "production"


class Config:
    """Konfigurasi utama aplikasi PT XYZ Hybrid Cryptography Framework."""
    APP_NAME: str = "PT XYZ Internal Information Security Framework (AES-256-GCM & ECC P-256)"
    VERSION: str = "2.0.0"
    APP_ENV: str = APP_ENV
    IS_PRODUCTION: bool = IS_PRODUCTION
    SECRET_KEY: str = os.getenv("SECRET_KEY") or DEFAULT_JWT_SECRET
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY") or DEFAULT_JWT_SECRET
    JWT_ACCESS_TOKEN_EXPIRES_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "120"))
    MAX_CONTENT_LENGTH: int = int(os.getenv("MAX_CONTENT_LENGTH", str(125 * 1024 * 1024)))  # 125 MiB (mendukung uji 100 MiB)
    # Daftar origin yang diizinkan (pisahkan koma). Gunakan "*" hanya untuk pengembangan.
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS") or "http://localhost:5173,http://127.0.0.1:5173"
    ENCRYPTED_STORAGE_DIR: Path = ENCRYPTED_STORAGE_DIR
    TEMP_STORAGE_DIR: Path = TEMP_STORAGE_DIR
    ALLOWED_EXTENSIONS: set[str] = {
        ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt",
        ".txt", ".csv", ".json", ".xml", ".zip", ".png", ".jpg", ".jpeg",
        ".md", ".bin", ".enc",
    }
    DEFAULT_KEY_WRAP_MODE: str = os.getenv("DEFAULT_KEY_WRAP_MODE") or "XOR_AAD"  # XOR_AAD (Tesis Bab III Eq. 2.15) atau AES_GCM_KW
    RATE_LIMIT_LOGIN_MAX: int = int(os.getenv("RATE_LIMIT_LOGIN_MAX", "20"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    # Data awal (seed) & passphrase kunci bawaan; di produksi wajib diisi lewat environment variable
    SEED_DEFAULT_PASSWORD: str = os.getenv("SEED_DEFAULT_PASSWORD") or DEFAULT_SEED_PASSWORD
    SEED_KEY_PASSPHRASE: str = os.getenv("SEED_KEY_PASSPHRASE") or DEFAULT_SEED_KEY_PASSPHRASE
    # Passphrase kunci cadangan bila admin tidak mengisinya. Di produksi dikosongkan -> input wajib eksplisit.
    FALLBACK_KEY_PASSPHRASE: str = "" if IS_PRODUCTION else os.getenv("FALLBACK_KEY_PASSPHRASE", DEFAULT_SEED_KEY_PASSPHRASE)
    # Masa berlaku catatan pencabutan token & jendela penguncian login
    LOGIN_MAX_FAILED_ATTEMPTS: int = int(os.getenv("LOGIN_MAX_FAILED_ATTEMPTS", "5"))
    LOGIN_LOCKOUT_SECONDS: int = int(os.getenv("LOGIN_LOCKOUT_SECONDS", str(15 * 60)))

    @classmethod
    def validate_for_production(cls) -> None:
        """Gagalkan startup bila mode produksi masih memakai rahasia bawaan."""
        if not cls.IS_PRODUCTION:
            return
        problems = []
        if cls.JWT_SECRET_KEY == DEFAULT_JWT_SECRET or len(cls.JWT_SECRET_KEY) < 32:
            problems.append("JWT_SECRET_KEY wajib diisi dengan nilai acak minimal 32 karakter")
        if not os.getenv("DATABASE_URL"):
            problems.append("DATABASE_URL wajib diisi")
        if cls.SEED_DEFAULT_PASSWORD == DEFAULT_SEED_PASSWORD:
            problems.append("SEED_DEFAULT_PASSWORD wajib diganti dari nilai bawaan")
        if cls.SEED_KEY_PASSPHRASE == DEFAULT_SEED_KEY_PASSPHRASE:
            problems.append("SEED_KEY_PASSPHRASE wajib diganti dari nilai bawaan")
        if "*" in [o.strip() for o in cls.CORS_ORIGINS.split(",")]:
            problems.append("CORS_ORIGINS tidak boleh memakai '*' di produksi")
        if problems:
            raise RuntimeError("Konfigurasi produksi tidak aman: " + "; ".join(problems) + ".")
