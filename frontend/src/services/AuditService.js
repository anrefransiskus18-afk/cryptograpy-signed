import { auditRepository } from "../repositories";
import { exportRowsToCsv } from "../utils/file";

export class AuditService {
  constructor(repository = auditRepository) {
    this.repository = repository;
  }

  async loadAllLogs(auditFilterParams = {}, authLimit = 100) {
    const [auditResDto, authLogs] = await Promise.all([
      this.repository.listAuditLogs(auditFilterParams),
      this.repository.listAuthLogs(authLimit)
    ]);
    return {
      auditLogs: auditResDto.logs,
      authLogs
    };
  }

  verifyChain() {
    return this.repository.verifyChain();
  }

  exportLogsToCsv(activeTab, auditLogs, authLogs) {
    const dateSuffix = new Date().toISOString().slice(0, 10);
    if (activeTab === "auth") {
      const headers = ["id", "timestamp", "username_attempted", "event_type", "status", "ip_address", "failure_reason"];
      exportRowsToCsv(headers, authLogs, `riwayat_login_${dateSuffix}.csv`);
      return "Laporan CSV riwayat login berhasil diunduh.";
    }

    const headers = ["id", "timestamp", "actor_identity", "ip_address", "action_type", "status", "document_name", "document_hash", "signature_verified"];
    exportRowsToCsv(headers, auditLogs, `riwayat_aktivitas_${dateSuffix}.csv`);
    return "Laporan CSV riwayat aktivitas berhasil diunduh.";
  }
}

export const auditService = new AuditService();
export default auditService;
