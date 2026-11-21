import { BaseRepository } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import { DashboardResponseDTO } from "../dto";

export class DashboardRepository extends BaseRepository {
  getStats(config = {}) {
    return this.get(API_ENDPOINTS.DASHBOARD.STATS, {
      ...config,
      responseStruct: DashboardResponseDTO
    });
  }
}

export const dashboardRepository = new DashboardRepository();
export default dashboardRepository;
