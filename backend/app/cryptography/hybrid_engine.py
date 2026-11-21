import json
import time
from typing import Dict, Any
from Crypto.PublicKey import ECC

from .aes_engine import AESEngine
from .ecc_engine import ECCEngine
from .key_derivation import KeyDerivationEngine
from .container_format import ContainerFormat, TamperDetectedError


class HybridCryptoEngine:
    """
    Orkestrator Kriptografi Hybrid (AES-256-GCM + ECC NIST P-256 + ECDH + HKDF-SHA256).
    Menggabungkan seluruh modul pada lapisan Cryptographic Engine sesuai metodologi tesis.
    """
    MAGIC_HEADER = ContainerFormat.MAGIC_HC01
    Q_EPH_SIZE = ContainerFormat.Q_EPH_SIZE
    C_KEY_SIZE = ContainerFormat.C_KEY_SIZE_HC01
    IV_SIZE = ContainerFormat.IV_SIZE
    TAG_SIZE = ContainerFormat.TAG_SIZE
    FIXED_HEADER_LEN = ContainerFormat.FIXED_HEADER_LEN_HC01

    @staticmethod
    def canonicalize_aad(aad_metadata: Dict[str, Any]) -> bytes:
        """Kanonisasi dictionary metadata AAD menjadi urutan byte JSON deterministik."""
        return json.dumps(aad_metadata or {}, sort_keys=True, separators=(",", ":")).encode("utf-8")

    @classmethod
    def generate_ecc_keypair(cls, passphrase: str) -> Dict[str, str]:
        return ECCEngine.generate_keypair(passphrase=passphrase)

    @classmethod
    def compute_public_key_fingerprint(cls, public_key_pem: str) -> str:
        return ECCEngine.compute_public_key_fingerprint(public_key_pem)

    @classmethod
    def verify_key_ownership(cls, encrypted_private_key_pem: str, passphrase: str, expected_fingerprint: str) -> Dict[str, Any]:
        return ECCEngine.verify_key_ownership(encrypted_private_key_pem, passphrase, expected_fingerprint)

    @classmethod
    def _kdf_hkdf_sha256(cls, shared_secret_z: bytes, q_eph_bytes: bytes) -> bytes:
        return KeyDerivationEngine.kdf_hkdf_sha256(shared_secret_z, q_eph_bytes)

    @classmethod
    def encrypt_document(
        cls,
        plaintext_bytes: bytes,
        recipient_public_key_pem: str,
        aad_metadata: Dict[str, Any],
        wrap_mode: str = "XOR_AAD",
    ) -> bytes:
        """
        Mengenkripsi dokumen dengan AES-256-GCM dan mengenkapsulasi kunci sesi
        menggunakan Ephemeral-Static ECDH P-256 + HKDF-SHA256, lalu merakit kontainer `.enc`.
        """
        recipient_pub_key = ECCEngine.import_public_key(recipient_public_key_pem)

        # 1. Bangkitkan pasangan kunci Ephemeral (d_eph, Q_eph) untuk dokumen ini
        ephemeral_key, q_eph_bytes = ECCEngine.generate_ephemeral_keypair()

        # 2. Bangkitkan kunci sesi simetris sekali pakai (256-bit / 32-byte)
        session_key = AESEngine.generate_session_key()

        # 3. Enkapsulasi kunci sesi via ECDH + HKDF-SHA256
        if wrap_mode == "AES_GCM_KW":
            magic = ContainerFormat.MAGIC_HC02
            c_key = KeyDerivationEngine.encapsulate_session_key_gcm_kw(
                session_key=session_key,
                ephemeral_priv_key=ephemeral_key,
                recipient_pub_key=recipient_pub_key,
                q_eph_bytes=q_eph_bytes,
            )
        else:
            magic = ContainerFormat.MAGIC_HC01
            c_key = KeyDerivationEngine.encapsulate_session_key_xor(
                session_key=session_key,
                ephemeral_priv_key=ephemeral_key,
                recipient_pub_key=recipient_pub_key,
                q_eph_bytes=q_eph_bytes,
            )

        # 4. Bangkitkan IV/Nonce unik 12-byte dan kanonisasi AAD
        iv_gcm = AESEngine.generate_unique_nonce(session_key)
        canonical_aad = cls.canonicalize_aad(aad_metadata)

        # 5. Enkripsi payload dengan AES-256-GCM; ikat (Header || Q_eph || C_key || Canonical_AAD) ke GHASH
        bound_aad = magic + q_eph_bytes + c_key + canonical_aad
        ciphertext, auth_tag = AESEngine.encrypt_gcm(
            plaintext=plaintext_bytes,
            session_key=session_key,
            nonce=iv_gcm,
            aad=bound_aad,
        )

        # Zeroize / hapus referensi kunci sesi dari memori
        del session_key
        del ephemeral_key

        # 6. Rakit kontainer biner .enc
        return ContainerFormat.pack_container(
            q_eph_bytes=q_eph_bytes,
            c_key_bytes=c_key,
            iv_gcm=iv_gcm,
            auth_tag=auth_tag,
            ciphertext=ciphertext,
            magic_header=magic,
        )

    @classmethod
    def encrypt_document_with_metrics(
        cls,
        plaintext_bytes: bytes,
        recipient_public_key_pem: str,
        aad_metadata: Dict[str, Any],
        wrap_mode: str = "XOR_AAD",
    ) -> Dict[str, Any]:
        """Menjalankan enkripsi dokumen sekaligus mengukur metrik waktu, throughput, dan entropi."""
        t0 = time.perf_counter()
        container_bytes = cls.encrypt_document(
            plaintext_bytes=plaintext_bytes,
            recipient_public_key_pem=recipient_public_key_pem,
            aad_metadata=aad_metadata,
            wrap_mode=wrap_mode,
        )
        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 3)
        info = ContainerFormat.inspect_container(container_bytes)
        entropy = AESEngine.calculate_shannon_entropy(container_bytes[info["header_size_bytes"]:])
        size_mib = len(plaintext_bytes) / (1024.0 * 1024.0)
        throughput_mibs = round(size_mib / (elapsed_ms / 1000.0), 2) if elapsed_ms > 0 else 0.0
        return {
            "container_bytes": container_bytes,
            "encryption_time_ms": elapsed_ms,
            "throughput_mibs": throughput_mibs,
            "shannon_entropy": entropy,
            "container_info": info,
        }

    @classmethod
    def decrypt_container(
        cls,
        container_bytes: bytes,
        encrypted_private_key_pem: str,
        passphrase: str,
        aad_metadata: Dict[str, Any],
        preloaded_private_key: ECC.EccKey | None = None,
    ) -> bytes:
        """
        Memvalidasi struktur `.enc`, membuka kunci privat PKCS#8 di memori,
        menurunkan kunci sesi via ECDH + HKDF-SHA256, dan memverifikasi Authentication Tag GCM
        sebelum mengembalikan plaintext.
        """
        parsed = ContainerFormat.unpack_container(container_bytes)

        # Buka kunci privat PKCS#8 penerima dengan passphrase (atau gunakan kunci yang sudah didekapsulasi di sesi memori)
        recipient_priv_key = preloaded_private_key or ECCEngine.import_encrypted_private_key(
            encrypted_private_key_pem, passphrase
        )

        # Validasi titik kurva eliptik Q_eph pada kurva NIST P-256
        try:
            ephemeral_pub_key = ECCEngine.import_ephemeral_public_point(parsed.q_eph_bytes)
        except Exception as exc:
            raise TamperDetectedError("Titik kurva eliptik Q_eph (65-byte) telah dimodifikasi atau tidak valid.") from exc

        # Dekapsulasi kunci sesi
        try:
            if parsed.wrap_mode == "AES_GCM_KW":
                session_key = KeyDerivationEngine.decapsulate_session_key_gcm_kw(
                    c_key_48b=parsed.c_key_bytes,
                    recipient_priv_key=recipient_priv_key,
                    ephemeral_pub_key=ephemeral_pub_key,
                    q_eph_bytes=parsed.q_eph_bytes,
                )
            else:
                session_key = KeyDerivationEngine.decapsulate_session_key_xor(
                    c_key=parsed.c_key_bytes,
                    recipient_priv_key=recipient_priv_key,
                    ephemeral_pub_key=ephemeral_pub_key,
                    q_eph_bytes=parsed.q_eph_bytes,
                )
        except Exception as exc:
            raise TamperDetectedError(
                "TAMPER / KEY MISMATCH: Gagal membuka enkapsulasi kunci sesi (kunci penerima tidak cocok atau C_key rusak)."
            ) from exc
        finally:
            del recipient_priv_key

        canonical_aad = cls.canonicalize_aad(aad_metadata)
        bound_aad = parsed.magic_header + parsed.q_eph_bytes + parsed.c_key_bytes + canonical_aad

        try:
            plaintext = AESEngine.decrypt_gcm(
                ciphertext=parsed.ciphertext,
                session_key=session_key,
                nonce=parsed.iv_gcm,
                auth_tag=parsed.auth_tag,
                aad=bound_aad,
            )
            return plaintext
        except ValueError as exc:
            raise TamperDetectedError(
                "TAMPER DETECTED: Validasi Authentication Tag GCM gagal! "
                "Kontainer .enc, AAD metadata, IV, atau kunci penerima telah dimodifikasi / tidak cocok."
            ) from exc
        finally:
            del session_key

    @staticmethod
    def sign_audit_record(server_priv_key: ECC.EccKey, canonical_log_str: str) -> str:
        return ECCEngine.sign_message(server_priv_key, canonical_log_str)

    @staticmethod
    def verify_audit_record(server_pub_key: ECC.EccKey, canonical_log_str: str, signature_b64: str) -> bool:
        return ECCEngine.verify_signature(server_pub_key, canonical_log_str, signature_b64)
