import test from "node:test";
import assert from "node:assert/strict";
import { EncryptionService } from "../src/services/EncryptionService.ts";
import { DecryptionService } from "../src/services/DecryptionService.ts";
import { CryptoService } from "../src/services/CryptoService.ts";
import { KeyService } from "../src/services/KeyService.ts";
import { AuthService } from "../src/services/AuthService.ts";
import { AuditService } from "../src/services/AuditService.ts";
import { DocumentService } from "../src/services/DocumentService.ts";
import { UserService } from "../src/services/UserService.ts";
import { DashboardService } from "../src/services/DashboardService.ts";
import { SettingsService } from "../src/services/SettingsService.ts";
import { flipLastBitInContainer } from "../src/utils/crypto/tamperSimulator.ts";
import { ErrorType } from "../src/utils/errors.ts";

function withMockedBrowserDownload(fn) {
  const origWindow = globalThis.window;
  const origDocument = globalThis.document;
  const downloads = [];
  globalThis.window = {
    URL: {
      createObjectURL: () => "blob:mock",
      revokeObjectURL: () => {}
    }
  };
  globalThis.document = {
    createElement: () => ({
      setAttribute: (k, v) => {
        if (k === "download") downloads.push(v);
      },
      click: () => {},
      remove: () => {}
    }),
    body: { appendChild: () => {} }
  };
  return Promise.resolve()
    .then(() => fn(downloads))
    .finally(() => {
      globalThis.window = origWindow;
      globalThis.document = origDocument;
    });
}

test("EncryptionService validates files, clearance, sample doc, and orchestrates encrypt", async () => {
  const mockRepo = {
    encrypt: async (reqStruct, onUploadProgress) => {
      onUploadProgress({ loaded: 50, total: 100 });
      return {
        data: new Uint8Array([0x48, 0x43, 0x30, 0x31]),
        headers: { "x-document-id": "42", "x-encryption-time-ms": "9.5" }
      };
    }
  };
  const svc = new EncryptionService(mockRepo);

  assert.throws(() => svc.validateFile(null), (e) => e.type === ErrorType.VALIDATION);
  assert.throws(() => svc.validateFile({ name: "a.pdf", size: 0 }), (e) => e.type === ErrorType.VALIDATION);
  assert.throws(() => svc.validateFile({ name: "malware.exe", size: 100 }), (e) => e.type === ErrorType.VALIDATION);

  assert.match(
    svc.getClearanceMismatchMessage({ full_name: "Budi", clearance_level: 1 }, "TOP_SECRET"),
    /Level 4/
  );
  assert.equal(svc.createSampleDocument().name, "Memo_Akuisisi_Strategis_2026.txt");

  await withMockedBrowserDownload(async (downloads) => {
    let progress = 0;
    const res = await svc.encrypt(
      {
        document: new File(["hello"], "secret.txt", { type: "text/plain" }),
        recipient_key_id: 3
      },
      (p) => {
        progress = p;
      }
    );
    assert.equal(progress, 50);
    assert.equal(res.docId, 42);
    assert.equal(res.filename, "secret.txt.enc");
    assert.deepEqual(downloads, ["secret.txt.enc"]);
  });
});

test("DecryptionService sorts recipient documents, validates inputs, flips bit, and decrypts", async () => {
  const mockRepo = {
    decrypt: async () => new Blob(["restored"], { type: "text/plain" })
  };
  const svc = new DecryptionService(mockRepo);
  const docs = [
    { id: 1, recipients: [{ recipient_user_id: 9 }] },
    { id: 2, recipients: [{ recipient_user_id: 5 }] }
  ];
  assert.equal(svc.sortDocumentsForUser(docs, 5)[0].id, 2);

  await assert.rejects(() => svc.decrypt({}), (e) => e.type === ErrorType.VALIDATION);
  await assert.rejects(
    () => svc.decrypt({ document_id: 1, use_stored_key: true, passphrase: "" }),
    (e) => e.type === ErrorType.VALIDATION
  );

  const sampleFile = new File([new Uint8Array([0x48, 0x43, 0x30, 0x31, 0xaa])], "doc.pdf.enc");
  assert.equal(svc.validateEncFile(sampleFile), sampleFile);
  assert.throws(() => svc.validateEncFile(null), (e) => e.type === ErrorType.VALIDATION);
  assert.throws(
    () => svc.validateEncFile({ name: "huge.enc", size: 126 * 1024 * 1024 }),
    (e) => e.type === ErrorType.VALIDATION
  );
  await assert.rejects(
    () => svc.decrypt({ document_id: 1, use_stored_key: false, private_key_pkcs8: "" }),
    (e) => e.type === ErrorType.VALIDATION
  );
  const tamperedFile = await flipLastBitInContainer(sampleFile);
  assert.equal(tamperedFile.name, "RUSAK_doc.pdf.enc");
  assert.equal(new Uint8Array(await tamperedFile.arrayBuffer())[4], 0xaa ^ 0x01);

  await withMockedBrowserDownload(async (downloads) => {
    const res = await svc.decrypt({
      document_id: 1,
      use_stored_key: true,
      passphrase: "Pass1234!",
      original_filename: "laporan.pdf"
    });
    assert.equal(res.filename, "laporan.pdf");
    assert.deepEqual(downloads, ["laporan.pdf"]);
  });
});

