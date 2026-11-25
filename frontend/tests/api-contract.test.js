import test from "node:test";
import assert from "node:assert/strict";
import { API_ENDPOINTS } from "../src/constants/endpoints.ts";
import {
  EncryptDocumentRequestDTO,
  EncryptResultResponseDTO,
  AadMetadataDTO
} from "../src/dto/document.dto.ts";
import { AuditFilterRequestDTO, BenchmarkResponseDTO } from "../src/dto/audit.dto.ts";

test("Contract: API_ENDPOINTS match canonical /api/v1 backend routes", () => {
  assert.equal(API_ENDPOINTS.AUTH.LOGIN, "/login");
  assert.equal(API_ENDPOINTS.AUTH.LOGOUT, "/logout");
  assert.equal(API_ENDPOINTS.AUTH.ME, "/me");
  assert.equal(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, "/change-password");
  assert.equal(API_ENDPOINTS.CRYPTO.ENCRYPT, "/encrypt");
  assert.equal(API_ENDPOINTS.CRYPTO.DECRYPT, "/decrypt");
  assert.equal(API_ENDPOINTS.DOCUMENTS.BASE, "/documents");
  assert.equal(API_ENDPOINTS.DOCUMENTS.BY_ID(42), "/documents/42");
  assert.equal(API_ENDPOINTS.DOCUMENTS.DOWNLOAD(42), "/documents/42/download");
  assert.equal(API_ENDPOINTS.DOCUMENTS.REVOKE_RECIPIENT(42, 7), "/documents/42/recipients/7/revoke");
  assert.equal(API_ENDPOINTS.DOCUMENTS.RESTORE_RECIPIENT(42, 7), "/documents/42/recipients/7/restore");
  assert.equal(API_ENDPOINTS.KEYS.LIST, "/keys");
  assert.equal(API_ENDPOINTS.KEYS.ME, "/keys/me");
  assert.equal(API_ENDPOINTS.KEYS.GENERATE, "/keys/generate");
  assert.equal(API_ENDPOINTS.KEYS.ROTATE, "/keys/rotate");
  assert.equal(API_ENDPOINTS.KEYS.VERIFY, "/keys/verify");
  assert.equal(API_ENDPOINTS.USERS.BASE, "/users");
  assert.equal(API_ENDPOINTS.USERS.BY_ID(7), "/users/7");
  assert.equal(API_ENDPOINTS.AUDIT.LOGS, "/audit");
  assert.equal(API_ENDPOINTS.AUDIT.AUTH_LOGS, "/auth-logs");
  assert.equal(API_ENDPOINTS.AUDIT.VERIFY_CHAIN, "/audit/verify-chain");
  assert.equal(API_ENDPOINTS.DASHBOARD.STATS, "/stats");
  assert.equal(API_ENDPOINTS.SETTINGS.BASE, "/settings");
  assert.equal(API_ENDPOINTS.SETTINGS.BENCHMARKS, "/benchmarks/latest");
});

test("Contract: EncryptResultResponseDTO parses backend cryptographic response headers", () => {
  const res = new EncryptResultResponseDTO({
    blob: new Blob(["ciphertext"], { type: "application/octet-stream" }),
    headers: {
      "x-document-id": "105",
      "x-encryption-time-ms": "14.28",
      "x-shannon-entropy": "7.9994",
      "x-container-header": "HC02"
    },
    originalFilename: "laporan.pdf"
  });
  assert.equal(res.docId, 105);
  assert.equal(res.timeMs, "14.28");
  assert.equal(res.entropy, "7.9994");
  assert.equal(res.header, "HC02");
  assert.equal(res.filename, "laporan.pdf.enc");
});

test("Contract: EncryptDocumentRequestDTO serializes wrap_mode and AAD JSON deterministically", () => {
  const req = new EncryptDocumentRequestDTO({
    recipient_key_id: 9,
    wrap_mode: "AES_GCM_KW",
    expires_in_hours: 24,
    aad: new AadMetadataDTO({
      classification: "TOP_SECRET",
      origin_department: "Security",
      document_version: "2.0"
    })
  });
  const fd = req.toFormData();
  assert.equal(fd.get("recipient_key_id"), "9");
  assert.equal(fd.get("wrap_mode"), "AES_GCM_KW");
  assert.equal(fd.get("expires_in_hours"), "24");
  assert.equal(
    fd.get("aad_json"),
    JSON.stringify({
      classification: "TOP_SECRET",
      origin_department: "Security",
      document_version: "2.0"
    })
  );
});

test("Contract: AuditFilterRequestDTO and BenchmarkResponseDTO handle boundary defaults", () => {
  const filter = new AuditFilterRequestDTO({ search: "  login ", limit: 50 });
  assert.equal(filter.search, "login");
  assert.equal(filter.limit, 50);

  const bench = new BenchmarkResponseDTO({
    performance_results: [
      {
        code: "1MB",
        label: "1 MiB",
        avg_encrypt_ms: 8.5,
        avg_decrypt_ms: 7.2,
        throughput_encrypt_mibs: 117.6,
        throughput_decrypt_mibs: 138.8,
        overhead_bytes: 129,
        ciphertext_entropy: 7.999,
        avalanche_effect_percent: 50.01
      }
    ],
    tamper_detection: { total_scenarios: 12, detected_scenarios: 12, detection_rate_percent: 100 }
  });
  assert.equal(bench.performance_results.length, 1);
  assert.equal(bench.performance_results[0]?.code, "1MB");
  assert.equal(bench.tamper_detection.detection_rate_percent, 100);
});
