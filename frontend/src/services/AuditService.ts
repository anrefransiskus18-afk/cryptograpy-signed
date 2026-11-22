import { auditRepository, type AuditRepository, type RepositoryRequestConfig } from "../repositories";
import { exportRowsToCsv } from "../utils/file";
import type { AuditFilterRequestDTO, AuditLogItemDTO, AuthLogItemDTO } from "../dto";
import type { VerifyAuditChainResponse } from "../types/domain";

export class AuditService {
  private repository: AuditRepository;

  constructor(repository: AuditRepository = auditRepository) {
    this.repository = repository;
  }

  async loadAllLogs(
    auditFilterParams: AuditFilterRequestDTO | Record<string, unknown> = {},
    authLimit = 100,
    config: RepositoryRequestConfig = {}
  ): Promise<{ auditLogs: AuditLogItemDTO[]; authLogs: AuthLogItemDTO[] }> {
    const [auditResDto, authLogs] = await Promise.all([
      this.repository.listAuditLogs(auditFilterParams, config),
      this.repository.listAuthLogs(authLimit, config)
    ]);
    return {
      auditLogs: auditResDto.logs,
      authLogs
    };
  }

  verifyChain(): Promise<VerifyAuditChainResponse> {
    return this.repository.verifyChain();
  }

  exportLogsToCsv(
    activeTab: "crypto" | "auth",
    auditLogs: Array<Record<string, unknown>>,
    authLogs: Array<Record<string, unknown>>
  ): string {
    const dateSuffix = new Date().toISOString().slice(0, 10);
    if (activeTab === "auth") {
      const headers = [
        "id",
        "timestamp",
        "username_attempted",
        "event_type",
        "status",
        "ip_address",
        "failure_reason"
      ];
      exportRowsToCsv(headers, authLogs, `riwayat_login_${dateSuffix}.csv`);
      return "Laporan CSV riwayat login berhasil diunduh.";
    }

    const headers = [
      "id",
      "timestamp",
      "actor_identity",
      "ip_address",
      "action_type",
      "status",
      "document_name",
      "document_hash",
      "signature_verified"
    ];
    exportRowsToCsv(headers, auditLogs, `riwayat_aktivitas_${dateSuffix}.csv`);
    return "Laporan CSV riwayat aktivitas berhasil diunduh.";
  }
}

export const auditService = new AuditService();
export default auditService;
