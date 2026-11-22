import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto, randomBytes } from "node:crypto";
import { AadMetadataDTO, EncryptDocumentRequestDTO, DecryptDocumentRequestDTO } from "../src/dto/document.dto.ts";
import { EncryptionService, MAX_UPLOAD_BYTES } from "../src/services/EncryptionService.ts";
import { BaseRepository } from "../src/repositories/BaseRepository.ts";
import { sanitizeLogData } from "../src/utils/logger.ts";
import { ErrorType } from "../src/utils/errors.ts";
import { useFormatters } from "../src/composables/useFormatters.ts";

const subtle = webcrypto.subtle;

test("Cryptography Matrix: AES-256-GCM roundtrip, empty, unicode, binary, large payload, and tamper detection", async () => {
  const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode('{"classification":"SECRET"}');

  // 1. Roundtrip Unicode & Empty & Binary & Large (1 MiB)
  const cases = [
    new Uint8Array(0),
    new TextEncoder().encode("Dokumen Rahasia PT XYZ — 🔐 UTF-8 日本語"),
    new Uint8Array([0x00, 0xff, 0x10, 0x48, 0x43, 0x30, 0x31]),
    new Uint8Array(randomBytes(1024 * 1024))
  ];

  for (const plain of cases) {
    const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, key, plain));
    const dec = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad }, key, ct));
    assert.deepEqual(dec, plain);
  }

  // 2. Modified ciphertext -> Auth tag mismatch
  const samplePlain = new TextEncoder().encode("Sensitive payload");
  const validCt = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, key, samplePlain));
  const tamperedCt = new Uint8Array(validCt);
  tamperedCt[0] ^= 0x01;
  await assert.rejects(() => subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad }, key, tamperedCt));

  // 3. Modified AAD -> Auth tag mismatch
  const wrongAad = new TextEncoder().encode('{"classification":"INTERNAL"}');
  await assert.rejects(() => subtle.decrypt({ name: "AES-GCM", iv, additionalData: wrongAad }, key, validCt));

  // 4. Wrong key -> Auth tag mismatch
  const wrongKey = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  await assert.rejects(() => subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad }, wrongKey, validCt));
});

test("Cryptography Matrix: ECDH NIST P-256 + HKDF-SHA256 + SHA-256 + Key Import/Export", async () => {
  const alice = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const bob = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);

  const exportedPub = await subtle.exportKey("spki", bob.publicKey);
  const importedBobPub = await subtle.importKey("spki", exportedPub, { name: "ECDH", namedCurve: "P-256" }, true, []);

  const sharedA = await subtle.deriveBits({ name: "ECDH", public: importedBobPub }, alice.privateKey, 256);
  const sharedB = await subtle.deriveBits({ name: "ECDH", public: alice.publicKey }, bob.privateKey, 256);
  assert.deepEqual(new Uint8Array(sharedA), new Uint8Array(sharedB));

  // HKDF-SHA256 deterministic key derivation
  const hkdfKey = await subtle.importKey("raw", sharedA, "HKDF", false, ["deriveBits"]);
  const salt = await subtle.digest("SHA-256", new Uint8Array(exportedPub));
  const info = new TextEncoder().encode("HYBRID-CRYPTO-FRAMEWORK-ECDH-AES256GCM-V1");
  const k1 = await subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, hkdfKey, 256);
  const k2 = await subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, hkdfKey, 256);
  assert.deepEqual(new Uint8Array(k1), new Uint8Array(k2));

  // Official NIST SHA-256 test vector for "abc"
  const abcHash = Buffer.from(await subtle.digest("SHA-256", new TextEncoder().encode("abc"))).toString("hex");
  assert.equal(abcHash, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("Cryptography KAT: NIST SP 800-38D AES-256-GCM & RFC 5869 HKDF-SHA256 known-answer vectors", async () => {
  // 1. NIST SP 800-38D Test Case 13: 256-bit zero key, 96-bit zero IV, empty plaintext & AAD -> exact 128-bit auth tag
  const zeroKeyBytes = new Uint8Array(32);
  const zeroIv = new Uint8Array(12);
  const aesKey = await subtle.importKey("raw", zeroKeyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  const tagOnly = Buffer.from(
    await subtle.encrypt({ name: "AES-GCM", iv: zeroIv }, aesKey, new Uint8Array(0))
  ).toString("hex");
  assert.equal(tagOnly, "530f8afbc74536b9a963b4f1c4cb738b");

  // Adversarial: truncated ciphertext (< 16-byte tag) must fail
  await assert.rejects(() =>
    subtle.decrypt({ name: "AES-GCM", iv: zeroIv }, aesKey, new Uint8Array(15))
  );

  // 2. RFC 5869 Appendix A.1 Test Case 1 (HKDF-SHA256)
  const ikm = new Uint8Array(22).fill(0x0b);
  const salt = Uint8Array.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c]);
  const info = Uint8Array.from([0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9]);
  const hkdfKey = await subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const okm = Buffer.from(
    await subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, hkdfKey, 42 * 8)
  ).toString("hex");
  assert.equal(
    okm,
    "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865"
  );
});

