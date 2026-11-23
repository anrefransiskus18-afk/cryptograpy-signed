import { BaseRepository, type RepositoryRequestConfig } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import {
  SystemSettingsDTO,
  UpdateSettingsRequestDTO,
  BenchmarkResponseDTO
} from "../dto";

export class SettingsRepository extends BaseRepository {
  getSettings(config: RepositoryRequestConfig = {}): Promise<SystemSettingsDTO> {
    return this.get<SystemSettingsDTO>(API_ENDPOINTS.SETTINGS.BASE, {
      ...config,
      responseStruct: SystemSettingsDTO
    });
  }

  updateSettings(payload: UpdateSettingsRequestDTO | Record<string, unknown>): Promise<SystemSettingsDTO> {
    return this.put<SystemSettingsDTO>(API_ENDPOINTS.SETTINGS.BASE, payload, {
      requestStruct: UpdateSettingsRequestDTO,
      responseStruct: SystemSettingsDTO
    });
  }

  getBenchmarks(config: RepositoryRequestConfig = {}): Promise<BenchmarkResponseDTO> {
    return this.get<BenchmarkResponseDTO>(API_ENDPOINTS.SETTINGS.BENCHMARKS, {
      ...config,
      responseStruct: BenchmarkResponseDTO
    });
  }
}

export const settingsRepository = new SettingsRepository();
export default settingsRepository;
