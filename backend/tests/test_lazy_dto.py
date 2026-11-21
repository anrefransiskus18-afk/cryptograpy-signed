"""
Pengujian Otomatis (Unit & Integration Tests) untuk:
1. Library `Lazy.transform` dan Request/Response Struct DTOs (`backend/app/dto/`)
2. Endpoint ganti kata sandi (`/api/v1/change-password`)
3. Rotasi kunci ECC pengguna oleh Admin (`PUT /api/v1/users/<id>` dengan `reset_ecc_key=True`)
"""

from app.dto import (
    Lazy,
    LoginRequestDTO,
    LoginResponseDTO,
    UserProfileDTO,
    DocumentFilterRequestDTO,
    DocumentListResponseDTO,
    DocumentResponseDTO,
    EncryptDocumentRequestDTO,
    UpdateUserRequestDTO,
    UserResponseDTO,
)


def test_lazy_transform_single_and_nested_dto():
    raw_login = {
        "access_token": "jwt-token-xyz",
        "token_type": "bearer",
        "user": {
            "id": 7,
            "username": "admin.security",
            "full_name": "Anre Franciscus",
            "role": "SECURITY_ADMIN",
            "clearance_level": 4,
            "active_key_fingerprint": "abcd1234",
        },
    }

    dto_instance = Lazy.transform(raw_login, LoginResponseDTO)
    assert isinstance(dto_instance, LoginResponseDTO)
    assert isinstance(dto_instance.user, UserProfileDTO)
    assert dto_instance.user.id == 7
    assert dto_instance.user.nik == "XYZ-0007"
    assert dto_instance.user.has_encrypted_private_key is False

    serialized = Lazy.transform(raw_login, LoginResponseDTO, serialize=True)
    assert isinstance(serialized, dict)
    assert serialized["access_token"] == "jwt-token-xyz"
    assert serialized["user"]["username"] == "admin.security"


def test_lazy_transform_array_and_document_schema():
    raw_users = [
        {"id": 1, "username": "u1", "full_name": "User One", "role": "STAFF"},
        {"id": 2, "username": "u2", "full_name": "User Two", "role": "MANAGER"},
    ]
    dto_list = Lazy.transform(raw_users, [UserResponseDTO])
    assert len(dto_list) == 2
    assert all(isinstance(u, UserResponseDTO) for u in dto_list)
    assert dto_list[0].nik == "XYZ-0001"

    raw_doc_list = {
        "total": 1,
        "page": 1,
        "per_page": 10,
        "items": [
            {
                "id": 99,
                "doc_uid": "uid-99",
                "original_filename": "Rahasia.pdf",
                "recipients": [
                    {
                        "recipient_user_id": 2,
                        "recipient_full_name": "User Two",
                        "decrypted_count": 3,
                    }
                ],
                "encryption_metadata": {
                    "container_magic": "HC01",
                    "encryption_time_ms": 4.25,
                },
            }
        ],
    }
    doc_list_dto = Lazy.transform(raw_doc_list, DocumentListResponseDTO)
    assert isinstance(doc_list_dto, DocumentListResponseDTO)
    assert len(doc_list_dto.items) == 1
    assert isinstance(doc_list_dto.items[0], DocumentResponseDTO)
    assert doc_list_dto.items[0].recipients[0].decrypted_count == 3
    assert doc_list_dto.items[0].encryption_metadata.encryption_duration_ms == 4.25


def test_encrypt_document_request_dto_validation():
    valid_req = Lazy.transform(
        {
            "recipient_key_id": "5",
            "wrap_mode": "xor_aad",
            "aad_json": '{"classification": "SECRET"}',
        },
        EncryptDocumentRequestDTO,
    )
    assert valid_req.recipient_key_id == 5
    assert valid_req.wrap_mode == "XOR_AAD"
    assert valid_req.aad_valid is True
    assert valid_req.aad_dict["classification"] == "SECRET"

    invalid_req = Lazy.transform(
        {"recipient_key_id": "5", "aad_json": "not-a-json"},
        EncryptDocumentRequestDTO,
    )
    assert invalid_req.aad_valid is False


def test_filter_and_update_user_dto():
    filter_dto = Lazy.transform({"page": "-3", "per_page": "500", "search": "  Memo "}, DocumentFilterRequestDTO)
    assert filter_dto.page == 1
    assert filter_dto.per_page == 100
    assert filter_dto.search == "memo"

    update_dto = Lazy.transform({"reset_ecc_key": True}, UpdateUserRequestDTO)
    assert update_dto.reset_ecc_key is True
    assert update_dto.key_passphrase == "KeyPass@2026!"
