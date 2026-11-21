import base64
from typing import Dict
from Crypto.PublicKey import ECC
from Crypto.Hash import SHA256
from Crypto.Signature import DSS


class ECCEngine:
    """
    Mesin Kriptografi Kurva Eliptik NIST P-256 (secp256r1 / prime256v1).
    - Mengelola pembangkitan pasangan kunci asimetris pengguna dan kunci ephemeral.
    - Melindungi kunci privat menggunakan standar PKCS#8 Encrypted PEM
      (PBKDF2WithHMAC-SHA256AndAES256-CBC).
    - Memvalidasi kepemilikan kunci dan menandatangani log audit dengan ECDSA FIPS 186-3.
    """
    CURVE_NAME = "NIST P-256"
    CURVE_ALIAS = "P-256"
    UNCOMPRESSED_POINT_SIZE = 65  # 0x04 || X (32B) || Y (32B)

    @classmethod
    def generate_keypair(cls, passphrase: str, iteration_count: int = 60000) -> Dict[str, str]:
        """
        Membangkitkan pasangan kunci ECC NIST P-256.
        - Kunci privat dienkripsi dalam format PKCS#8 PEM menggunakan passphrase pengguna.
        - Kunci publik diekspor dalam format PEM standar beserta fingerprint SHA-256.
        """
        if not passphrase or len(passphrase) < 8:
            raise ValueError("Passphrase kunci privat minimal harus 8 karakter.")

        key = ECC.generate(curve=cls.CURVE_ALIAS)
        encrypted_private_key_pem = key.export_key(
            format="PEM",
            use_pkcs8=True,
            passphrase=passphrase,
            protection="PBKDF2WithHMAC-SHA256AndAES256-CBC",
            prot_params={"iteration_count": iteration_count},
        )

        public_key_obj = key.public_key()
        public_key_pem = public_key_obj.export_key(format="PEM")
        public_key_der = public_key_obj.export_key(format="DER")
        fingerprint = SHA256.new(public_key_der).hexdigest()

        return {
            "private_key_pkcs8_pem": encrypted_private_key_pem,
            "public_key_pem": public_key_pem,
            "fingerprint": fingerprint,
            "curve": cls.CURVE_NAME,
            "kdf_protection": "PBKDF2WithHMAC-SHA256AndAES256-CBC",
        }

    @classmethod
    def generate_ephemeral_keypair(cls) -> tuple[ECC.EccKey, bytes]:
        """
        Membangkitkan pasangan kunci ephemeral sekali pakai (d_eph, Q_eph)
        dan mengembalikan objek kunci serta titik publik uncompressed SEC1 (65 byte).
        """
        eph_key = ECC.generate(curve=cls.CURVE_ALIAS)
        q_eph_bytes = eph_key.public_key().export_key(format="SEC1", compress=False)
        if len(q_eph_bytes) != cls.UNCOMPRESSED_POINT_SIZE:
            raise ValueError("Ukuran titik publik ephemeral Q_eph tidak valid (harus 65 byte).")
        return eph_key, q_eph_bytes

    @classmethod
    def import_public_key(cls, public_key_pem: str) -> ECC.EccKey:
        """Mengimpor dan memvalidasi kunci publik ECC NIST P-256 dari format PEM."""
        pub_key = ECC.import_key(public_key_pem.strip())
        if pub_key.curve != cls.CURVE_NAME:
            raise ValueError(f"Kurva tidak didukung: {pub_key.curve}. Wajib {cls.CURVE_NAME}.")
        return pub_key

    @classmethod
    def import_ephemeral_public_point(cls, q_eph_bytes: bytes) -> ECC.EccKey:
        """Mengimpor titik publik kurva eliptik uncompressed SEC1 (65-byte) dan memvalidasinya di kurva P-256."""
        if len(q_eph_bytes) != cls.UNCOMPRESSED_POINT_SIZE or q_eph_bytes[0] != 0x04:
            raise ValueError("Format titik publik ephemeral Q_eph tidak valid.")
        return ECC.import_key(q_eph_bytes, curve_name=cls.CURVE_ALIAS)

    @classmethod
    def import_encrypted_private_key(cls, encrypted_private_key_pem: str, passphrase: str) -> ECC.EccKey:
        """Membuka kunci privat PKCS#8 terenkripsi di memori menggunakan passphrase."""
        if not encrypted_private_key_pem or not passphrase:
            raise ValueError("Kunci privat PKCS#8 dan passphrase wajib disertakan.")
        try:
            priv_key = ECC.import_key(encrypted_private_key_pem.strip(), passphrase=passphrase)
        except (ValueError, IndexError, TypeError) as exc:
            raise ValueError("Gagal membuka kunci privat PKCS#8: Passphrase salah atau format kunci rusak.") from exc
        if priv_key.curve != cls.CURVE_NAME or not priv_key.has_private():
            raise ValueError("Kunci yang dimuat bukan kunci privat ECC NIST P-256 yang valid.")
        return priv_key

    @classmethod
    def compute_public_key_fingerprint(cls, public_key_pem: str) -> str:
        """Menghitung SHA-256 fingerprint (64 hex chars) dari kunci publik ECC P-256."""
        pub_key = cls.import_public_key(public_key_pem)
        der_bytes = pub_key.export_key(format="DER")
        return SHA256.new(der_bytes).hexdigest()

    @classmethod
    def verify_key_ownership(cls, encrypted_private_key_pem: str, passphrase: str, expected_fingerprint: str) -> Dict[str, str | bool]:
        """
        Memvalidasi bahwa kunci privat PKCS#8 yang dibuka dengan passphrase benar-benar
        pasangan matematis dari kunci publik dengan fingerprint yang terdaftar.
        """
        priv_key = cls.import_encrypted_private_key(encrypted_private_key_pem, passphrase)
        derived_pub_der = priv_key.public_key().export_key(format="DER")
        actual_fingerprint = SHA256.new(derived_pub_der).hexdigest()
        return {
            "is_valid": actual_fingerprint == expected_fingerprint,
            "actual_fingerprint": actual_fingerprint,
            "expected_fingerprint": expected_fingerprint,
            "curve": cls.CURVE_NAME,
        }

    @staticmethod
    def sign_message(priv_key: ECC.EccKey, message_str: str) -> str:
        """Menandatangani pesan kanonik menggunakan ECDSA (FIPS 186-3) SHA-256."""
        digest = SHA256.new(message_str.encode("utf-8"))
        signer = DSS.new(priv_key, "fips-186-3")
        return base64.b64encode(signer.sign(digest)).decode("utf-8")

    @staticmethod
    def verify_signature(pub_key: ECC.EccKey, message_str: str, signature_b64: str) -> bool:
        """Memverifikasi tanda tangan ECDSA (FIPS 186-3) SHA-256."""
        try:
            digest = SHA256.new(message_str.encode("utf-8"))
            verifier = DSS.new(pub_key, "fips-186-3")
            verifier.verify(digest, base64.b64decode(signature_b64))
            return True
        except (ValueError, TypeError):
            return False
