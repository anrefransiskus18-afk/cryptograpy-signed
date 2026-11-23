import test from "node:test";
import assert from "node:assert/strict";
import { BaseRepository } from "../src/repositories/BaseRepository.ts";
import { AuthRepository } from "../src/repositories/AuthRepository.ts";
import { CryptoRepository } from "../src/repositories/CryptoRepository.ts";
import { DocumentRepository } from "../src/repositories/DocumentRepository.ts";
import { KeyRepository } from "../src/repositories/KeyRepository.ts";
import { UserRepository } from "../src/repositories/UserRepository.ts";
import { AuditRepository } from "../src/repositories/AuditRepository.ts";
import { DashboardRepository } from "../src/repositories/DashboardRepository.ts";
import { SettingsRepository } from "../src/repositories/SettingsRepository.ts";
import { API_ENDPOINTS } from "../src/constants/endpoints.ts";
import { AppError, ErrorType } from "../src/utils/errors.ts";

function createSpyClient(response = { data: {} }) {
  const calls = [];
  const record = (method) => async (url, arg2, arg3) => {
    calls.push({ method, url, arg2, arg3 });
    return typeof response === "function" ? response(method, url, arg2, arg3) : response;
  };
  return {
    calls,
    get: record("GET"),
    post: record("POST"),
    put: record("PUT"),
    patch: record("PATCH"),
    delete: record("DELETE")
  };
}

test("BaseRepository supports GET, POST, PUT, PATCH, DELETE, and getBlob", async () => {
  const client = createSpyClient((method, url) => ({ data: { method, url } }));
  const repo = new BaseRepository(client);

  assert.deepEqual(await repo.get("/a"), { method: "GET", url: "/a" });
  assert.deepEqual(await repo.post("/b", { x: 1 }), { method: "POST", url: "/b" });
  assert.deepEqual(await repo.put("/c", { y: 2 }), { method: "PUT", url: "/c" });
  assert.deepEqual(await repo.patch("/d", { z: 3 }), { method: "PATCH", url: "/d" });
  assert.deepEqual(await repo.delete("/e"), { method: "DELETE", url: "/e" });

  const blob = await repo.getBlob("/f");
  assert.equal(blob instanceof Blob, true);
  assert.equal(client.calls[5].arg2.responseType, "blob");
});

test("BaseRepository.get retries once on transient 503 error and succeeds", async () => {
  let calls = 0;
  const mockClient = {
    get: async () => {
      calls += 1;
      if (calls === 1) {
        throw { response: { status: 503, data: { detail: "Service Unavailable" } } };
      }
      return { data: { recovered: true } };
    }
  };
  const repo = new BaseRepository(mockClient);
  const res = await repo.get("/stats");
  assert.equal(calls, 2);
  assert.equal(res.recovered, true);
});

test("BaseRepository.post/put/delete do NOT retry on 503 error (non-idempotent)", async () => {
  for (const method of ["post", "put", "delete"]) {
    let calls = 0;
    const mockClient = {
      [method]: async () => {
        calls += 1;
        throw { response: { status: 503, data: { detail: "Service Unavailable" } } };
      }
    };
    const repo = new BaseRepository(mockClient);
    await assert.rejects(
      () => repo[method]("/test", {}),
      (err) => err instanceof AppError && err.status === 503
    );
    assert.equal(calls, 1);
  }
});

test("BaseRepository handles request cancellation without retrying", async () => {
  let calls = 0;
  const mockClient = {
    get: async () => {
      calls += 1;
      const err = new Error("canceled");
      err.code = "ERR_CANCELED";
      throw err;
    }
  };
  const repo = new BaseRepository(mockClient);
  await assert.rejects(
    () => repo.get("/documents"),
    (err) => err instanceof AppError && err.errorCode === "ERR_CANCELED"
  );
  assert.equal(calls, 1);
});

