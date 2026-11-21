from datetime import datetime, timezone
from sqlalchemy import or_
from sqlalchemy.orm import Session
from ..models import (
    User,
    Role,
    UserRole,
    PublicKey,
    UserKey,
    Document,
    DocumentRecipient,
    EncryptionMetadata,
)


class KeyRepository:
    """Repository untuk menyinkronkan penyimpanan kunci pada tabel `public_keys` dan `user_keys`."""

    @staticmethod
    def register_keypair(
        db: Session,
        user_id: int,
        fingerprint: str,
        public_key_pem: str,
        encrypted_private_key_pem: str,
        curve_name: str = "NIST P-256",
        revoke_previous: bool = True,
    ) -> tuple[PublicKey, UserKey]:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if revoke_previous:
            db.query(PublicKey).filter(
                PublicKey.user_id == user_id,
                PublicKey.is_revoked == False,
            ).update({"is_revoked": True})
            db.query(UserKey).filter(
                UserKey.user_id == user_id,
                UserKey.is_revoked == False,
            ).update({"is_revoked": True, "status": "ROTATED", "rotated_at": now})

        pub_entry = PublicKey(
            user_id=user_id,
            key_fingerprint=fingerprint,
            public_key_pem=public_key_pem,
            curve_name=curve_name,
            is_revoked=False,
        )
        user_key_entry = UserKey(
            user_id=user_id,
            key_fingerprint=fingerprint,
            public_key_pem=public_key_pem,
            encrypted_private_key_pem=encrypted_private_key_pem,
            kdf_protection="PBKDF2WithHMAC-SHA256AndAES256-CBC",
            curve_name=curve_name,
            status="ACTIVE",
            is_revoked=False,
        )
        db.add(pub_entry)
        db.add(user_key_entry)
        db.commit()
        db.refresh(pub_entry)
        db.refresh(user_key_entry)
        return pub_entry, user_key_entry

    @staticmethod
    def get_active_public_key_by_user(db: Session, user_id: int) -> PublicKey | None:
        return (
            db.query(PublicKey)
            .filter(PublicKey.user_id == user_id, PublicKey.is_revoked == False)
            .order_by(PublicKey.id.desc())
            .first()
        )

    @staticmethod
    def get_active_user_key(db: Session, user_id: int) -> UserKey | None:
        return (
            db.query(UserKey)
            .filter(UserKey.user_id == user_id, UserKey.is_revoked == False)
            .order_by(UserKey.id.desc())
            .first()
        )


class DocumentRepository:
    """Repository untuk akses & query dokumen terenkripsi beserta kontrol akses penerima."""

    @staticmethod
    def get_active_by_id(db: Session, doc_id: int) -> Document | None:
        return db.query(Document).filter(Document.id == doc_id, Document.is_deleted == False).first()

    @staticmethod
    def list_accessible(
        db: Session,
        user_id: int,
        is_admin: bool,
        scope: str | None = None,
        classification: str | None = None,
        search: str | None = None,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[Document], int]:
        query = db.query(Document).filter(Document.is_deleted == False)
        if not is_admin:
            received_subq = db.query(DocumentRecipient.document_id).filter(
                DocumentRecipient.recipient_user_id == user_id
            )
            query = query.filter(or_(Document.sender_id == user_id, Document.id.in_(received_subq)))

        if scope == "sent":
            query = query.filter(Document.sender_id == user_id)
        elif scope == "received":
            received_subq = db.query(DocumentRecipient.document_id).filter(
                DocumentRecipient.recipient_user_id == user_id
            )
            query = query.filter(Document.id.in_(received_subq))

        if classification:
            query = query.filter(Document.classification == classification)
        if search:
            like_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Document.original_filename.ilike(like_pattern),
                    Document.doc_uid.ilike(like_pattern),
                )
            )

        total = query.count()
        offset = (page - 1) * per_page
        items = query.order_by(Document.id.desc()).offset(offset).limit(per_page).all()
        return items, total


class UserRepository:
    """Repository untuk query pengguna & peran aktif."""

    @staticmethod
    def get_active_by_id(db: Session, user_id: int) -> User | None:
        return db.query(User).filter(User.id == user_id, User.deleted_at == None).first()

    @staticmethod
    def list_filtered(
        db: Session,
        include_deleted: bool = False,
        role_name: str | None = None,
        search: str | None = None,
    ) -> list[User]:
        query = db.query(User).join(Role, User.role_id == Role.id, isouter=True)
        if not include_deleted:
            query = query.filter(User.deleted_at == None)
        if role_name:
            query = query.filter(Role.name == role_name)
        if search:
            like_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    User.username.ilike(like_pattern),
                    User.full_name.ilike(like_pattern),
                    User.email.ilike(like_pattern),
                )
            )
        return query.order_by(User.id.asc()).all()
