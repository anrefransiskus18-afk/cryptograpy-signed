import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { computeSha256Hex } from "../src/utils/crypto/hashWorker.ts";

const subtle = webcrypto.subtle;

test("Cryptography: ECDSA P-256 SHA-256 signature verification, tampering, and wrong-key rejection", async () => {
  const pairA = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pairB = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);

  const message = new TextEncoder().encode("audit-log-entry-1|prev_hash=0000|action=ENCRYPT");
  const signature = new Uint8Array(
    await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pairA.privateKey, message)
  );

  // Valid signature
  const valid = await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pairA.publicKey, signature, message);
  assert.equal(valid, true);

  // Modified message must fail
  const tamperedMsg = new Uint8Array(message);
  tamperedMsg[0] ^= 0x01;
  const badMsg = await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pairA.publicKey, signature, tamperedMsg);
  assert.equal(badMsg, false);

  // Wrong public key must fail
  const wrongKey = await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pairB.publicKey, signature, message);
  assert.equal(wrongKey, false);

  // Truncated / malformed signature must fail or reject
  const truncatedSig = signature.slice(0, 16);
  const badSig = await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pairA.publicKey, truncatedSig, message);
  assert.equal(badSig, false);
});

test("Cryptography: 96-bit AES-GCM IVs generated via CSPRNG are unique across 256 samples", () => {
  const seen = new Set();
  for (let i = 0; i < 256; i++) {
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const hex = Buffer.from(iv).toString("hex");
    assert.equal(seen.has(hex), false);
    seen.add(hex);
  }
  assert.equal(seen.size, 256);
});

test("Performance & Stress: 16 concurrent 64 KiB AES-256-GCM + SHA-256 operations complete cleanly", async () => {
  const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const start = performance.now();

  await Promise.all(
    Array.from({ length: 16 }, async (_, idx) => {
      const payload = webcrypto.getRandomValues(new Uint8Array(64 * 1024));
      payload[0] = idx;
      const iv = webcrypto.getRandomValues(new Uint8Array(12));
      const [ct, digest] = await Promise.all([
        subtle.encrypt({ name: "AES-GCM", iv }, key, payload),
        computeSha256Hex(payload)
      ]);
      const dec = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
      assert.deepEqual(dec, payload);
      assert.match(digest, /^[0-9a-f]{64}$/);
    })
  );

  const elapsedMs = performance.now() - start;
  assert.ok(elapsedMs < 5000, `Concurrent crypto stress took too long: ${elapsedMs}ms`);
});
