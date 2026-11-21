from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    Float,
    String,
    Boolean,
    Text,
    ForeignKey,
    DateTime,
    JSON,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from .database import Base


def _utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    clearance_level = Column(Integer, nullable=False, default=1)
    description = Column(String(255))
    created_at = Column(DateTime, default=_utc_now)

    users = relationship("User", back_populates="role")
    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    nik = Column(String(30), unique=True, nullable=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    department = Column(String(100), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    # Token JWT yang diterbitkan sebelum waktu ini dianggap tidak berlaku (mis. setelah ganti/reset sandi)
    password_changed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utc_now)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now)

    role = relationship("Role", back_populates="users")
    user_roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    public_keys = relationship("PublicKey", back_populates="owner", cascade="all, delete-orphan")
    user_keys = relationship("UserKey", back_populates="owner", cascade="all, delete-orphan")
    sent_documents = relationship("Document", back_populates="sender", foreign_keys="Document.sender_id")
    received_documents = relationship("DocumentRecipient", back_populates="recipient")


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (
        UniqueConstraint("user_id", "role_id", name="uq_user_role_mapping"),
    )
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    assigned_by = Column(String(100), default="SYSTEM")
    assigned_at = Column(DateTime, default=_utc_now)

    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")


class PublicKey(Base):
    """Tabel direktori kunci publik ECC NIST P-256 (Kompatibilitas Tabel 3.4 Tesis)."""
    __tablename__ = "public_keys"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    key_fingerprint = Column(String(64), unique=True, nullable=False, index=True)
    public_key_pem = Column(Text, nullable=False)
    curve_name = Column(String(30), default="NIST P-256")
    is_revoked = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=_utc_now)

    owner = relationship("User", back_populates="public_keys")


class UserKey(Base):
    """
    Tabel manajemen kunci asimetris pengguna (Public Key + Encrypted PKCS#8 Private Key).
    Kunci privat TIDAK PERNAH disimpan dalam bentuk plaintext; hanya PKCS#8 terenkripsi passphrase.
    """
    __tablename__ = "user_keys"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    key_fingerprint = Column(String(64), unique=True, nullable=False, index=True)
    public_key_pem = Column(Text, nullable=False)
    encrypted_private_key_pem = Column(Text, nullable=True)  # PKCS#8 Encrypted PEM (PBKDF2-SHA256-AES256-CBC)
    kdf_protection = Column(String(80), default="PBKDF2WithHMAC-SHA256AndAES256-CBC")
    curve_name = Column(String(30), default="NIST P-256")
    status = Column(String(20), default="ACTIVE", index=True)  # ACTIVE, ROTATED, REVOKED
    is_revoked = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=_utc_now)
    rotated_at = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="user_keys")


class Document(Base):
    """Tabel repositori dokumen terenkripsi (.enc)."""
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    doc_uid = Column(String(64), unique=True, nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    encrypted_filename = Column(String(255), nullable=False)
    file_extension = Column(String(30), nullable=True)
    mime_type = Column(String(100), default="application/octet-stream")
    original_size_bytes = Column(BigInteger, nullable=False)
    encrypted_size_bytes = Column(BigInteger, nullable=False)
    overhead_bytes = Column(Integer, nullable=False, default=129)
    sha256_plaintext_hash = Column(String(64), nullable=False, index=True)
    sha256_ciphertext_hash = Column(String(64), nullable=False, index=True)
    storage_path = Column(String(500), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    classification = Column(String(40), default="CONFIDENTIAL", index=True)
    status = Column(String(30), default="ENCRYPTED", index=True)  # ENCRYPTED, DECRYPTED, DELETED
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=_utc_now, index=True)

    sender = relationship("User", back_populates="sent_documents", foreign_keys=[sender_id])
    recipients = relationship("DocumentRecipient", back_populates="document", cascade="all, delete-orphan")
    encryption_meta = relationship("EncryptionMetadata", back_populates="document", uselist=False, cascade="all, delete-orphan")


class DocumentRecipient(Base):
    """Tabel relasi otorisasi penerima dokumen terenkripsi dan wrapped session key."""
    __tablename__ = "document_recipients"
    __table_args__ = (
        Index("ix_doc_recipient_lookup", "document_id", "recipient_user_id"),
    )
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    recipient_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipient_key_id = Column(Integer, ForeignKey("public_keys.id"), nullable=True)
    recipient_key_fingerprint = Column(String(64), nullable=False, index=True)
    wrapped_session_key_hex = Column(String(128), nullable=False)
    ephemeral_public_key_hex = Column(String(140), nullable=False)
    access_status = Column(String(30), default="AUTHORIZED")  # AUTHORIZED, DECRYPTED, REVOKED
    decrypted_count = Column(Integer, default=0)
    last_decrypted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utc_now)

    document = relationship("Document", back_populates="recipients")
    recipient = relationship("User", back_populates="received_documents")


