import { BaseRepository, type RepositoryRequestConfig } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import {
  AuditFilterRequestDTO,
  AuditLogListResponseDTO,
  AuthLogItemDTO
} from "../dto";

export class AuditRepository extends BaseRepository {
  listAuditLogs(
    params: AuditFilterRequestDTO | Record<string, any> = {},
    config: RepositoryRequestConfig = {}
  ): Promise<AuditLogListResponseDTO> {
    return this.get<AuditLogListResponseDTO>(API_ENDPOINTS.AUDIT.LOGS, {
      ...config,
      params,
      queryStruct: AuditFilterRequestDTO,
      responseStruct: AuditLogListResponseDTO
    });
  }

  listAuthLogs(limit = 100, config: RepositoryRequestConfig = {}): Promise<AuthLogItemDTO[]> {
    return this.get<AuthLogItemDTO[]>(API_ENDPOINTS.AUDIT.AUTH_LOGS, {
      ...config,
      params: { limit },
      responseStruct: [AuthLogItemDTO]
    });
  }

  verifyChain(config: RepositoryRequestConfig = {}): Promise<any> {
    return this.get(API_ENDPOINTS.AUDIT.VERIFY_CHAIN, config);
  }
}

export const auditRepository = new AuditRepository();
export default auditRepository;
