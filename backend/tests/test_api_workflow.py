import io
import json
import uuid
import pytest
from app import create_app, init_database_and_seed


@pytest.fixture(scope="module")
def client():
    init_database_and_seed()
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_full_api_workflow(client):
    # 1. Uji Login Gagal
    bad_login = client.post("/api/auth/login", json={
        "username": "admin.security",
        "password": "WrongPassword123!"
    })
    assert bad_login.status_code == 401

    # 2. Login berhasil dengan akun Chief Security Engineer
    login_res = client.post("/api/auth/login", json={
        "username": "admin.security",
        "password": "Admin@2026!"
    })
    assert login_res.status_code == 200
    token = login_res.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Verifikasi profil /api/auth/me dan /api/dashboard
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.get_json()["username"] == "admin.security"

    dash_res = client.get("/api/dashboard", headers=headers)
    assert dash_res.status_code == 200
    assert "metrics" in dash_res.get_json()

    # 4. Generate pasangan kunci ECC NIST P-256 baru
    gen_res = client.post("/api/keys/generate", json={
        "passphrase": "MySecretKeyPass@2026"
    }, headers=headers)
    assert gen_res.status_code == 200
    key_data = gen_res.get_json()
    key_id = key_data["key_id"]
    private_key_pkcs8 = key_data["private_key_pkcs8_pem"]

    # Validasi kepemilikan kunci
    ver_res = client.post("/api/keys/verify", json={
        "private_key_pkcs8_pem": private_key_pkcs8,
        "passphrase": "MySecretKeyPass@2026"
    }, headers=headers)
    assert ver_res.status_code == 200
    assert ver_res.get_json()["is_valid"] is True

    # 5. Enkripsi dokumen menggunakan kunci publik penerima
    aad_str = json.dumps({"classification": "TOP_SECRET", "origin_department": "Cybersecurity"})
    plaintext_content = b"Rahasia Negara & Dokumen Arsitektur Kriptografi Hybrid 2026"
    enc_res = client.post(
        "/api/documents/encrypt",
        data={
            "document": (io.BytesIO(plaintext_content), "blueprint.pdf"),
            "recipient_key_id": str(key_id),
            "aad_json": aad_str
        },
        headers=headers,
        content_type="multipart/form-data"
    )
    assert enc_res.status_code == 200
    assert enc_res.headers.get("X-Container-Header") == "HC01"
    doc_id = int(enc_res.headers.get("X-Document-Id"))
    enc_bytes = enc_res.data
    assert len(enc_bytes) == 129 + len(plaintext_content)

    # 6. Periksa repositori dokumen (/api/documents dan /api/documents/{id})
    docs_res = client.get("/api/documents", headers=headers)
    assert docs_res.status_code == 200
    assert docs_res.get_json()["total"] >= 1

    doc_detail = client.get(f"/api/documents/{doc_id}", headers=headers)
    assert doc_detail.status_code == 200
    assert doc_detail.get_json()["original_filename"] == "blueprint.pdf"

    # 7. Dekripsi dokumen kembali dan verifikasi keaslian
    dec_res = client.post(
        "/api/documents/decrypt",
        data={
            "enc_file": (io.BytesIO(enc_bytes), "blueprint.pdf.enc"),
            "private_key_pkcs8": private_key_pkcs8,
            "passphrase": "MySecretKeyPass@2026",
            "aad_json": aad_str,
            "original_filename": "blueprint.pdf"
        },
        headers=headers,
        content_type="multipart/form-data"
    )
    assert dec_res.status_code == 200
    assert dec_res.headers.get("X-GCM-Auth-Status") == "VERIFIED"
    assert dec_res.data == plaintext_content

    # 8. Uji Tamper Detection (modifikasi 1-bit pada kontainer .enc)
    tampered = bytearray(enc_bytes)
    tampered[-1] ^= 0x01
    tamper_res = client.post(
        "/api/documents/decrypt",
        data={
            "enc_file": (io.BytesIO(bytes(tampered)), "blueprint.pdf.enc"),
            "private_key_pkcs8": private_key_pkcs8,
            "passphrase": "MySecretKeyPass@2026",
            "aad_json": aad_str,
            "original_filename": "blueprint.pdf"
        },
        headers=headers,
        content_type="multipart/form-data"
    )
    assert tamper_res.status_code == 422
    assert tamper_res.get_json()["detail"]["error_code"] == "TAMPER_DETECTED"

    # 9. Uji RBAC & Otorisasi Penerima dengan akun Staff Operasional
    staff_login = client.post("/api/auth/login", json={
        "username": "staf.operasional",
        "password": "Admin@2026!"
    })
    assert staff_login.status_code == 200
    staff_token = staff_login.get_json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    # Staff tidak boleh membuat pengguna baru (RBAC 403)
    forbidden_create = client.post("/api/users", json={
        "username": "illegal.user",
        "email": "illegal@enterprise.co.id",
        "full_name": "Illegal User",
        "department": "IT",
        "role": "STAFF",
        "password": "Password@2026!"
    }, headers=staff_headers)
    assert forbidden_create.status_code == 403

    # Staff tidak boleh mengunduh/mendekripsi dokumen milik admin yang tidak ditujukan kepadanya (RBAC 403)
    forbidden_dl = client.get(f"/api/documents/{doc_id}/download", headers=staff_headers)
    assert forbidden_dl.status_code == 403

    # 10. Uji pengelolaan pengguna oleh Administrator (Tambah, Edit, Nonaktifkan)
    unique_uname = f"test.user.{uuid.uuid4().hex[:6]}"
    create_u = client.post("/api/users", json={
        "username": unique_uname,
        "email": f"{unique_uname}@enterprise.co.id",
        "full_name": "Karyawan Uji Otomatis",
        "department": "Internal Audit",
        "role": "AUTHORIZED_RECIPIENT",
        "password": "UserPass@2026!"
    }, headers=headers)
    assert create_u.status_code == 201
    new_uid = create_u.get_json()["id"]

    update_u = client.put(f"/api/users/{new_uid}", json={
        "department": "Corporate Legal & Compliance"
    }, headers=headers)
    assert update_u.status_code == 200
    assert update_u.get_json()["user"]["department"] == "Corporate Legal & Compliance"

    del_u = client.delete(f"/api/users/{new_uid}", headers=headers)
    assert del_u.status_code == 200

    # Pulihkan kembali akun yang telah dicabut aksesnya (restore soft-deleted user + auto-regenerasi kunci ECC)
    restore_u = client.put(f"/api/users/{new_uid}", json={
        "is_active": True
    }, headers=headers)
    assert restore_u.status_code == 200
    restored_data = restore_u.get_json()["user"]
    assert restored_data["is_active"] is True
    assert restored_data["deleted_at"] is None
    assert bool(restored_data["key_fingerprint"]) is True

    # 11. Uji pembaruan profil mandiri (PUT /api/v1/me)
    me_upd = client.put("/api/v1/me", json={
        "full_name": "Anre Franciscus, CISO",
        "department": "Executive Cybersecurity"
    }, headers=headers)
    assert me_upd.status_code == 200
    assert me_upd.get_json()["full_name"] == "Anre Franciscus, CISO"

    # 12. Uji rotasi kunci ECC dan dekripsi dokumen lama menggunakan riwayat kunci (historical key lookup)
    rot_res = client.post("/api/keys/rotate", json={
        "passphrase": "MySecretKeyPass@2026"
    }, headers=headers)
    assert rot_res.status_code == 200

    hist_dec = client.post(
        "/api/documents/decrypt",
        data={
            "document_id": str(doc_id),
            "use_stored_key": "true",
            "passphrase": "MySecretKeyPass@2026"
        },
        headers=headers,
        content_type="multipart/form-data"
    )
    assert hist_dec.status_code == 200
    assert hist_dec.data == plaintext_content

    # 13. Uji dekripsi unggahan file .enc tanpa mengirim aad_json (pencocokan AAD otomatis dari database)
    auto_aad_dec = client.post(
        "/api/documents/decrypt",
        data={
            "enc_file": (io.BytesIO(enc_bytes), "blueprint.pdf.enc"),
            "use_stored_key": "true",
            "passphrase": "MySecretKeyPass@2026"
        },
        headers=headers,
        content_type="multipart/form-data"
    )
    assert auto_aad_dec.status_code == 200
    assert auto_aad_dec.data == plaintext_content

    # 13b. Regresi keamanan & validasi
    # Klasifikasi tidak dikenal ditolak
    bad_cls = client.post(
        "/api/documents/encrypt",
        data={
            "document": (io.BytesIO(b"isi"), "a.txt"),
            "recipient_key_id": str(rot_res.get_json()["key_id"]),
            "aad_json": json.dumps({"classification": "ABC"}),
        },
        headers=headers,
        content_type="multipart/form-data",
    )
    assert bad_cls.status_code == 400

    # AAD JSON rusak pada dekripsi via document_id -> 400 (bukan 500)
    bad_aad = client.post(
        "/api/documents/decrypt",
        data={"document_id": str(doc_id), "use_stored_key": "true",
              "passphrase": "MySecretKeyPass@2026", "aad_json": "{rusak"},
        headers=headers,
        content_type="multipart/form-data",
    )
    assert bad_aad.status_code == 400

    # Admin tidak boleh menonaktifkan akunnya sendiri
    me_id = client.get("/api/auth/me", headers=headers).get_json()["id"]
    self_off = client.put(f"/api/users/{me_id}", json={"is_active": False}, headers=headers)
    assert self_off.status_code == 400

    # Staff tidak boleh melihat akun yang dicabut walau mengirim include_deleted=true
    staff_list = client.get("/api/users?include_deleted=true", headers=staff_headers).get_json()
    assert all(u["deleted_at"] is None for u in staff_list)

    # Penguncian akun setelah 5x gagal login
    ghost = f"ghost.{uuid.uuid4().hex[:6]}"
    for _ in range(5):
        client.post("/api/auth/login", json={"username": ghost, "password": "SalahSandi123!"})
    locked = client.post("/api/auth/login", json={"username": ghost, "password": "SalahSandi123!"})
    assert locked.status_code == 429

    # Kata sandi kunci pendek ditolak SEBELUM akun dibuat (tidak ada akun tanpa kunci)
    short_uname = f"nokey.{uuid.uuid4().hex[:6]}"
    short_key = client.post("/api/users", json={
        "username": short_uname,
        "email": f"{short_uname}@enterprise.co.id",
        "full_name": "Tanpa Kunci",
        "department": "IT",
        "role": "STAFF",
        "password": "UserPass@2026!",
        "key_passphrase": "pendek",
    }, headers=headers)
    assert short_key.status_code == 400
    assert all(u["username"] != short_uname for u in client.get("/api/users", headers=headers).get_json())

    # Ganti sandi: sandi baru tidak boleh sama dengan sandi lama
    same_pw = client.post("/api/auth/change-password", json={
        "current_password": "Admin@2026!",
        "new_password": "Admin@2026!",
    }, headers=headers)
    assert same_pw.status_code == 400

    # Header keamanan & respons JSON untuk metode yang tidak diizinkan
    assert client.get("/api/auth/me", headers=headers).headers.get("Cache-Control") == "no-store"
    wrong_method = client.delete("/api/auth/login")
    assert wrong_method.status_code == 405
    assert "detail" in wrong_method.get_json()

    # Rantai hash audit tetap utuh: setiap prev_log_hash cocok dengan log sebelumnya
    all_logs = client.get("/api/audit-logs?limit=250", headers=headers).get_json()["logs"]
    ordered = sorted(all_logs, key=lambda l: l["id"])
    from Crypto.Hash import SHA256 as _SHA256
    for prev, cur in zip(ordered, ordered[1:]):
        if cur["id"] != prev["id"] + 1:
            continue  # ada celah akibat batas limit / filter, lewati
        ts = prev["timestamp"].split(".")[0]
        expected = _SHA256.new(f"{prev['id']}|{ts}|{prev['server_signature']}".encode()).hexdigest()
        assert cur["prev_log_hash"] == expected

    # 14. Verifikasi pencatatan Tamper-Proof Audit Log beserta tanda tangan ECDSA server
    audit_res = client.get("/api/audit-logs", headers=headers)
    assert audit_res.status_code == 200
    audit_payload = audit_res.get_json()
    logs = audit_payload["logs"]
    assert len(logs) >= 5
    assert all(item["signature_verified"] is True for item in logs)
    assert any(item["action_type"] == "TAMPER_DETECTED" for item in logs)
