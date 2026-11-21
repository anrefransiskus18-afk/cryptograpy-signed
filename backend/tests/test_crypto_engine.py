import pytest
from app.cryptography import (
    AESEngine,
    ECCEngine,
    KeyDerivationEngine,
    ContainerFormat,
    HybridCryptoEngine,
    TamperDetectedError,
)
from app.services.CryptoEngine import CryptoEngine


def test_ecc_p256_key_generation_and_pkcs8():
    bundle = CryptoEngine.generate_ecc_keypair("StrongPass@2026")
    assert "-----BEGIN ENCRYPTED PRIVATE KEY-----" in bundle["private_key_pkcs8_pem"]
    assert "-----BEGIN PUBLIC KEY-----" in bundle["public_key_pem"]
    assert len(bundle["fingerprint"]) == 64
    assert bundle["curve"] == "NIST P-256"

    ownership = ECCEngine.verify_key_ownership(
        bundle["private_key_pkcs8_pem"],
        "StrongPass@2026",
        bundle["fingerprint"],
    )
    assert ownership["is_valid"] is True


def test_ecdh_and_hkdf_sha256_consistency():
    alice_eph, q_eph_bytes = ECCEngine.generate_ephemeral_keypair()
    bob_bundle = ECCEngine.generate_keypair("BobSecret@2026")
    bob_pub = ECCEngine.import_public_key(bob_bundle["public_key_pem"])
    bob_priv = ECCEngine.import_encrypted_private_key(bob_bundle["private_key_pkcs8_pem"], "BobSecret@2026")

    kek_alice = KeyDerivationEngine.derive_wrapping_key_ecdh(alice_eph, bob_pub, q_eph_bytes)
    eph_pub_imported = ECCEngine.import_ephemeral_public_point(q_eph_bytes)
    kek_bob = KeyDerivationEngine.derive_wrapping_key_ecdh(bob_priv, eph_pub_imported, q_eph_bytes)

    assert len(kek_alice) == 32
    assert kek_alice == kek_bob


def test_aes_256_gcm_and_entropy_avalanche():
    key = AESEngine.generate_session_key()
    nonce1 = AESEngine.generate_unique_nonce(key)
    nonce2 = AESEngine.generate_unique_nonce(key)
    assert nonce1 != nonce2

    plaintext = b"Data Strategis Laporan Keuangan PT XYZ Tahun 2026 " * 100
    aad = b"PT-XYZ-AAD-BINDING"
    ct, tag = AESEngine.encrypt_gcm(plaintext, key, nonce1, aad=aad)
    restored = AESEngine.decrypt_gcm(ct, key, nonce1, tag, aad=aad)
    assert restored == plaintext

    entropy = AESEngine.calculate_shannon_entropy(ct)
    avalanche = AESEngine.calculate_avalanche_effect()
    assert entropy > 7.5
    assert 45.0 <= avalanche <= 55.0


def test_hybrid_encryption_container_offsets_and_decryption():
    bundle = CryptoEngine.generate_ecc_keypair("StrongPass@2026")
    plaintext = b"Dokumen Rahasia Korporat PT XYZ - Kontrak Akuisisi 2026"
    aad = {"classification": "TOP_SECRET", "department": "Executive"}

    container = CryptoEngine.encrypt_document(
        plaintext_bytes=plaintext,
        recipient_public_key_pem=bundle["public_key_pem"],
        aad_metadata=aad,
    )

    # Header (4B) + Q_eph (65B) + C_key (32B) + IV (12B) + Tag (16B) = 129B + len(plaintext)
    assert len(container) == 129 + len(plaintext)
    assert container[0:4] == b"HC01"
    assert container[4] == 0x04

    info = ContainerFormat.inspect_container(container)
    assert info["header_size_bytes"] == 129
    assert info["ciphertext_size_bytes"] == len(plaintext)

    restored = CryptoEngine.decrypt_container(
        container_bytes=container,
        encrypted_private_key_pem=bundle["private_key_pkcs8_pem"],
        passphrase="StrongPass@2026",
        aad_metadata=aad,
    )
    assert restored == plaintext


