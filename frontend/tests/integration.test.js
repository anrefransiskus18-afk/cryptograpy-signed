import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { attachInterceptors } from "../src/api/interceptors.js";
import { BaseRepository } from "../src/repositories/BaseRepository.js";
import { CryptoRepository } from "../src/repositories/CryptoRepository.js";
import { DocumentRepository } from "../src/repositories/DocumentRepository.js";
import { EncryptionService } from "../src/services/EncryptionService.js";
import { DecryptionService } from "../src/services/DecryptionService.js";
import { DocumentService } from "../src/services/DocumentService.js";
import { ErrorType } from "../src/utils/errors.js";

function withMockBrowserGlobals(fn) {
  const origLocal = globalThis.localStorage;
  const origSession = globalThis.sessionStorage;
  const origWindow = globalThis.window;
  const origDocument = globalThis.document;
  const store = new Map([["jwt_token", "test-jwt-token"]]);
  const sStore = new Map([["local_pkcs8_private_key", "ENCRYPTED_PEM"]]);
  let redirectedTo = null;

  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k)
  };
  globalThis.sessionStorage = {
    getItem: (k) => sStore.get(k) ?? null,
    setItem: (k, v) => sStore.set(k, v),
    removeItem: (k) => sStore.delete(k)
  };
  globalThis.window = {
    location: {
      pathname: "/encrypt",
      get href() {
        return redirectedTo;
      },
      set href(v) {
        redirectedTo = v;
      }
    },
    URL: { createObjectURL: () => "blob:mock", revokeObjectURL: () => {} }
  };
  globalThis.document = {
    createElement: () => ({ setAttribute: () => {}, click: () => {}, remove: () => {} }),
    body: { appendChild: () => {} }
  };

  return Promise.resolve()
    .then(() => fn({ store, sStore, getRedirect: () => redirectedTo }))
    .finally(() => {
      globalThis.localStorage = origLocal;
      globalThis.sessionStorage = origSession;
      globalThis.window = origWindow;
      globalThis.document = origDocument;
    });
}

test("Integration: EncryptionService -> CryptoRepository -> httpClient + Interceptors", async () => {
  await withMockBrowserGlobals(async () => {
    let capturedHeaders = null;
    const client = axios.create({
      baseURL: "http://localhost:8000/api/v1",
      adapter: async (config) => {
        capturedHeaders = config.headers;
        return {
          data: new Blob([new Uint8Array([0x48, 0x43, 0x30, 0x31])]),
          status: 200,
          statusText: "OK",
          headers: {
            "x-document-id": "101",
            "x-encryption-time-ms": "11.2",
            "x-shannon-entropy": "7.999",
            "x-container-header": "HC01"
          },
          config
        };
      }
    });
    attachInterceptors(client);

    const cryptoRepo = new CryptoRepository(client);
    const encSvc = new EncryptionService(cryptoRepo);
    const file = new File(["kontrak rahasia"], "kontrak.pdf", { type: "application/pdf" });
    const res = await encSvc.encrypt({ document: file, recipient_key_id: 2 });

    assert.equal(capturedHeaders.Authorization, "Bearer test-jwt-token");
    assert.ok(capturedHeaders["X-Correlation-ID"]);
    assert.equal(res.docId, 101);
    assert.equal(res.header, "HC01");
  });
});

test("Integration: DecryptionService handles 422 Blob JSON TAMPER_DETECTED from backend", async () => {
  await withMockBrowserGlobals(async () => {
    const client = axios.create({
      baseURL: "http://localhost:8000/api/v1",
      adapter: async (config) => {
        const err = new Error("Unprocessable Entity");
        err.config = config;
        err.response = {
          status: 422,
          headers: {},
          data: new Blob([
            JSON.stringify({
              detail: {
                error_code: "TAMPER_DETECTED",
                message: "GCM Authentication Tag tidak valid"
              }
            })
          ])
        };
        throw err;
      }
    });
    attachInterceptors(client);

    const decSvc = new DecryptionService(new CryptoRepository(client));
    await assert.rejects(
      () =>
        decSvc.decrypt({
          document_id: 55,
          use_stored_key: true,
          passphrase: "ValidPassword123!"
        }),
      (err) =>
        err.type === ErrorType.CRYPTO &&
        err.errorCode === "TAMPER_DETECTED" &&
        err.message === "GCM Authentication Tag tidak valid"
    );
  });
});

test("Integration: DocumentService -> DocumentRepository transforms DTOs and cleans up on 401", async () => {
  await withMockBrowserGlobals(async ({ store, sStore, getRedirect }) => {
    let mode = "ok";
    const client = axios.create({
      baseURL: "http://localhost:8000/api/v1",
      adapter: async (config) => {
        if (mode === "401") {
          const err = new Error("Unauthorized");
          err.config = config;
          err.response = { status: 401, headers: {}, data: { detail: "Sesi berakhir" } };
          throw err;
        }
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: {
            items: [{ id: 1, original_filename: "a.pdf", recipients: [{ recipient_full_name: "Dewi" }] }],
            total: 1,
            page: 1,
            per_page: 10
          }
        };
      }
    });
    attachInterceptors(client);

    const docSvc = new DocumentService(new DocumentRepository(client));
    const listRes = await docSvc.list({ page: 1, per_page: 10 });
    assert.equal(listRes.items[0].original_filename, "a.pdf");
    assert.equal(listRes.items[0].recipients[0].recipient_full_name, "Dewi");

    mode = "401";
    await assert.rejects(() => docSvc.getById(1), (err) => err.status === 401);
    assert.equal(store.has("jwt_token"), false);
    assert.equal(sStore.has("local_pkcs8_private_key"), false);
    assert.equal(getRedirect(), "/login");
  });
});

test("Integration: BaseRepository propagates network failure through interceptors", async () => {
  await withMockBrowserGlobals(async () => {
    const client = axios.create({
      baseURL: "http://localhost:8000/api/v1",
      adapter: async (config) => {
        const err = new Error("Network Error");
        err.config = config;
        throw err;
      }
    });
    attachInterceptors(client);
    const repo = new BaseRepository(client);
    await assert.rejects(
      () => repo.get("/stats", { retries: 0 }),
      (err) => err.type === ErrorType.NETWORK
    );
  });
});
