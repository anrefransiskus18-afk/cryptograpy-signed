import math
import threading
from collections import Counter
from typing import Tuple
from Crypto.Cipher import AES
from Crypto.Hash import SHA256
from Crypto.Random import get_random_bytes

# Set pelacak pasangan (key_hash, nonce) agar nonce tidak pernah digunakan ulang dengan kunci yang sama
_USED_NONCE_REGISTRY: set[Tuple[bytes, bytes]] = set()
_NONCE_LOCK = threading.Lock()
STREAM_CHUNK_SIZE = 1024 * 1024  # 1 MiB chunk untuk efisiensi streaming memori pada file besar


class AESEngine:
    """
    Mesin Enkripsi Simetris Terotentikasi AES-256-GCM (NIST FIPS 197 & SP 800-38D).
    - Panjang kunci sesi: 256-bit (32 byte)
    - Panjang IV/Nonce: 96-bit (12 byte)
    - Panjang Authentication Tag: 128-bit (16 byte)
    - Mendukung Additional Authenticated Data (AAD) dan pemrosesan per-chunk.
    """
    KEY_SIZE = 32
    NONCE_SIZE = 12
    TAG_SIZE = 16

    @classmethod
    def generate_session_key(cls) -> bytes:
        """Membangkitkan kunci sesi AES-256 (32 byte) acak menggunakan CSPRNG."""
        return get_random_bytes(cls.KEY_SIZE)

    @classmethod
    def generate_unique_nonce(cls, session_key: bytes) -> bytes:
        """
        Membangkitkan nonce 12-byte via CSPRNG dan memastikan tidak pernah terjadi
        penggunaan ulang nonce (nonce reuse) pada kunci sesi yang sama.
        """
        key_digest = SHA256.new(session_key).digest()[:16]
        with _NONCE_LOCK:
            for _ in range(10):
                nonce = get_random_bytes(cls.NONCE_SIZE)
                pair = (key_digest, nonce)
                if pair not in _USED_NONCE_REGISTRY:
                    if len(_USED_NONCE_REGISTRY) > 50000:
                        _USED_NONCE_REGISTRY.clear()
                    _USED_NONCE_REGISTRY.add(pair)
                    return nonce
        raise RuntimeError("CSPRNG gagal menghasilkan nonce unik untuk kunci sesi ini.")

    @classmethod
    def encrypt_gcm(
        cls,
        plaintext: bytes,
        session_key: bytes,
        nonce: bytes,
        aad: bytes = b""
    ) -> Tuple[bytes, bytes]:
        """
        Mengenkripsi plaintext dengan AES-256-GCM dan mengikat AAD ke dalam GHASH.
        Menggunakan pemrosesan bertahap (chunked streaming) untuk file besar.
        Mengembalikan (ciphertext, auth_tag_16B).
        """
        if len(session_key) != cls.KEY_SIZE:
            raise ValueError(f"Kunci sesi AES-256 harus tepat {cls.KEY_SIZE} byte.")
        if len(nonce) != cls.NONCE_SIZE:
            raise ValueError(f"Nonce/IV AES-GCM harus tepat {cls.NONCE_SIZE} byte.")

        cipher = AES.new(session_key, AES.MODE_GCM, nonce=nonce, mac_len=cls.TAG_SIZE)
        if aad:
            cipher.update(aad)

        if len(plaintext) <= STREAM_CHUNK_SIZE:
            ciphertext = cipher.encrypt(plaintext)
        else:
            chunks = []
            mv = memoryview(plaintext)
            for offset in range(0, len(plaintext), STREAM_CHUNK_SIZE):
                chunks.append(cipher.encrypt(bytes(mv[offset:offset + STREAM_CHUNK_SIZE])))
            ciphertext = b"".join(chunks)

        auth_tag = cipher.digest()
        return ciphertext, auth_tag

    @classmethod
    def decrypt_gcm(
        cls,
        ciphertext: bytes,
        session_key: bytes,
        nonce: bytes,
        auth_tag: bytes,
        aad: bytes = b""
    ) -> bytes:
        """
        Mendekripsi ciphertext dengan AES-256-GCM dan memverifikasi Authentication Tag 16-byte
        beserta AAD sebelum mengembalikan plaintext.
        Melempar ValueError jika tag atau AAD tidak valid (tampering terdeteksi).
        """
        if len(session_key) != cls.KEY_SIZE:
            raise ValueError(f"Kunci sesi AES-256 harus tepat {cls.KEY_SIZE} byte.")
        if len(nonce) != cls.NONCE_SIZE:
            raise ValueError(f"Nonce/IV AES-GCM harus tepat {cls.NONCE_SIZE} byte.")
        if len(auth_tag) != cls.TAG_SIZE:
            raise ValueError(f"Authentication Tag AES-GCM harus tepat {cls.TAG_SIZE} byte.")

        cipher = AES.new(session_key, AES.MODE_GCM, nonce=nonce, mac_len=cls.TAG_SIZE)
        if aad:
            cipher.update(aad)

        if len(ciphertext) <= STREAM_CHUNK_SIZE:
            decrypted = cipher.decrypt(ciphertext)
        else:
            chunks = []
            mv = memoryview(ciphertext)
            for offset in range(0, len(ciphertext), STREAM_CHUNK_SIZE):
                chunks.append(cipher.decrypt(bytes(mv[offset:offset + STREAM_CHUNK_SIZE])))
            decrypted = b"".join(chunks)

        # Verifikasi MAC Tag 128-bit; jika gagal, hapus buffer plaintext dan lempar ValueError
        cipher.verify(auth_tag)
        return decrypted

    @staticmethod
    def calculate_shannon_entropy(data: bytes, max_sample_bytes: int = 1048576) -> float:
        """
        Menghitung Entropi Shannon H(X) = -sum(p(x_i) * log2(p(x_i))) dalam satuan bits/byte (0.0 - 8.0).
        Sesuai Persamaan (3.5) dokumen tesis.
        """
        if not data:
            return 0.0
        sample = data[:max_sample_bytes] if len(data) > max_sample_bytes else data
        length = len(sample)
        counts = Counter(sample)
        entropy = -sum((count / length) * math.log2(count / length) for count in counts.values())
        return round(entropy, 6)

    @classmethod
    def calculate_avalanche_effect(cls, sample_plaintext: bytes = b"PT XYZ Avalanche Test Vector 2026" * 32) -> float:
        """
        Menghitung Avalanche Effect (%) dengan membalik tepat 1 bit pada kunci sesi AES-256
        dan mengukur jarak Hamming antara kedua ciphertext sesuai Persamaan (3.6) tesis.
        """
        key1 = cls.generate_session_key()
        key2 = bytearray(key1)
        key2[0] ^= 0x01  # Flip tepat 1 bit pada kunci sesi
        nonce = get_random_bytes(cls.NONCE_SIZE)

        c1, _ = cls.encrypt_gcm(sample_plaintext, key1, nonce)
        c2, _ = cls.encrypt_gcm(sample_plaintext, bytes(key2), nonce)

        total_bits = len(c1) * 8
        diff_bits = sum((b1 ^ b2).bit_count() for b1, b2 in zip(c1, c2))
        return round((diff_bits / total_bits) * 100.0, 4)