test("AadMetadataDTO produces deterministic JSON string", () => {
  const aad = new AadMetadataDTO({
    classification: "SECRET",
    origin_department: "Keuangan",
    document_version: "2.0"
  });
  assert.equal(
    aad.toJSONString(),
    '{"classification":"SECRET","origin_department":"Keuangan","document_version":"2.0"}'
  );
});

test("EncryptionService enforces exact 125 MiB boundary", () => {
  const svc = new EncryptionService({});
  const atLimit = { name: "exact.pdf", size: MAX_UPLOAD_BYTES };
  assert.equal(svc.validateFile(atLimit), atLimit);

  const overLimit = { name: "over.pdf", size: MAX_UPLOAD_BYTES + 1 };
  assert.throws(() => svc.validateFile(overLimit), (e) => e.type === ErrorType.VALIDATION);
});

test("EncryptDocumentRequestDTO and DecryptDocumentRequestDTO preserve wrap_mode and optional filename", () => {
  const enc = new EncryptDocumentRequestDTO({
    recipient_key_id: 7,
    wrap_mode: "AES_GCM_KW"
  });
  assert.equal(enc.wrap_mode, "AES_GCM_KW");
  assert.equal(enc.recipient_key_id, 7);

  const dec = new DecryptDocumentRequestDTO({ document_id: 12, use_stored_key: true });
  assert.equal(dec.original_filename, "");
  const fd = dec.toFormData();
  assert.equal(fd.get("original_filename"), null);
  assert.equal(fd.get("document_id"), "12");
});

test("BaseRepository deduplicates simultaneous identical GET requests", async () => {
  let networkCalls = 0;
  const mockClient = {
    get: async () => {
      networkCalls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return { data: { items: [1, 2, 3] } };
    }
  };
  const repo = new BaseRepository(mockClient);
  const [a, b] = await Promise.all([
    repo.get("/documents", { params: { page: 1 } }),
    repo.get("/documents", { params: { page: 1 } })
  ]);
  assert.equal(networkCalls, 1);
  assert.deepEqual(a, b);
});

test("Logger sanitizes private keys, passphrases, tokens, and plaintext", () => {
  const sanitized = sanitizeLogData({
    password: "SecretPassword!",
    passphrase: "KeyPassphrase!",
    authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.abc.def",
    private_key_pkcs8: "-----BEGIN ENCRYPTED PRIVATE KEY-----\nMII...\n-----END ENCRYPTED PRIVATE KEY-----",
    nested: {
      plaintext: "rahasia perusahaan",
      safeField: "ok"
    }
  });

  assert.equal(sanitized.password, "[REDACTED]");
  assert.equal(sanitized.passphrase, "[REDACTED]");
  assert.equal(sanitized.authorization, "[REDACTED]");
  assert.equal(sanitizeLogData("Bearer eyJhbGciOiJIUzI1NiJ9.abc.def"), "Bearer [REDACTED]");
  assert.equal(sanitized.private_key_pkcs8, "[REDACTED]");
  assert.equal(sanitized.nested.plaintext, "[REDACTED]");
  assert.equal(sanitized.nested.safeField, "ok");
});

