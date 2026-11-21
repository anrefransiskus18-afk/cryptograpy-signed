import { BaseRepository } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import {
  LoginRequestDTO,
  LoginResponseDTO,
  ChangePasswordRequestDTO,
  UpdateProfileRequestDTO,
  UserProfileDTO
} from "../dto";

export class AuthRepository extends BaseRepository {
  login(payload) {
    return this.post(API_ENDPOINTS.AUTH.LOGIN, payload, {
      requestStruct: LoginRequestDTO,
      responseStruct: LoginResponseDTO
    });
  }

  logout() {
    return this.post(API_ENDPOINTS.AUTH.LOGOUT);
  }

  getMe(config = {}) {
    return this.get(API_ENDPOINTS.AUTH.ME, {
      ...config,
      responseStruct: UserProfileDTO
    });
  }

  updateMe(payload) {
    return this.put(API_ENDPOINTS.AUTH.ME, payload, {
      requestStruct: UpdateProfileRequestDTO,
      responseStruct: UserProfileDTO
    });
  }

  changePassword(payload) {
    return this.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, payload, {
      requestStruct: ChangePasswordRequestDTO
    });
  }
}

export const authRepository = new AuthRepository();
export default authRepository;
