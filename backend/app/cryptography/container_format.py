from dataclasses import dataclass
from typing import Dict, Any


class TamperDetectedError(Exception):
    """Dilempar ketika verifikasi integritas GCM Tag, header, titik ECC, atau AAD gagal."""
    pass


@dataclass
class ParsedContainer:
    magic_header: bytes
    version: int
    wrap_mode: str
    q_eph_bytes: bytes
    c_key_bytes: bytes
    iv_gcm: bytes
    auth_tag: bytes
    ciphertext: bytes
    header_size: int


class ContainerFormat:
    """
    Spesifikasi & Serializer/Parser Kontainer Biner Dokumen Terenkripsi (`.enc`).

    Struktur Kontainer Standar Tesis (`HC01` — Prefix Tetap 129 Byte):
    +-------------------------------------------------------------------------+
    | Offset  | Ukuran | Field        | Deskripsi                             |
    +---------+--------+--------------+---------------------------------------+
    | 0..4    | 4 B    | Header       | Magic Number & Versi: b"HC01"         |
    | 4..69   | 65 B   | Q_eph        | Uncompressed ECC P-256 (0x04||X||Y)   |
    | 69..101 | 32 B   | C_key        | Wrapped Session Key (256-bit)         |
    | 101..113| 12 B   | IV / Nonce   | AES-256-GCM Nonce (96-bit)            |
    | 113..129| 16 B   | Auth Tag     | AES-256-GCM Authentication Tag (128b) |
    | 129..N  | Var    | Ciphertext   | Payload Dokumen Terenkripsi           |
    +-------------------------------------------------------------------------+

    Struktur Kontainer Key-Wrap Terstandarisasi (`HC02` — Prefix Tetap 145 Byte):
    - Menggunakan `C_key` sepanjang 48 Byte (32B AES-GCM Encrypted Key + 16B Key-Wrap Tag).
    """
    MAGIC_HC01 = b"HC01"
    MAGIC_HC02 = b"HC02"
    Q_EPH_SIZE = 65
    C_KEY_SIZE_HC01 = 32
    C_KEY_SIZE_HC02 = 48
    IV_SIZE = 12
    TAG_SIZE = 16
    FIXED_HEADER_LEN_HC01 = 4 + 65 + 32 + 12 + 16  # 129 bytes
    FIXED_HEADER_LEN_HC02 = 4 + 65 + 48 + 12 + 16  # 145 bytes

    @classmethod
    def pack_container(
        cls,
        q_eph_bytes: bytes,
        c_key_bytes: bytes,
        iv_gcm: bytes,
        auth_tag: bytes,
        ciphertext: bytes,
        magic_header: bytes = MAGIC_HC01,
    ) -> bytes:
        """Merakit komponen kriptografi menjadi kontainer biner `.enc`."""
        if magic_header not in (cls.MAGIC_HC01, cls.MAGIC_HC02):
            raise ValueError("Magic header kontainer tidak didukung.")
        if len(q_eph_bytes) != cls.Q_EPH_SIZE or q_eph_bytes[0] != 0x04:
            raise ValueError("Q_eph harus 65 byte uncompressed SEC1 (diawali 0x04).")
        expected_ckey = cls.C_KEY_SIZE_HC01 if magic_header == cls.MAGIC_HC01 else cls.C_KEY_SIZE_HC02
        if len(c_key_bytes) != expected_ckey:
            raise ValueError(f"C_key harus {expected_ckey} byte untuk format {magic_header.decode('ascii')}.")
        if len(iv_gcm) != cls.IV_SIZE:
            raise ValueError("IV/Nonce AES-GCM harus 12 byte.")
        if len(auth_tag) != cls.TAG_SIZE:
            raise ValueError("Authentication Tag AES-GCM harus 16 byte.")

        return magic_header + q_eph_bytes + c_key_bytes + iv_gcm + auth_tag + ciphertext

    @classmethod
    def unpack_container(cls, container_bytes: bytes) -> ParsedContainer:
        """
        Memvalidasi header, memeriksa ukuran setiap komponen, dan mem-parsing
        kontainer biner `.enc` sebelum proses dekripsi dimulai.
        """
        if not container_bytes or len(container_bytes) < cls.FIXED_HEADER_LEN_HC01:
            raise TamperDetectedError(
                f"Ukuran kontainer .enc rusak atau di bawah batas minimum ({cls.FIXED_HEADER_LEN_HC01} byte)."
            )

        magic = container_bytes[0:4]
        if magic == cls.MAGIC_HC01:
            c_key_len = cls.C_KEY_SIZE_HC01
            header_len = cls.FIXED_HEADER_LEN_HC01
            version = 1
            wrap_mode = "XOR_AAD"
        elif magic == cls.MAGIC_HC02:
            if len(container_bytes) < cls.FIXED_HEADER_LEN_HC02:
                raise TamperDetectedError("Ukuran kontainer HC02 di bawah batas minimum (145 byte).")
            c_key_len = cls.C_KEY_SIZE_HC02
            header_len = cls.FIXED_HEADER_LEN_HC02
            version = 2
            wrap_mode = "AES_GCM_KW"
        else:
            raise TamperDetectedError("Header kontainer tidak valid (Bukan format kontainer HC01/HC02).")

        q_eph_end = 4 + cls.Q_EPH_SIZE
        c_key_end = q_eph_end + c_key_len
        iv_end = c_key_end + cls.IV_SIZE
        tag_end = iv_end + cls.TAG_SIZE

        q_eph_bytes = container_bytes[4:q_eph_end]
        c_key_bytes = container_bytes[q_eph_end:c_key_end]
        iv_gcm = container_bytes[c_key_end:iv_end]
        auth_tag = container_bytes[iv_end:tag_end]
        ciphertext = container_bytes[tag_end:]

        if q_eph_bytes[0] != 0x04:
            raise TamperDetectedError("Prefix titik kurva eliptik Q_eph (0x04) rusak atau telah dimodifikasi.")

        return ParsedContainer(
            magic_header=magic,
            version=version,
            wrap_mode=wrap_mode,
            q_eph_bytes=q_eph_bytes,
            c_key_bytes=c_key_bytes,
            iv_gcm=iv_gcm,
            auth_tag=auth_tag,
            ciphertext=ciphertext,
            header_size=header_len,
        )

    @classmethod
    def inspect_container(cls, container_bytes: bytes) -> Dict[str, Any]:
        """Mengekstrak informasi teknis struktur kontainer `.enc` untuk keperluan verifikasi/UI."""
        parsed = cls.unpack_container(container_bytes)
        return {
            "magic": parsed.magic_header.decode("ascii"),
            "version": parsed.version,
            "wrap_mode": parsed.wrap_mode,
            "header_size_bytes": parsed.header_size,
            "ciphertext_size_bytes": len(parsed.ciphertext),
            "total_size_bytes": len(container_bytes),
            "q_eph_hex": parsed.q_eph_bytes.hex(),
            "c_key_hex": parsed.c_key_bytes.hex(),
            "iv_nonce_hex": parsed.iv_gcm.hex(),
            "auth_tag_hex": parsed.auth_tag.hex(),
        }
