import os
import re
import time
import uuid
import json
import base64
import logging
import threading
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from cryptography.hazmat.primitives.kdf.argon2 import Argon2id
from cryptography.exceptions import InvalidKey
from Crypto.Hash import HMAC, SHA256
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes
from werkzeug.utils import secure_filename

from .config import Config

# Token blocklist in-memory (jti -> exp timestamp agar entri kedaluwarsa dapat dibersihkan)
_REVOKED_TOKENS: dict[str, int] = {}

# Sliding-window rate limiter per IP + endpoint
_RATE_BUCKETS: dict[str, list[float]] = defaultdict(list)
_SECURITY_LOCK = threading.Lock()


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def get_password_hash(password: str) -> str:
    """
    Hash password menggunakan Argon2id (RFC 9106) dengan parameter memori 64 MiB (65536 KiB),
    2 iterasi, 4 lanes paralel, salt CSPRNG 16-byte, dan panjang tag 32-byte.
    Format PHC: $argon2id$v=19$m=65536,t=2,p=4$<salt_b64>$<hash_b64>
    """
    salt = get_random_bytes(16)
    memory_cost = 65536
    iterations = 2
    lanes = 4
    kdf = Argon2id(
        salt=salt,
        length=32,
        iterations=iterations,
        lanes=lanes,
        memory_cost=memory_cost,
    )
    derived = kdf.derive(password.encode("utf-8"))
    salt_b64 = base64.b64encode(salt).rstrip(b"=").decode("ascii")
    hash_b64 = base64.b64encode(derived).rstrip(b"=").decode("ascii")
    return f"$argon2id$v=19$m={memory_cost},t={iterations},p={lanes}${salt_b64}${hash_b64}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """
    Memverifikasi password terhadap hash Argon2id (utama) atau PBKDF2-HMAC-SHA256 (kompatibilitas).
    """
    if not plain_password or not stored_hash:
        return False
    try:
        if stored_hash.startswith("$argon2id$"):
            parts = stored_hash.split("$")
            # ['', 'argon2id', 'v=19', 'm=65536,t=2,p=4', salt_b64, hash_b64]
            if len(parts) != 6:
                return False
            params_str = parts[3]
            params = dict(kv.split("=") for kv in params_str.split(","))
            memory_cost = int(params["m"])
            iterations = int(params["t"])
            lanes = int(params["p"])
            salt_b64 = parts[4] + "=" * ((4 - len(parts[4]) % 4) % 4)
            hash_b64 = parts[5] + "=" * ((4 - len(parts[5]) % 4) % 4)
            salt = base64.b64decode(salt_b64)
            expected = base64.b64decode(hash_b64)
            kdf = Argon2id(
                salt=salt,
                length=len(expected),
                iterations=iterations,
                lanes=lanes,
                memory_cost=memory_cost,
            )
            kdf.verify(plain_password.encode("utf-8"), expected)
            return True

        if stored_hash.startswith("pbkdf2_sha256$"):
            algo, iterations_str, salt_hex, hash_hex = stored_hash.split("$")
            salt = bytes.fromhex(salt_hex)
            expected = bytes.fromhex(hash_hex)
            dk = PBKDF2(
                plain_password.encode("utf-8"),
                salt,
                dkLen=len(expected),
                count=int(iterations_str),
                hmac_hash_module=SHA256,
            )
            if len(dk) != len(expected):
                return False
            diff = 0
            for x, y in zip(dk, expected):
                diff |= x ^ y
            return diff == 0
    except (InvalidKey, ValueError, KeyError, TypeError):
        return False
    return False


def create_access_token(payload_data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Membuat token JWT (HS256) dengan klaim standar jti, iat, exp."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = datetime.now(timezone.utc)
    exp = now + (expires_delta or timedelta(minutes=Config.JWT_ACCESS_TOKEN_EXPIRES_MINUTES))
    payload = payload_data.copy()
    payload.update({
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    })

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

    mac = HMAC.new(Config.JWT_SECRET_KEY.encode("utf-8"), signing_input, digestmod=SHA256)
    sig_b64 = _b64url_encode(mac.digest())
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> dict:
    """Memvalidasi tanda tangan HMAC-SHA256, masa berlaku JWT, dan daftar pencabutan (logout)."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Format token JWT tidak valid.")
    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    mac = HMAC.new(Config.JWT_SECRET_KEY.encode("utf-8"), signing_input, digestmod=SHA256)
    try:
        mac.verify(_b64url_decode(sig_b64))
    except ValueError as exc:
        raise ValueError("Tanda tangan JWT tidak sah.") from exc

    payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    if int(datetime.now(timezone.utc).timestamp()) > int(payload.get("exp", 0)):
        raise ValueError("Token JWT telah kedaluwarsa.")
    jti = payload.get("jti")
    if jti and _is_token_revoked(jti):
        raise ValueError("Sesi token JWT telah diakhiri (logged out).")
    return payload