test("CryptoService orchestrates encryption config, encrypt, and decrypt", async () => {
  const svc = new CryptoService(
    { encrypt: async (p) => ({ ok: "enc", p }) },
    { decrypt: async (p) => ({ ok: "dec", p }) },
    { listPublicKeys: async () => [{ key_id: 1 }] },
    { getSettings: async () => ({ default_key_wrap_mode: "HC01" }) }
  );
  const cfg = await svc.loadEncryptionConfig();
  assert.equal(cfg.recipientKeys.length, 1);
  assert.equal(cfg.settings.default_key_wrap_mode, "HC01");
  assert.equal((await svc.encrypt({ a: 1 })).ok, "enc");
  assert.equal((await svc.decrypt({ b: 2 })).ok, "dec");
});

test("KeyService validates passphrase, loads page data, and delegates rotation", async () => {
  let storedPem = "";
  let fetchedProfile = false;
  const mockRepo = {
    getMyKey: async () => ({ fingerprint: "fp", encrypted_private_key_pem: "BACKUP_PEM" }),
    listPublicKeys: async () => [{ key_id: 1 }],
    rotate: async () => ({ private_key_pkcs8_pem: "PEM_DATA", fingerprint: "fp123" }),
    verify: async () => ({ is_valid: true })
  };
  const mockStore = () => ({
    localPrivateKeyPem: "",
    setLocalPrivateKey: (pem) => {
      storedPem = pem;
    }
  });
  const mockAuthSvc = {
    fetchProfile: async () => {
      fetchedProfile = true;
    }
  };

  const svc = new KeyService(mockRepo, mockStore, mockAuthSvc);
  assert.equal((await svc.listPublicKeys()).length, 1);
  assert.equal((await svc.getMyKey()).fingerprint, "fp");
  const pageData = await svc.loadKeyPageData();
  assert.equal(pageData.localPrivateKeyPem, "BACKUP_PEM");
  await withMockedBrowserDownload(async (downloads) => {
    svc.downloadPublicKey("PUB_PEM", "abcdef123456");
    svc.downloadPrivateKey("PRIV_PEM", "abcdef123456");
    assert.deepEqual(downloads, ["kunci_publik_abcdef1234.pem", "kunci_pribadi_abcdef1234.pem"]);
  });

  await assert.rejects(
    () => svc.generateOrRotateKey({ passphrase: "short" }, true),
    (e) => e.type === ErrorType.VALIDATION
  );

  const res = await svc.generateOrRotateKey({ passphrase: "StrongPass123!" }, true);
  assert.equal(res.fingerprint, "fp123");
  assert.equal(storedPem, "PEM_DATA");
  assert.equal(fetchedProfile, true);
  assert.equal((await svc.verifyOwnership({ passphrase: "StrongPass123!" })).is_valid, true);
});

test("AuthService handles login, logout, profile update, and password change", async () => {
  let session = null;
  let cleared = false;
  const mockRepo = {
    login: async () => ({ access_token: "jwt-1", user: { id: 1, username: "admin" } }),
    logout: async () => {},
    getMe: async () => ({ id: 1, full_name: "Admin" }),
    updateMe: async (p) => ({ id: 1, ...p }),
    changePassword: async () => ({ relogin_required: true })
  };
  const mockStore = () => ({
    token: session?.access_token || "jwt-1",
    setSession: (t, u) => {
      session = { access_token: t, user: u };
    },
    setUser: (u) => u,
    clearSession: () => {
      cleared = true;
    }
  });

  const svc = new AuthService(mockRepo, mockStore);
  await assert.rejects(() => svc.login("", ""), (e) => e.type === ErrorType.VALIDATION);
  const loginRes = await svc.login("admin", "Secret123!");
  assert.equal(loginRes.access_token, "jwt-1");
  assert.equal((await svc.fetchProfile()).full_name, "Admin");
  assert.equal((await svc.updateProfile({ full_name: "New" })).full_name, "New");

  await assert.rejects(
    () => svc.changePassword({ new_password: "ValidPassword1" }, "Mismatch1"),
    (e) => e.type === ErrorType.VALIDATION
  );
  const res = await svc.changePassword({ new_password: "ValidPassword1" }, "ValidPassword1");
  assert.equal(res.relogin_required, true);
  assert.equal(cleared, true);
});

