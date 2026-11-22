import { settingsRepository, type SettingsRepository, type RepositoryRequestConfig } from "../repositories";
import type { BenchmarkResponseDTO, SystemSettingsDTO, UpdateSettingsRequestDTO } from "../dto";

export class SettingsService {
  private repository: SettingsRepository;

  constructor(repository: SettingsRepository = settingsRepository) {
    this.repository = repository;
  }

  async loadSettingsPageData(config: RepositoryRequestConfig = {}): Promise<{
    settings: SystemSettingsDTO;
    benchmarks: BenchmarkResponseDTO;
  }> {
    const [settings, benchmarks] = await Promise.all([
      this.repository.getSettings(config),
      this.repository.getBenchmarks(config)
    ]);
    return { settings, benchmarks };
  }

  updateSettings(payload: UpdateSettingsRequestDTO | Record<string, unknown>): Promise<SystemSettingsDTO> {
    return this.repository.updateSettings(payload);
  }
}

export const settingsService = new SettingsService();
export default settingsService;