test("BaseRepository normalizes timeout, 401 Unauthorized, and 422 TAMPER_DETECTED", async () => {
  const timeoutRepo = new BaseRepository({
    post: async () => {
      const err = new Error("timeout");
      err.code = "ECONNABORTED";
      throw err;
    }
  });
  await assert.rejects(
    () => timeoutRepo.post("/encrypt", {}),
    (err) => err instanceof AppError && err.type === ErrorType.NETWORK && /habis/i.test(err.message)
  );

  const repo401 = new BaseRepository({
    get: async () => {
      throw { response: { status: 401, data: { detail: "Token kedaluwarsa" } } };
    }
  });
  await assert.rejects(
    () => repo401.get("/me", { retries: 0 }),
    (err) => err instanceof AppError && err.type === ErrorType.HTTP && err.status === 401
  );

  const repo422 = new BaseRepository({
    post: async () => {
      throw {
        response: {
          status: 422,
          data: { detail: { error_code: "TAMPER_DETECTED", message: "GCM Tag invalid" } }
        }
      };
    }
  });
  await assert.rejects(
    () => repo422.postMultipart("/decrypt", {}),
    (err) =>
      err instanceof AppError &&
      err.type === ErrorType.CRYPTO &&
      err.status === 422 &&
      err.errorCode === "TAMPER_DETECTED"
  );
});

test("All domain repositories route to centralized API_ENDPOINTS with expected structs", async () => {
  const client = createSpyClient({ data: new Uint8Array([1, 2, 3]) });

  const authRepo = new AuthRepository(client);
  await authRepo.login({ username: "u", password: "p" });
  await authRepo.logout();
  await authRepo.getMe();
  await authRepo.updateMe({ full_name: "A" });
  await authRepo.changePassword({ current_password: "a", new_password: "b" });

  const cryptoRepo = new CryptoRepository(client);
  await cryptoRepo.encrypt(new FormData());
  const decBlob = await cryptoRepo.decrypt({ document_id: 1 });
  assert.equal(decBlob instanceof Blob, true);

  const docRepo = new DocumentRepository(client);
  await docRepo.list({ page: 2 });
  await docRepo.getById(99);
  await docRepo.downloadEncryptedBlob(99);
  await docRepo.remove(99);

  const keyRepo = new KeyRepository(client);
  await keyRepo.listPublicKeys();
  await keyRepo.getMyKey();
  await keyRepo.generate({ passphrase: "x" });
  await keyRepo.rotate({ passphrase: "y" });
  await keyRepo.verify({ passphrase: "z" });

  const userRepo = new UserRepository(client);
  await userRepo.list({ role: "STAFF" });
  await userRepo.create({ username: "new" });
  await userRepo.update(5, { full_name: "Updated" });
  await userRepo.remove(5);

  const auditRepo = new AuditRepository(client);
  await auditRepo.listAuditLogs({ limit: 10 });
  await auditRepo.listAuthLogs(25);
  await auditRepo.verifyChain();

  const dashRepo = new DashboardRepository(client);
  await dashRepo.getStats();

  const settingsRepo = new SettingsRepository(client);
  await settingsRepo.getSettings();
  await settingsRepo.updateSettings({ organization_name: "PT XYZ" });
  await settingsRepo.getBenchmarks();

  const urls = client.calls.map((c) => `${c.method} ${c.url}`);
  assert.ok(urls.includes(`POST ${API_ENDPOINTS.AUTH.LOGIN}`));
  assert.ok(urls.includes(`POST ${API_ENDPOINTS.CRYPTO.ENCRYPT}`));
  assert.ok(urls.includes(`POST ${API_ENDPOINTS.CRYPTO.DECRYPT}`));
  assert.ok(urls.includes(`GET ${API_ENDPOINTS.DOCUMENTS.BY_ID(99)}`));
  assert.ok(urls.includes(`GET ${API_ENDPOINTS.DOCUMENTS.DOWNLOAD(99)}`));
  assert.ok(urls.includes(`POST ${API_ENDPOINTS.KEYS.ROTATE}`));
  assert.ok(urls.includes(`PUT ${API_ENDPOINTS.USERS.BY_ID(5)}`));
  assert.ok(urls.includes(`GET ${API_ENDPOINTS.AUDIT.VERIFY_CHAIN}`));
  assert.ok(urls.includes(`GET ${API_ENDPOINTS.DASHBOARD.STATS}`));
  assert.ok(urls.includes(`PUT ${API_ENDPOINTS.SETTINGS.BASE}`));
});
