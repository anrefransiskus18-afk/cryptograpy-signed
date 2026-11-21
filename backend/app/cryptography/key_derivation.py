from Crypto.PublicKey import ECC
from Crypto.Protocol.DH import key_agreement
from Crypto.Protocol.KDF import HKDF
from Crypto.Hash import SHA256
from Crypto.Cipher import AES
from Crypto.Util.strxor import strxor


class KeyDerivationEngine:
    """
    Mesin Pertukaran Kunci ECDH dan Derivasi Kunci HKDF-SHA256 (RFC 5869).

    Dokumentasi Proses Derivasi & Tinjauan Konstruksi Enkapsulasi:
    ----------------------------------------------------------------
    1. Ephemeral-Static ECDH (Kurva NIST P-256):
       Pengirim membangkitkan pasangan kunci sementara (d_eph, Q_eph) untuk setiap dokumen,
       lalu menghitung titik bersama S = d_eph * Q_rec. Koordinat X (32 byte) menjadi
       input shared secret Z pada fungsi derivasi kunci.
    2. Derivasi Wrapping Key dengan HKDF-SHA256 (RFC 5869):
       - Master Secret : Z (32-byte ECDH shared secret coordinate S_x)
       - Salt          : SHA-256(Q_eph) (32-byte deterministic salt dari titik publik ephemeral unik)
       - Info / Context: b"HYBRID-CRYPTO-FRAMEWORK-ECDH-AES256GCM-V1" (domain separation)
    3. Tinjauan Konstruksi Enkapsulasi Session Key (Bab III Persamaan 2.15 Tesis):
       - Dalam tesis Bab III Persamaan (2.15), kunci sesi dienkapsulasi dengan operasi:
         C_key = K_sess XOR K_wrap (32 byte).
       - Analisis Keamanan:
         Operasi XOR murni tanpa autentikasi bersifat malleable (pembalikan bit ke-i pada C_key
         akan membalik bit ke-i pada K_sess yang dipulihkan). NAMUN, pada konstruksi ini:
         (a) Pasangan kunci (d_eph, Q_eph) dibangkitkan baru untuk setiap dokumen sehingga K_wrap
             tidak pernah digunakan ulang (one-time key stream).
         (b) Seluruh komponen `Header || Q_eph || C_key || Canonical_AAD` diikat secara kriptografis
             sebagai Additional Authenticated Data (AAD) ke dalam GHASH AES-256-GCM.
         (c) Apabila 1 bit pun pada C_key atau Q_eph dimodifikasi, kunci sesi hasil XOR berubah
             dan input AAD GHASH berubah, sehingga verifikasi Tag GCM 128-bit pasti gagal (probabilitas
             pemalsuan 2^-128).
       - Sebagai opsi standar industri tambahan (RFC 9180 / NIST SP 800-38D), modul ini juga
         menyediakan mode `AES_GCM_KW` (Authenticated Key Wrapping) yang menghasilkan C_key 48-byte
         (32B encrypted key + 16B key-wrap tag).
    """
    HKDF_CONTEXT_V1 = b"HYBRID-CRYPTO-FRAMEWORK-ECDH-AES256GCM-V1"
    HKDF_CONTEXT_KW = b"HYBRID-CRYPTO-FRAMEWORK-ECDH-AES256GCM-KEYWRAP-V2"

    @classmethod
    def kdf_hkdf_sha256(cls, shared_secret_z: bytes, q_eph_bytes: bytes, key_len: int = 32, context: bytes | None = None) -> bytes:
        """
        Menurunkan material kunci sepanjang `key_len` byte dari shared secret ECDH Z
        menggunakan HKDF-SHA256 dengan salt SHA-256(Q_eph) dan context domain-separation.
        """
        salt = SHA256.new(q_eph_bytes).digest()
        info = context or cls.HKDF_CONTEXT_V1
        return HKDF(
            master=shared_secret_z,
            key_len=key_len,
            salt=salt,
            hashmod=SHA256,
            context=info,
        )

    @classmethod
    def derive_wrapping_key_ecdh(
        cls,
        private_key: ECC.EccKey,
        peer_public_key: ECC.EccKey,
        q_eph_bytes: bytes,
        key_len: int = 32,
        context: bytes | None = None,
    ) -> bytes:
        """
        Menjalankan ECDH Key Agreement pada kurva NIST P-256 dan langsung menurunkan
        wrapping key menggunakan HKDF-SHA256. Shared secret mentah tidak pernah diekspos.
        """
        return key_agreement(
            static_priv=private_key,
            static_pub=peer_public_key,
            kdf=lambda z: cls.kdf_hkdf_sha256(z, q_eph_bytes, key_len=key_len, context=context),
        )

    @classmethod
    def encapsulate_session_key_xor(
        cls,
        session_key: bytes,
        ephemeral_priv_key: ECC.EccKey,
        recipient_pub_key: ECC.EccKey,
        q_eph_bytes: bytes,
    ) -> bytes:
        """
        Enkapsulasi kunci sesi sesuai Persamaan (2.15) Tesis: C_key = K_sess XOR K_wrap (32 byte).
        Keutuhan C_key dan Q_eph dijamin oleh pengikatan AAD pada AES-256-GCM.
        """
        kek = cls.derive_wrapping_key_ecdh(
            private_key=ephemeral_priv_key,
            peer_public_key=recipient_pub_key,
            q_eph_bytes=q_eph_bytes,
            key_len=32,
            context=cls.HKDF_CONTEXT_V1,
        )
        try:
            return strxor(session_key, kek)
        finally:
            del kek

    @classmethod
    def decapsulate_session_key_xor(
        cls,
        c_key: bytes,
        recipient_priv_key: ECC.EccKey,
        ephemeral_pub_key: ECC.EccKey,
        q_eph_bytes: bytes,
    ) -> bytes:
        """
        Dekapsulasi kunci sesi sesuai Tesis: K_sess = C_key XOR K_wrap (32 byte).
        """
        kek = cls.derive_wrapping_key_ecdh(
            private_key=recipient_priv_key,
            peer_public_key=ephemeral_pub_key,
            q_eph_bytes=q_eph_bytes,
            key_len=32,
            context=cls.HKDF_CONTEXT_V1,
        )
        try:
            return strxor(c_key, kek)
        finally:
            del kek

    @classmethod
    def encapsulate_session_key_gcm_kw(
        cls,
        session_key: bytes,
        ephemeral_priv_key: ECC.EccKey,
        recipient_pub_key: ECC.EccKey,
        q_eph_bytes: bytes,
    ) -> bytes:
        """
        Konstruksi Key Wrapping Terstandarisasi (Authenticated AES-256-GCM Key Wrap):
        Menurunkan 44 byte dari HKDF-SHA256 (32B KEK + 12B Nonce) dan mengenkripsi K_sess
        beserta tag autentikasi 16B -> menghasilkan C_key sepanjang 48 byte.
        """
        material = cls.derive_wrapping_key_ecdh(
            private_key=ephemeral_priv_key,
            peer_public_key=recipient_pub_key,
            q_eph_bytes=q_eph_bytes,
            key_len=44,
            context=cls.HKDF_CONTEXT_KW,
        )
        kek, kw_nonce = material[:32], material[32:44]
        cipher = AES.new(kek, AES.MODE_GCM, nonce=kw_nonce, mac_len=16)
        cipher.update(q_eph_bytes)
        ct_key, kw_tag = cipher.encrypt_and_digest(session_key)
        del material, kek
        return ct_key + kw_tag  # 48 bytes

    @classmethod
    def decapsulate_session_key_gcm_kw(
        cls,
        c_key_48b: bytes,
        recipient_priv_key: ECC.EccKey,
        ephemeral_pub_key: ECC.EccKey,
        q_eph_bytes: bytes,
    ) -> bytes:
        """Membuka bungkus kunci sesi dari mode Authenticated AES-256-GCM Key Wrap (48 byte)."""
        if len(c_key_48b) != 48:
            raise ValueError("Panjang wrapped session key untuk mode AES_GCM_KW harus 48 byte.")
        material = cls.derive_wrapping_key_ecdh(
            private_key=recipient_priv_key,
            peer_public_key=ephemeral_pub_key,
            q_eph_bytes=q_eph_bytes,
            key_len=44,
            context=cls.HKDF_CONTEXT_KW,
        )
        kek, kw_nonce = material[:32], material[32:44]
        ct_key, kw_tag = c_key_48b[:32], c_key_48b[32:48]
        cipher = AES.new(kek, AES.MODE_GCM, nonce=kw_nonce, mac_len=16)
        cipher.update(q_eph_bytes)
        del material, kek
        return cipher.decrypt_and_verify(ct_key, kw_tag)
