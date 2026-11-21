import { dashboardRepository, documentRepository } from "../repositories";
import { DocumentFilterRequestDTO } from "../dto";

export class DashboardService {
  constructor(dashRepo = dashboardRepository, docRepo = documentRepository) {
    this.dashboardRepo = dashRepo;
    this.documentRepo = docRepo;
  }

  async loadDashboardData() {
    const [stats, docListDto] = await Promise.all([
      this.dashboardRepo.getStats(),
      this.documentRepo.list(new DocumentFilterRequestDTO({ per_page: 5 }))
    ]);
    return {
      stats,
      recentDocs: docListDto.items
    };
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