def test_standardized_aes_gcm_key_wrap_mode_hc02():
    bundle = CryptoEngine.generate_ecc_keypair("StrongPass@2026")
    plaintext = b"Dokumen Uji Konstruksi Key Wrapping Terstandarisasi HC02"
    aad = {"classification": "SECRET", "mode": "AES_GCM_KW"}

    container_hc02 = HybridCryptoEngine.encrypt_document(
        plaintext_bytes=plaintext,
        recipient_public_key_pem=bundle["public_key_pem"],
        aad_metadata=aad,
        wrap_mode="AES_GCM_KW",
    )
    assert container_hc02[0:4] == b"HC02"
    assert len(container_hc02) == 145 + len(plaintext)

    restored = HybridCryptoEngine.decrypt_container(
        container_bytes=container_hc02,
        encrypted_private_key_pem=bundle["private_key_pkcs8_pem"],
        passphrase="StrongPass@2026",
        aad_metadata=aad,
    )
    assert restored == plaintext


def test_all_tamper_detection_scenarios_and_wrong_keys():
    recipient_bundle = CryptoEngine.generate_ecc_keypair("StrongPass@2026")
    attacker_bundle = CryptoEngine.generate_ecc_keypair("AttackerPass@2026")
    plaintext = b"Data Keuangan Rahasia Q4 PT XYZ"
    aad = {"classification": "SECRET", "department": "Finance"}

    valid_container = CryptoEngine.encrypt_document(
        plaintext_bytes=plaintext,
        recipient_public_key_pem=recipient_bundle["public_key_pem"],
        aad_metadata=aad,
    )

    # 1. Manipulasi Magic Header (byte 0)
    t_header = bytearray(valid_container)
    t_header[0] ^= 0x01
    with pytest.raises(TamperDetectedError):
        CryptoEngine.decrypt_container(bytes(t_header), recipient_bundle["private_key_pkcs8_pem"], "StrongPass@2026", aad)

    # 2. Manipulasi Ephemeral Public Key Q_eph (byte 10)
    t_qeph = bytearray(valid_container)
    t_qeph[10] ^= 0x01
    with pytest.raises(TamperDetectedError):
        CryptoEngine.decrypt_container(bytes(t_qeph), recipient_bundle["private_key_pkcs8_pem"], "StrongPass@2026", aad)

    # 3. Manipulasi Wrapped Session Key C_key (byte 75)
    t_ckey = bytearray(valid_container)
    t_ckey[75] ^= 0x01
    with pytest.raises(TamperDetectedError):
        CryptoEngine.decrypt_container(bytes(t_ckey), recipient_bundle["private_key_pkcs8_pem"], "StrongPass@2026", aad)

    # 4. Manipulasi IV/Nonce AES-GCM (byte 105)
    t_iv = bytearray(valid_container)
    t_iv[105] ^= 0x01
    with pytest.raises(TamperDetectedError):
        CryptoEngine.decrypt_container(bytes(t_iv), recipient_bundle["private_key_pkcs8_pem"], "StrongPass@2026", aad)

    # 5. Manipulasi Authentication Tag GCM (byte 120)
    t_tag = bytearray(valid_container)
    t_tag[120] ^= 0x01
    with pytest.raises(TamperDetectedError):
        CryptoEngine.decrypt_container(bytes(t_tag), recipient_bundle["private_key_pkcs8_pem"], "StrongPass@2026", aad)

    # 6. Manipulasi Ciphertext Payload (byte terakhir)
    t_ct = bytearray(valid_container)
    t_ct[-1] ^= 0x01
    with pytest.raises(TamperDetectedError):
        CryptoEngine.decrypt_container(bytes(t_ct), recipient_bundle["private_key_pkcs8_pem"], "StrongPass@2026", aad)

    # 7. Manipulasi Metadata AAD
    with pytest.raises(TamperDetectedError):
        CryptoEngine.decrypt_container(
            valid_container,
            recipient_bundle["private_key_pkcs8_pem"],
            "StrongPass@2026",
            {"classification": "PUBLIC", "department": "Finance"},
        )

    # 8. Penolakan Kunci Privat Penerima yang Tidak Berwenang
    with pytest.raises(TamperDetectedError):
        CryptoEngine.decrypt_container(
            valid_container,
            attacker_bundle["private_key_pkcs8_pem"],
            "AttackerPass@2026",
            aad,
        )

    # 9. Penolakan Passphrase Kunci Privat yang Salah
    with pytest.raises(ValueError):
        CryptoEngine.decrypt_container(
            valid_container,
            recipient_bundle["private_key_pkcs8_pem"],
            "WrongPassphrase!",
            aad,
        )
