import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { sanitizeFilename, sanitizeCsvCell } from "../src/utils/file.ts";
import { sanitizeLogData } from "../src/utils/logger.ts";
import { Lazy } from "../src/lib/lazy.ts";
import {
  AuditLogListResponseDTO,
  DocumentResponseDTO,
  UserResponseDTO,
  VerifyKeyResponseDTO
} from "../src/dto/index.ts";
import { computeSha256Hex } from "../src/utils/crypto/hashWorker.ts";

const subtle = webcrypto.subtle;

// Deterministic PRNG (Mulberry32) for reproducible property & fuzz tests
const SEED = 0x20261123;
function createPrng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBytes(rng, len) {
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = Math.floor(rng() * 256);
  }
  return out;
}

test("Property: AES-256-GCM preserves arbitrary plaintexts and rejects any byte-level tampering (seed=0x20261123)", async () => {
  const rng = createPrng(SEED);
  const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);

  const fixedStrings = [
    "",
    "ASCII",
    "Bahasa Indonesia — Keamanan Dokumen 🔐",
    "日本語テスト • العربية • Ελληνικά",
    "\u0000\r\n\t\b\"'<script>alert(1)</script>"
  ];

  for (const s of fixedStrings) {
    const pt = new TextEncoder().encode(s);
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, pt));
    const dec = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
    assert.deepEqual(dec, pt);
  }

  for (let i = 0; i < 25; i++) {
    const len = Math.floor(rng() * 2048);
    const pt = randomBytes(rng, len);
    const aad = randomBytes(rng, Math.floor(rng() * 64));
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, key, pt));
    const dec = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad }, key, ct));
    assert.deepEqual(dec, pt);

    const bad = new Uint8Array(ct);
    const pos = Math.floor(rng() * bad.length);
    bad[pos] ^= 1 << Math.floor(rng() * 8);
    await assert.rejects(() => subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad }, key, bad));
  }
});

test("Fuzz: sanitizeFilename, sanitizeCsvCell, and sanitizeLogData never crash on adversarial inputs", () => {
  const rng = createPrng(SEED + 1);
  const adversarial = [
    null,
    undefined,
    "",
    "../../etc/passwd",
    "..\\..\\Windows\\System32",
    "=cmd|' /C calc'!A0",
    "+1+1",
    "-2+3",
    "@SUM(A1:A2)",
    "\x00\x01\x1f\x7f",
    "a".repeat(5000),
    { jwt_token: "eyJhbGciOiJIUzI1NiJ9.abcdef12345.sig123456", nested: { password: "p" } }
  ];

  for (const item of adversarial) {
    const fn = sanitizeFilename(item);
    assert.equal(typeof fn, "string");
    assert.ok(fn.length > 0 && fn.length <= 200);
    assert.equal(fn.includes(".."), false);
    assert.equal(fn.includes("/"), false);
    assert.equal(fn.includes("\\"), false);

    const csv = sanitizeCsvCell(item);
    assert.ok(csv.startsWith('"') && csv.endsWith('"'));

    const log = sanitizeLogData(item);
    const json = JSON.stringify(log) ?? "";
    assert.equal(json.includes("abcdef12345"), false);
  }

  // Deeply nested object must truncate cleanly without stack overflow
  let deep = { secret: "top-secret" };
  for (let i = 0; i < 12; i++) {
    deep = { child: deep };
  }
  const truncated = sanitizeLogData(deep);
  assert.ok(JSON.stringify(truncated).includes("[TRUNCATED]"));

  // Random binary fuzz strings for filename & SHA-256
  for (let i = 0; i < 20; i++) {
    const bytes = randomBytes(rng, Math.floor(rng() * 128));
    const str = String.fromCharCode(...bytes);
    const safe = sanitizeFilename(str);
    assert.ok(safe.length > 0 && safe.length <= 200);
  }
});

test("Fuzz: DTOs and Lazy.transform handle malformed, nullish, and mismatched API payloads safely", () => {
  const malformedPayloads = [
    null,
    undefined,
    42,
    "unexpected-string",
    [],
    {},
    { logs: "not-an-array", total: "NaN" },
    { id: "abc", username: 123, clearance_level: null },
    { is_valid: "yes", actual_fingerprint: 999 }
  ];

  for (const payload of malformedPayloads) {
    assert.doesNotThrow(() => Lazy.transform(payload, AuditLogListResponseDTO));
    assert.doesNotThrow(() => Lazy.transform(payload, DocumentResponseDTO));
    assert.doesNotThrow(() => Lazy.transform(payload, UserResponseDTO));
    assert.doesNotThrow(() => Lazy.transform(payload, VerifyKeyResponseDTO));
  }
});

test("Property: computeSha256Hex is deterministic and 64-hex-char across random sizes", async () => {
  const rng = createPrng(SEED + 2);
  for (const size of [0, 1, 55, 64, 128, 1025]) {
    const buf = randomBytes(rng, size);
    const h1 = await computeSha256Hex(buf);
    const h2 = await computeSha256Hex(buf);
    assert.equal(h1, h2);
    assert.match(h1, /^[0-9a-f]{64}$/);
  }
});