class EncryptionMetadata(Base):
    """Tabel parameter kriptografi kontainer .enc (IV, Tag GCM, Ephemeral Key, AAD, Entropi)."""
    __tablename__ = "encryption_metadata"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), unique=True, nullable=False, index=True)
    container_magic = Column(String(10), default="HC01", nullable=False)
    container_version = Column(Integer, default=1, nullable=False)
    cipher_algorithm = Column(String(40), default="AES-256-GCM", nullable=False)
    ecc_curve = Column(String(40), default="NIST P-256", nullable=False)
    kdf_algorithm = Column(String(40), default="HKDF-SHA256", nullable=False)
    key_wrap_mode = Column(String(40), default="ECDH-HKDF-XOR-AAD", nullable=False)
    iv_nonce_hex = Column(String(32), unique=True, nullable=False, index=True)
    auth_tag_hex = Column(String(40), nullable=False)
    ephemeral_pub_hex = Column(String(140), nullable=False)
    hkdf_context = Column(String(120), default="HYBRID-CRYPTO-FRAMEWORK-ECDH-AES256GCM-V1")
    aad_json = Column(JSON, nullable=False)
    shannon_entropy = Column(Float, nullable=True)
    encryption_time_ms = Column(Float, nullable=True)
    created_at = Column(DateTime, default=_utc_now)

    document = relationship("Document", back_populates="encryption_meta")


class AuditLog(Base):
    """Tabel Tamper-Proof Audit Log dengan Hash-Chaining SHA-256 & Tanda Tangan ECDSA Server."""
    __tablename__ = "audit_logs"
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, index=True)
    timestamp = Column(DateTime, default=_utc_now, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    actor_identity = Column(String(150), nullable=False)
    action_type = Column(String(50), nullable=False, index=True)
    status = Column(String(30), default="SUCCESS", nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    document_hash = Column(String(64), nullable=True, index=True)
    ip_address = Column(String(45), nullable=False)
    metadata_json = Column(JSON, nullable=True)
    prev_log_hash = Column(String(64), nullable=False)
    server_signature = Column(String(255), nullable=False)


class AuthenticationLog(Base):
    """Tabel khusus riwayat autentikasi (Login, Logout, Kegagalan Login, Rate Limit)."""
    __tablename__ = "authentication_logs"
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, index=True)
    timestamp = Column(DateTime, default=_utc_now, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    username_attempted = Column(String(150), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, TOKEN_EXPIRED
    status = Column(String(20), nullable=False)  # SUCCESS, FAILED
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(String(255), nullable=True)
    failure_reason = Column(String(255), nullable=True)


class RevokedToken(Base):
    """Daftar token JWT yang sudah dicabut (logout). Disimpan di database agar bertahan setelah restart."""
    __tablename__ = "revoked_tokens"
    jti = Column(String(64), primary_key=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked_at = Column(DateTime, default=_utc_now, nullable=False)
