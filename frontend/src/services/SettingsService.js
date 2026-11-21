import { settingsRepository } from "../repositories";

export class SettingsService {
  constructor(repository = settingsRepository) {
    this.repository = repository;
  }

  async loadSettingsPageData() {
    const [settings, benchmarks] = await Promise.all([
      this.repository.getSettings(),
      this.repository.getBenchmarks()
    ]);
    return { settings, benchmarks };
  }

  updateSettings(payload) {
    return this.repository.updateSettings(payload);
  }
}

export const settingsService = new SettingsService();
export default settingsService;
