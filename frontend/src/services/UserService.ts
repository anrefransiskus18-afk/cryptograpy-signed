import { userRepository, type UserRepository } from "../repositories";
import {
  UpdateUserRequestDTO,
  type CreateUserRequestDTO,
  type UserFilterRequestDTO,
  type UserMutationResponseDTO,
  type UserResponseDTO
} from "../dto";
import type { MessageResponse } from "../types/domain";

export class UserService {
  private repository: UserRepository;

  constructor(repository: UserRepository = userRepository) {
    this.repository = repository;
  }

  list(params: UserFilterRequestDTO | Record<string, any> = {}): Promise<UserResponseDTO[]> {
    return this.repository.list(params);
  }

  create(payload: CreateUserRequestDTO | Record<string, any>): Promise<UserMutationResponseDTO> {
    return this.repository.create(payload);
  }

  update(
    userId: number | string,
    payload: UpdateUserRequestDTO | Record<string, any>
  ): Promise<UserMutationResponseDTO> {
    return this.repository.update(userId, payload);
  }

  toggleActive(user: { id: number | string; is_active: boolean }): Promise<UserMutationResponseDTO> {
    const updateDto = new UpdateUserRequestDTO({ is_active: !user.is_active });
    return this.repository.update(user.id, updateDto);
  }

  rotateOrRestoreKey(
    userId: number | string,
    passphrase: string,
    mode: "rotate" | "restore" = "rotate"
  ): Promise<UserMutationResponseDTO> {
    const updateDto = new UpdateUserRequestDTO(
      mode === "restore"
        ? { is_active: true, key_passphrase: passphrase }
        : { reset_ecc_key: true, key_passphrase: passphrase }
    );
    return this.repository.update(userId, updateDto);
  }

  remove(userId: number | string): Promise<MessageResponse> {
    return this.repository.remove(userId);
  }
}

export const userService = new UserService();
export default userService;
