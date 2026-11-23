import test from "node:test";
import assert from "node:assert/strict";
import {
  isPlainRecord,
  isCanceledError,
  assertNonEmptyString,
  assertFiniteNumber,
  assertArrayOf
} from "../src/utils/validators.ts";
import { NetworkError } from "../src/utils/errors.ts";
import { computeSha256Hex } from "../src/utils/crypto/hashWorker.ts";

test("validators verify records, strings, numbers, arrays, and cancellation errors", () => {
  assert.equal(isPlainRecord({ a: 1 }), true);
  assert.equal(isPlainRecord([]), false);
  assert.equal(isPlainRecord(null), false);

  assert.equal(
    isCanceledError(new NetworkError("canceled", { errorCode: "ERR_CANCELED" })),
    true
  );
  assert.equal(isCanceledError(new Error("other")), false);

  assert.equal(assertNonEmptyString("hello", "name"), "hello");
  assert.throws(() => assertNonEmptyString("   ", "name"), TypeError);

  assert.equal(assertFiniteNumber(42, "count"), 42);
  assert.throws(() => assertFiniteNumber(Number.NaN, "count"), TypeError);

  const items = assertArrayOf(["a", "b"], (x) => typeof x === "string", "tags");
  assert.deepEqual(items, ["a", "b"]);
  assert.throws(
    () => assertArrayOf(["a", 1], (x) => typeof x === "string", "tags"),
    TypeError
  );
});

test("computeSha256Hex produces standard NIST SHA-256 digest", async () => {
  const bytes = new TextEncoder().encode("abc");
  const digest = await computeSha256Hex(bytes);
  assert.equal(
    digest,
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});
