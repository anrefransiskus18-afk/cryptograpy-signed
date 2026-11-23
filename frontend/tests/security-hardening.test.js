import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { sanitizeFilename } from "../src/utils/file.ts";
import { DecryptionService } from "../src/services/DecryptionService.ts";
import { EncryptionService } from "../src/services/EncryptionService.ts";
import { sanitizeLogData } from "../src/utils/logger.ts";

const subtle = webcrypto.subtle;

test("Security: sanitizeFilename prevents path traversal and control character injection", () => {
  assert.equal(sanitizeFilename("../../etc/passwd"), "_._etc_passwd");
  assert.equal(sanitizeFilename("..\\..\\secret.pdf"), "_._secret.pdf");
  assert.equal(sanitizeFilename("report\x00\r\n.pdf"), "report.pdf");
  assert.equal(sanitizeFilename("..."), "download");
  assert.equal(sanitizeFilename(""), "download");
});

test("Security: DecryptionService rejects malformed PEM keys and invalid AAD JSON", async () => {
  const svc = new DecryptionService({
    decrypt: async () => new Blob(["ok"])
  });

  await assert.rejects(
    () =>
      svc.decrypt({
        document_id: 1,
        use_stored_key: false,
        private_key_pkcs8: "NOT_A_VALID_PEM",
        passphrase: "KeyPass@2026!"
      }),
    /Format kunci pribadi PEM tidak valid/
  );

  await assert.rejects(
    () =>
      svc.decrypt({
        document_id: 1,
        use_stored_key: true,
        aad_json: "{invalid-json",
        passphrase: "KeyPass@2026!"
      }),
    /Format metadata AAD JSON tidak valid/
  );
});

test("Security: EncryptionService rejects disallowed executable extensions and empty files", () => {
  const svc = new EncryptionService();
  assert.throws(
    () => svc.validateFile({ name: "payload.exe", size: 128 }),
    /tidak diizinkan/
  );
  assert.throws(
    () => svc.validateFile({ name: "empty.pdf", size: 0 }),
    /kosong/
  );
});

test("Security: Logger redacts sensitive cryptographic and auth fields recursively", () => {
  const redacted = sanitizeLogData({
    private_key_pkcs8: "-----BEGIN PRIVATE KEY-----SECRET",
    passphrase: "my-secret-passphrase",
    jwt_token: "eyJhbGciOiJIUzI1NiJ9.payload.sig",
    nested: {
      plaintext: "confidential-text"
    }
  });
  const serialized = JSON.stringify(redacted);
  assert.equal(serialized.includes("SECRET"), false);
  assert.equal(serialized.includes("my-secret-passphrase"), false);
  assert.equal(serialized.includes("eyJhbGciOiJIUzI1NiJ9"), false);
  assert.equal(serialized.includes("confidential-text"), false);
});

test("Security: WebCrypto rejects invalid key lengths, empty IVs, and concurrent tampered payloads", async () => {
  // Invalid AES key length (12 bytes instead of 16/24/32)
  await assert.rejects(() =>
    subtle.importKey("raw", new Uint8Array(12), { name: "AES-GCM" }, false, ["encrypt"])
  );

  const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);

  // Empty IV must be rejected by WebCrypto AES-GCM
  await assert.rejects(() =>
    subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(0) }, key, new Uint8Array([1, 2, 3]))
  );

  // Concurrent AES-256-GCM operations maintain isolation and reject tampered ciphertext
  const ops = Array.from({ length: 8 }, async (_, idx) => {
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const pt = new TextEncoder().encode(`concurrent-msg-${idx}`);
    const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, pt));
    const dec = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
    assert.deepEqual(dec, pt);

    const bad = new Uint8Array(ct);
    bad[bad.length - 1] ^= 0xff;
    await assert.rejects(() => subtle.decrypt({ name: "AES-GCM", iv }, key, bad));
  });
  await Promise.all(ops);
});
