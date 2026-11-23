import { BaseRepository, type RepositoryRequestConfig } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import { DashboardResponseDTO } from "../dto";

export class DashboardRepository extends BaseRepository {
  getStats(config: RepositoryRequestConfig = {}): Promise<DashboardResponseDTO> {
    return this.get<DashboardResponseDTO>(API_ENDPOINTS.DASHBOARD.STATS, {
      ...config,
      responseStruct: DashboardResponseDTO
    });
  }
}

export const dashboardRepository = new DashboardRepository();
export default dashboardRepository;
