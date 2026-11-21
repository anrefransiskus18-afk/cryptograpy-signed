import { BaseRepository } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import {
  UserFilterRequestDTO,
  CreateUserRequestDTO,
  UpdateUserRequestDTO,
  UserResponseDTO,
  UserMutationResponseDTO
} from "../dto";

export class UserRepository extends BaseRepository {
  list(params = {}, config = {}) {
    return this.get(API_ENDPOINTS.USERS.BASE, {
      ...config,
      params,
      queryStruct: UserFilterRequestDTO,
      responseStruct: [UserResponseDTO]
    });
  }

  create(payload) {
    return this.post(API_ENDPOINTS.USERS.BASE, payload, {
      requestStruct: CreateUserRequestDTO,
      responseStruct: UserMutationResponseDTO
    });
  }

  update(userId, payload) {
    return this.put(API_ENDPOINTS.USERS.BY_ID(userId), payload, {
      requestStruct: UpdateUserRequestDTO,
      responseStruct: UserMutationResponseDTO
    });
  }

  remove(userId) {
    return this.delete(API_ENDPOINTS.USERS.BY_ID(userId));
  }
}

export const userRepository = new UserRepository();
export default userRepository;
