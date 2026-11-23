import { BaseRepository, type RepositoryRequestConfig } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import {
  LoginRequestDTO,
  LoginResponseDTO,
  ChangePasswordRequestDTO,
  UpdateProfileRequestDTO,
  UserProfileDTO
} from "../dto";
import type { ChangePasswordResponse, MessageResponse } from "../types/domain";

export class AuthRepository extends BaseRepository {
  login(payload: LoginRequestDTO | Record<string, unknown>): Promise<LoginResponseDTO> {
    return this.post<LoginResponseDTO>(API_ENDPOINTS.AUTH.LOGIN, payload, {
      requestStruct: LoginRequestDTO,
      responseStruct: LoginResponseDTO
    });
  }

  logout(): Promise<MessageResponse> {
    return this.post<MessageResponse>(API_ENDPOINTS.AUTH.LOGOUT);
  }

  getMe(config: RepositoryRequestConfig = {}): Promise<UserProfileDTO> {
    return this.get<UserProfileDTO>(API_ENDPOINTS.AUTH.ME, {
      ...config,
      responseStruct: UserProfileDTO
    });
  }

  updateMe(payload: UpdateProfileRequestDTO | Record<string, unknown>): Promise<UserProfileDTO> {
    return this.put<UserProfileDTO>(API_ENDPOINTS.AUTH.ME, payload, {
      requestStruct: UpdateProfileRequestDTO,
      responseStruct: UserProfileDTO
    });
  }

  changePassword(payload: ChangePasswordRequestDTO | Record<string, unknown>): Promise<ChangePasswordResponse> {
    return this.post<ChangePasswordResponse>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, payload, {
      requestStruct: ChangePasswordRequestDTO
    });
  }
}

export const authRepository = new AuthRepository();
export default authRepository;