def _is_token_revoked(jti: str) -> bool:
    """Cek cepat di memori, lalu di database (berlaku lintas proses & setelah restart)."""
    now_ts = int(datetime.now(timezone.utc).timestamp())
    with _SECURITY_LOCK:
        exp_ts = _REVOKED_TOKENS.get(jti)
        if exp_ts is not None:
            if exp_ts >= now_ts:
                return True
            _REVOKED_TOKENS.pop(jti, None)
    from ..database import get_db_session
    from ..models import RevokedToken

    db = get_db_session()
    try:
        row = db.query(RevokedToken.expires_at).filter(RevokedToken.jti == jti).first()
    finally:
        db.close()
    if row:
        row_exp_ts = int(row[0].replace(tzinfo=timezone.utc).timestamp())
        with _SECURITY_LOCK:
            _REVOKED_TOKENS[jti] = row_exp_ts
        return True
    return False


def revoke_token(jti: Optional[str], exp: Optional[int] = None) -> None:
    """Cabut token: simpan di memori dan di database sampai masa berlakunya habis."""
    if not jti:
        return
    now_dt = datetime.now(timezone.utc)
    now_ts = int(now_dt.timestamp())
    exp_ts = int(exp) if exp else now_ts + max(Config.JWT_ACCESS_TOKEN_EXPIRES_MINUTES, 1440) * 60
    with _SECURITY_LOCK:
        if len(_REVOKED_TOKENS) > 1000:
            expired_keys = [k for k, v in _REVOKED_TOKENS.items() if v < now_ts]
            for k in expired_keys:
                _REVOKED_TOKENS.pop(k, None)
        _REVOKED_TOKENS[jti] = exp_ts
    from ..database import get_db_session
    from ..models import RevokedToken

    now = now_dt.replace(tzinfo=None)
    expires_at = (
        datetime.fromtimestamp(int(exp), tz=timezone.utc).replace(tzinfo=None)
        if exp
        else now + timedelta(minutes=max(Config.JWT_ACCESS_TOKEN_EXPIRES_MINUTES, 1440))
    )
    db = get_db_session()
    try:
        if not db.query(RevokedToken.jti).filter(RevokedToken.jti == jti).first():
            db.add(RevokedToken(jti=jti, expires_at=expires_at))
        # Bersihkan catatan token yang memang sudah kedaluwarsa agar tabel tidak membengkak
        db.query(RevokedToken).filter(RevokedToken.expires_at < now).delete()
        db.commit()
    except Exception as exc:
        db.rollback()
        logging.getLogger(__name__).warning("Gagal menyimpan pencabutan token JWT ke database: %s", exc)
    finally:
        db.close()


def check_rate_limit(key: str, max_requests: int = 30, window_seconds: int = 60) -> bool:
    """Memeriksa batas laju request (sliding window). Mengembalikan True jika diizinkan."""
    now = time.time()
    with _SECURITY_LOCK:
        # Cegah pertumbuhan memori tak terbatas akibat key acak: bersihkan bucket kedaluwarsa secara berkala
        if len(_RATE_BUCKETS) > 5000:
            for stale in [k for k, v in _RATE_BUCKETS.items() if not v or now - v[-1] >= window_seconds]:
                _RATE_BUCKETS.pop(stale, None)
        bucket = _RATE_BUCKETS[key]
        _RATE_BUCKETS[key] = [ts for ts in bucket if now - ts < window_seconds]
        if len(_RATE_BUCKETS[key]) >= max_requests:
            return False
        _RATE_BUCKETS[key].append(now)
        return True


_DUMMY_PASSWORD_HASH: Optional[str] = None


def burn_password_check(plain_password: str) -> None:
    """
    Menjalankan verifikasi Argon2id palsu agar waktu respons login untuk username yang tidak ada
    sama dengan username yang ada (mencegah user enumeration lewat timing attack).
    """
    global _DUMMY_PASSWORD_HASH
    if _DUMMY_PASSWORD_HASH is None:
        _DUMMY_PASSWORD_HASH = get_password_hash(uuid.uuid4().hex)
    verify_password(plain_password or "x", _DUMMY_PASSWORD_HASH)


def sanitize_filename(filename: str) -> str:
    """Mencegah Path Traversal pada nama file yang diunggah atau diunduh."""
    if not filename:
        return "document.bin"
    # Tolak eksplisit pola path traversal
    cleaned = os.path.basename(filename.replace("\\", "/"))
    safe = secure_filename(cleaned)
    return safe or "document.bin"
