import { settingsRepository, type SettingsRepository } from "../repositories";
import type { BenchmarkResponseDTO, SystemSettingsDTO, UpdateSettingsRequestDTO } from "../dto";

export class SettingsService {
  private repository: SettingsRepository;

  constructor(repository: SettingsRepository = settingsRepository) {
    this.repository = repository;
  }

  async loadSettingsPageData(): Promise<{
    settings: SystemSettingsDTO;
    benchmarks: BenchmarkResponseDTO;
  }> {
    const [settings, benchmarks] = await Promise.all([
      this.repository.getSettings(),
      this.repository.getBenchmarks()
    ]);
    return { settings, benchmarks };
  }

  updateSettings(payload: UpdateSettingsRequestDTO | Record<string, any>): Promise<SystemSettingsDTO> {
    return this.repository.updateSettings(payload);
  }
}

export const settingsService = new SettingsService();
export default settingsService;
