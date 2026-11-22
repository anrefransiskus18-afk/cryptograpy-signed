import { BaseRepository, type RepositoryRequestConfig } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import {
  UserFilterRequestDTO,
  CreateUserRequestDTO,
  UpdateUserRequestDTO,
  UserResponseDTO,
  UserMutationResponseDTO
} from "../dto";
import type { MessageResponse } from "../types/domain";

export class UserRepository extends BaseRepository {
  list(
    params: UserFilterRequestDTO | Record<string, any> = {},
    config: RepositoryRequestConfig = {}
  ): Promise<UserResponseDTO[]> {
    return this.get<UserResponseDTO[]>(API_ENDPOINTS.USERS.BASE, {
      ...config,
      params,
      queryStruct: UserFilterRequestDTO,
      responseStruct: [UserResponseDTO]
    });
  }

  create(payload: CreateUserRequestDTO | Record<string, any>): Promise<UserMutationResponseDTO> {
    return this.post<UserMutationResponseDTO>(API_ENDPOINTS.USERS.BASE, payload, {
      requestStruct: CreateUserRequestDTO,
      responseStruct: UserMutationResponseDTO
    });
  }

  update(
    userId: number | string,
    payload: UpdateUserRequestDTO | Record<string, any>
  ): Promise<UserMutationResponseDTO> {
    return this.put<UserMutationResponseDTO>(API_ENDPOINTS.USERS.BY_ID(userId), payload, {
      requestStruct: UpdateUserRequestDTO,
      responseStruct: UserMutationResponseDTO
    });
  }

  remove(userId: number | string): Promise<MessageResponse> {
    return this.delete<MessageResponse>(API_ENDPOINTS.USERS.BY_ID(userId));
  }
}

export const userRepository = new UserRepository();
export default userRepository;