test("useFormatters formats bytes, roles, classifications, actions, and statuses", () => {
  const { formatBytes, formatRole, formatClassification, formatAction, formatStatus, debounce } = useFormatters();
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(1024 * 1024), "1 MB");
  assert.equal(formatRole("SECURITY_ADMIN"), "Admin Keamanan");
  assert.equal(formatClassification("TOP_SECRET"), "Sangat Rahasia");
  assert.equal(formatAction("TAMPER_DETECTED"), "File Rusak / Diubah Pihak Lain");
  assert.equal(formatStatus("SUCCESS"), "Berhasil");

  let called = 0;
  const fn = debounce(() => { called += 1; }, 50);
  fn();
  fn.cancel();
  assert.equal(called, 0);
});

test("sanitizeCsvCell neutralizes spreadsheet formula injection (CWE-1236)", async () => {
  const { sanitizeCsvCell } = await import("../src/utils/file.ts");
  assert.equal(sanitizeCsvCell("=CMD('calc')"), "\"'=CMD('calc')\"");
  assert.equal(sanitizeCsvCell("+1+1"), "\"'+1+1\"");
  assert.equal(sanitizeCsvCell("-2+3"), "\"'-2+3\"");
  assert.equal(sanitizeCsvCell("@SUM(A1)"), "\"'@SUM(A1)\"");
  assert.equal(sanitizeCsvCell("normal \"text\""), "\"normal \"\"text\"\"\"");
});

test("DEMO_MODE defaults to false when DEV is falsy and VITE_SHOW_DEMO_ACCOUNTS is unset", async () => {
  const { DEMO_MODE, DEMO_PASSWORD } = await import("../src/config/demo.ts");
  assert.equal(DEMO_MODE, false);
  assert.equal(DEMO_PASSWORD, "");
});

test("i18n translates Indonesian and English keys with interpolation and fallback", async () => {
  const { setLocale, t, locale } = await import("../src/i18n/index.ts");
  setLocale("id");
  assert.equal(locale.value, "id");
  assert.equal(t("nav.dashboard"), "Beranda");
  assert.equal(t("login.welcomeToast", { name: "Budi" }), "Selamat datang, Budi.");

  setLocale("en");
  assert.equal(locale.value, "en");
  assert.equal(t("nav.dashboard"), "Dashboard");
  assert.equal(t("login.welcomeToast", { name: "Budi" }), "Welcome back, Budi.");
  assert.equal(t("missing.unknown.key"), "missing.unknown.key");

  setLocale("id");
});

test("Typed error classes preserve ErrorType semantics", async () => {
  const {
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    TimeoutError,
    CryptographyError,
    normalizeApiError
  } = await import("../src/utils/errors.ts");

  const vErr = new ValidationError("invalid");
  assert.equal(vErr.type, ErrorType.VALIDATION);
  const tErr = normalizeApiError({ code: "ECONNABORTED" });
  assert.ok(tErr instanceof TimeoutError);
  const authErr = normalizeApiError({ response: { status: 401, data: { detail: "expired" } } });
  assert.ok(authErr instanceof AuthenticationError);
  const authzErr = normalizeApiError({ response: { status: 403, data: { detail: "denied" } } });
  assert.ok(authzErr instanceof AuthorizationError);
  const cryptoErr = normalizeApiError({ response: { status: 422, data: { detail: { error_code: "TAMPER_DETECTED" } } } });
  assert.ok(cryptoErr instanceof CryptographyError);
});

test("useTheme and usePermissions behave predictably", async () => {
  const { setTheme, toggleTheme, useTheme } = await import("../src/composables/useTheme.ts");
  const { isDark } = useTheme();
  setTheme("dark");
  assert.equal(isDark.value, true);
  toggleTheme();
  assert.equal(isDark.value, false);

  const { usePermissions } = await import("../src/composables/usePermissions.ts");
  const perms = usePermissions(() => ({
    isAdmin: false,
    user: { id: 5, role: "EXECUTIVE", clearance_level: 3 }
  }));
  assert.equal(perms.canVerifyAuditChain.value, true);
  assert.equal(perms.canDeleteDocument({ sender_id: 5 }), true);
  assert.equal(perms.canDeleteDocument({ sender_id: 9 }), false);
  assert.equal(perms.hasClearance(3), true);
  assert.equal(perms.hasClearance(4), false);
});
