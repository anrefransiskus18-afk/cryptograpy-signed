import json
import os
import threading
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from Crypto.PublicKey import ECC
from Crypto.Hash import SHA256
from ..models import AuditLog, AuthenticationLog
from ..cryptography.hybrid_engine import HybridCryptoEngine

SERVER_KEY_PATH = Path(__file__).resolve().parent.parent.parent / "server_audit_key.pem"

FORBIDDEN_LOG_KEYS = {
    "password",
    "passphrase",
    "private_key",
    "private_key_pkcs8",
    "private_key_pkcs8_pem",
    "session_key",
    "wrapping_key",
    "kek",
    "plaintext",
}


def _load_or_create_server_signing_key() -> ECC.EccKey:
    if SERVER_KEY_PATH.exists():
        return ECC.import_key(SERVER_KEY_PATH.read_text(encoding="utf-8"))
    key = ECC.generate(curve="P-256")
    SERVER_KEY_PATH.write_text(key.export_key(format="PEM"), encoding="utf-8")
    return key


def _restrict_key_file_permissions() -> None:
    """Batasi akses berkas kunci penandatangan audit hanya untuk pemilik (chmod 600)."""
    try:
        os.chmod(SERVER_KEY_PATH, 0o600)
    except OSError:
        pass


SERVER_AUDIT_SIGNING_KEY = _load_or_create_server_signing_key()
_restrict_key_file_permissions()
SERVER_AUDIT_PUBLIC_KEY = SERVER_AUDIT_SIGNING_KEY.public_key()

# Kunci sinkronisasi in-process + file lock lintas-worker agar rantai hash tidak bercabang
_AUDIT_CHAIN_LOCK = threading.Lock()
_AUDIT_LOCK_FILE = Path(__file__).resolve().parent.parent.parent / "storage" / "audit_chain.lock"
_AUDIT_LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)


class _CrossProcessLock:
    """Menggabungkan threading.Lock dan fcntl.flock (POSIX) untuk serialisasi multi-worker."""
    def __enter__(self):
        _AUDIT_CHAIN_LOCK.acquire()
        self._fp = open(_AUDIT_LOCK_FILE, "a+")
        try:
            import fcntl
            fcntl.flock(self._fp.fileno(), fcntl.LOCK_EX)
        except ImportError:
            pass
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            try:
                import fcntl
                fcntl.flock(self._fp.fileno(), fcntl.LOCK_UN)
            except ImportError:
                pass
            self._fp.close()
        finally:
            _AUDIT_CHAIN_LOCK.release()


def _sanitize_metadata(metadata: dict | None) -> dict:
    """Memastikan tidak ada password, private key, session key, wrapping key, atau plaintext yang masuk ke log."""
    if not metadata:
        return {}
    return {
        k: v
        for k, v in metadata.items()
        if k.lower() not in FORBIDDEN_LOG_KEYS
    }


class AuditService:
    @staticmethod
    def build_canonical_payload(
        timestamp_iso: str,
        actor_identity: str,
        action_type: str,
        document_hash: str | None,
        ip_address: str,
        prev_log_hash: str,
        metadata: dict | None,
    ) -> str:
        return json.dumps({
            "timestamp": timestamp_iso,
            "actor_identity": actor_identity,
            "action_type": action_type,
            "document_hash": document_hash,
            "ip_address": ip_address,
            "prev_log_hash": prev_log_hash,
            "metadata": metadata or {},
        }, sort_keys=True, separators=(",", ":"))

    @classmethod
    def record_event(
        cls,
        db: Session,
        actor_identity: str,
        action_type: str,
        ip_address: str,
        user_id: int | None = None,
        document_id: int | None = None,
        document_name: str | None = None,
        status: str = "SUCCESS",
        metadata: dict | None = None,
    ) -> AuditLog:
        """
        Mencatat log aktivitas yang tidak dapat dimanipulasi (Tamper-Proof) dengan:
        1. SHA-256 Hash dari nama dokumen.
        2. Chaining Hash dari log sebelumnya (Hash Chain).
        3. Tanda tangan digital ECDSA P-256 milik Server.
        """
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)
        doc_hash = SHA256.new(document_name.encode("utf-8")).hexdigest() if document_name else None
        safe_metadata = _sanitize_metadata(metadata)
        if document_name and "document_name" not in safe_metadata:
            safe_metadata["document_name"] = document_name

        if status == "SUCCESS" and action_type in ("TAMPER_DETECTED", "DECRYPTION_FAILED", "UNAUTHORIZED_ACCESS"):
            status = "ALERT" if action_type == "TAMPER_DETECTED" else "FAILURE"

        # Seksi kritis: baca log terakhir -> tandatangani -> simpan harus atomik lintas thread & worker
        with _CrossProcessLock():
            last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
            if last_log:
                prev_payload = f"{last_log.id}|{last_log.timestamp.replace(microsecond=0).isoformat()}|{last_log.server_signature}"
                prev_log_hash = SHA256.new(prev_payload.encode("utf-8")).hexdigest()
            else:
                prev_log_hash = "0" * 64

            canonical_payload = cls.build_canonical_payload(
                timestamp_iso=now_utc.isoformat(),
                actor_identity=actor_identity,
                action_type=action_type,
                document_hash=doc_hash,
                ip_address=ip_address,
                prev_log_hash=prev_log_hash,
                metadata=safe_metadata,
            )

            signature_b64 = HybridCryptoEngine.sign_audit_record(SERVER_AUDIT_SIGNING_KEY, canonical_payload)

            audit_entry = AuditLog(
                timestamp=now_utc,
                user_id=user_id,
                actor_identity=actor_identity,
                action_type=action_type,
                status=status,
                document_id=document_id,
                document_hash=doc_hash,
                ip_address=ip_address,
                metadata_json=safe_metadata,
                prev_log_hash=prev_log_hash,
                server_signature=signature_b64,
            )
            db.add(audit_entry)
            db.commit()
            db.refresh(audit_entry)
        return audit_entry

    @classmethod
    def record_auth_event(
        cls,
        db: Session,
        username_attempted: str,
        event_type: str,
        status: str,
        ip_address: str,
        user_id: int | None = None,
        user_agent: str | None = None,
        failure_reason: str | None = None,
    ) -> AuthenticationLog:
        """Mencatat aktivitas autentikasi pada tabel `authentication_logs`."""
        entry = AuthenticationLog(
            timestamp=datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0),
            user_id=user_id,
            username_attempted=username_attempted or "UNKNOWN",
            event_type=event_type,
            status=status,
            ip_address=ip_address,
            user_agent=(user_agent or "")[:255],
            failure_reason=failure_reason,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
