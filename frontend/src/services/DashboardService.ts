import {
  dashboardRepository,
  documentRepository,
  type DashboardRepository,
  type DocumentRepository,
  type RepositoryRequestConfig
} from "../repositories";
import { DocumentFilterRequestDTO, type DashboardResponseDTO, type DocumentResponseDTO } from "../dto";

export class DashboardService {
  private dashboardRepo: DashboardRepository;
  private documentRepo: DocumentRepository;

  constructor(
    dashRepo: DashboardRepository = dashboardRepository,
    docRepo: DocumentRepository = documentRepository
  ) {
    this.dashboardRepo = dashRepo;
    this.documentRepo = docRepo;
  }

  async loadDashboardData(config: RepositoryRequestConfig = {}): Promise<{
    stats: DashboardResponseDTO;
    recentDocs: DocumentResponseDTO[];
  }> {
    const [stats, docListDto] = await Promise.all([
      this.dashboardRepo.getStats(config),
      this.documentRepo.list(new DocumentFilterRequestDTO({ per_page: 5 }), config)
    ]);
    return {
      stats,
      recentDocs: docListDto.items
    };
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
