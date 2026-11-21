import { BaseRepository } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import {
  SystemSettingsDTO,
  UpdateSettingsRequestDTO,
  BenchmarkResponseDTO
} from "../dto";

export class SettingsRepository extends BaseRepository {
  getSettings(config = {}) {
    return this.get(API_ENDPOINTS.SETTINGS.BASE, {
      ...config,
      responseStruct: SystemSettingsDTO
    });
  }

  updateSettings(payload) {
    return this.put(API_ENDPOINTS.SETTINGS.BASE, payload, {
      requestStruct: UpdateSettingsRequestDTO,
      responseStruct: SystemSettingsDTO
    });
  }

  getBenchmarks(config = {}) {
    return this.get(API_ENDPOINTS.SETTINGS.BENCHMARKS, {
      ...config,
      responseStruct: BenchmarkResponseDTO
    });
  }
}

export const settingsRepository = new SettingsRepository();
export default settingsRepository;
