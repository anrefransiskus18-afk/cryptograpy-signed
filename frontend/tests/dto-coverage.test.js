import test from "node:test";
import assert from "node:assert/strict";
import {
  AuditFilterRequestDTO,
  AuditLogItemDTO,
  AuditLogListResponseDTO,
  AuthLogItemDTO,
  DashboardMetricsDTO,
  DashboardMyKeyDTO,
  DashboardResponseDTO,
  SystemSettingsDTO,
  UpdateSettingsRequestDTO,
  BenchmarkResponseDTO,
  KeyPassphraseRequestDTO,
  VerifyKeyRequestDTO,
  PublicKeyDirectoryItemDTO,
  MyKeyStatusResponseDTO,
  KeyPairGeneratedResponseDTO,
  VerifyKeyResponseDTO,
  UserFilterRequestDTO,
  CreateUserRequestDTO,
  UpdateUserRequestDTO,
  UserResponseDTO,
  UserMutationResponseDTO
} from "../src/dto/index.ts";
import { Lazy } from "../src/lib/lazy.ts";

test("Audit DTOs normalize defaults, nested logs, and metrics", () => {
  const filter = new AuditFilterRequestDTO({ action_type: "ENCRYPT", limit: 25 });
  assert.equal(filter.action_type, "ENCRYPT");
  assert.equal(filter.limit, 25);

  const settingsReq = new UpdateSettingsRequestDTO({
    default_key_wrap_mode: "HKDF_AES_GCM",
    organization_name: "PT XYZ",
    jwt_expiration_minutes: 60
  });
  assert.equal(settingsReq.default_key_wrap_mode, "HKDF_AES_GCM");
  assert.equal(settingsReq.jwt_expiration_minutes, 60);

  const listDto = Lazy.transform(
    {
      server_signing_public_key_pem: "PEM",
      logs: [{ id: 1, action_type: "DECRYPT", metadata: { document_name: "a.pdf" } }],
      total: 1
    },
    AuditLogListResponseDTO
  );
  assert.equal(listDto.logs.length, 1);
  assert.ok(listDto.logs[0] instanceof AuditLogItemDTO);
  assert.equal(listDto.logs[0].document_name, "a.pdf");

  const authLog = new AuthLogItemDTO({ id: 7, username_attempted: "alice", status: "FAILED" });
  assert.equal(authLog.id, 7);
  assert.equal(authLog.username_attempted, "alice");

  const dash = Lazy.transform(
    {
      metrics: { total_documents: 10 },
      my_key: { has_active_key: true, key_id: 3 },
      recent_logs: [{ id: 2, action_type: "LOGIN" }]
    },
    DashboardResponseDTO
  );
  assert.ok(dash.metrics instanceof DashboardMetricsDTO);
  assert.equal(dash.metrics.total_documents, 10);
  assert.ok(dash.my_key instanceof DashboardMyKeyDTO);
  assert.equal(dash.my_key.has_active_key, true);
  assert.equal(dash.recent_logs.length, 1);

  const sysSettings = new SystemSettingsDTO({ max_upload_size_mb: 125 });
  assert.equal(sysSettings.max_upload_size_mb, 125);

  const bench = new BenchmarkResponseDTO({ performance_results: [{ size: 1024 }] });
  assert.equal(bench.performance_results.length, 1);
});

test("Key DTOs normalize key request and response structures", () => {
  const passReq = new KeyPassphraseRequestDTO({ passphrase: "secret" });
  assert.equal(passReq.passphrase, "secret");

  const verifyReq = new VerifyKeyRequestDTO({ private_key_pkcs8: "", passphrase: "abc" });
  assert.equal(verifyReq.private_key_pkcs8, undefined);
  assert.equal(verifyReq.passphrase, "abc");

  const dirItem = new PublicKeyDirectoryItemDTO({
    key_id: "5",
    user_id: "9",
    full_name: "Budi",
    clearance_level: "3"
  });
  assert.equal(dirItem.key_id, 5);
  assert.equal(dirItem.user_id, 9);
  assert.equal(dirItem.curve, "NIST P-256");

  const status = new MyKeyStatusResponseDTO({ has_active_key: true, key_id: 5 });
  assert.equal(status.has_active_key, true);

  const gen = new KeyPairGeneratedResponseDTO({ key_id: 8, fingerprint: "fp-1" });
  assert.equal(gen.key_id, 8);

  const verified = new VerifyKeyResponseDTO({ is_valid: true, actual_fingerprint: "fp-1" });
  assert.equal(verified.is_valid, true);
  assert.equal(verified.actual_fingerprint, "fp-1");
});

test("User DTOs normalize filters, role casing, and responses", () => {
  const filter = new UserFilterRequestDTO({ search: "budi", role: "ADMIN", include_deleted: true });
  assert.equal(filter.include_deleted, "true");

  const create = new CreateUserRequestDTO({
    username: "  budi ",
    nik: "  ",
    role: "manager",
    full_name: " Budi Santoso ",
    email: "budi@example.com"
  });
  assert.equal(create.username, "budi");
  assert.equal(create.nik, undefined);
  assert.equal(create.role, "MANAGER");

  const update = new UpdateUserRequestDTO({ role: "EXECUTIVE", is_active: true });
  assert.equal(update.role, "EXECUTIVE");
  assert.equal(update.is_active, true);

  const user = new UserResponseDTO({ id: "4", username: "budi", clearance_level: "2" });
  assert.equal(user.id, 4);
  assert.equal(user.clearance_level, 2);

  const mutation = Lazy.transform(
    { message: "ok", user: { id: 4, username: "budi" } },
    UserMutationResponseDTO
  );
  assert.equal(mutation.message, "ok");
  assert.ok(mutation.user instanceof UserResponseDTO);
});