test("DocumentService, UserService, DashboardService, SettingsService, and AuditService delegate properly", async () => {
  const docSvc = new DocumentService({
    list: async () => ({ items: [{ id: 1 }] }),
    getById: async (id) => ({ id }),
    downloadEncryptedBlob: async () => new Blob(["enc"]),
    remove: async (id) => ({ deleted: id })
  });
  assert.equal((await docSvc.list()).items.length, 1);
  assert.equal((await docSvc.getById(7)).id, 7);
  assert.equal((await docSvc.remove(7)).deleted, 7);
  await withMockedBrowserDownload(async (downloads) => {
    const fn = await docSvc.downloadEncrypted({ id: 7, original_filename: "a.pdf" });
    assert.equal(fn, "a.pdf.enc");
    assert.deepEqual(downloads, ["a.pdf.enc"]);
  });

  const userUpdates = [];
  const userSvc = new UserService({
    list: async () => [{ id: 1 }],
    create: async (p) => p,
    update: async (id, p) => {
      userUpdates.push({ id, p });
      return { id, ...p };
    },
    remove: async (id) => ({ id })
  });
  await userSvc.list();
  await userSvc.create({ username: "new" });
  await userSvc.update(3, { full_name: "New" });
  await userSvc.toggleActive({ id: 3, is_active: true });
  await userSvc.rotateOrRestoreKey(3, "KeyPass123!", "restore");
  await userSvc.rotateOrRestoreKey(3, "KeyPass123!", "rotate");
  await userSvc.remove(3);
  assert.equal(userUpdates[1].p.is_active, false);
  assert.equal(userUpdates[2].p.is_active, true);
  assert.equal(userUpdates[2].p.key_passphrase, "KeyPass123!");
  assert.equal(userUpdates[3].p.reset_ecc_key, true);

  const dashSvc = new DashboardService(
    { getStats: async () => ({ metrics: { total_users: 5 } }) },
    { list: async () => ({ items: [{ id: 10 }] }) }
  );
  const dash = await dashSvc.loadDashboardData();
  assert.equal(dash.stats.metrics.total_users, 5);
  assert.equal(dash.recentDocs[0].id, 10);

  const settingsSvc = new SettingsService({
    getSettings: async () => ({ jwt_expiration_minutes: 120 }),
    getBenchmarks: async () => ({ performance_results: [] }),
    updateSettings: async (p) => p
  });
  assert.equal((await settingsSvc.loadSettingsPageData()).settings.jwt_expiration_minutes, 120);
  assert.equal((await settingsSvc.updateSettings({ jwt_expiration_minutes: 60 })).jwt_expiration_minutes, 60);

  const auditSvc = new AuditService({
    listAuditLogs: async () => ({ logs: [{ id: 1, action_type: "ENCRYPTION" }] }),
    listAuthLogs: async () => [{ id: 2, event_type: "LOGIN_SUCCESS" }],
    verifyChain: async () => ({ valid: true, checked: 10, total: 10 })
  });
  const loaded = await auditSvc.loadAllLogs({}, 50);
  assert.equal(loaded.auditLogs.length, 1);
  assert.equal((await auditSvc.verifyChain()).valid, true);
  await withMockedBrowserDownload(async (downloads) => {
    const msg = auditSvc.exportLogsToCsv("crypto", loaded.auditLogs, loaded.authLogs);
    const msgAuth = auditSvc.exportLogsToCsv("auth", loaded.auditLogs, loaded.authLogs);
    assert.match(msg, /CSV/);
    assert.match(msgAuth, /login/i);
    assert.match(downloads[0], /^riwayat_aktivitas_.*\.csv$/);
    assert.match(downloads[1], /^riwayat_login_.*\.csv$/);
  });
});
