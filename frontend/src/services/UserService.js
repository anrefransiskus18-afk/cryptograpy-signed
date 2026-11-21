import { userRepository } from "../repositories";
import { UpdateUserRequestDTO } from "../dto";

export class UserService {
  constructor(repository = userRepository) {
    this.repository = repository;
  }

  list(params = {}) {
    return this.repository.list(params);
  }

  create(payload) {
    return this.repository.create(payload);
  }

  update(userId, payload) {
    return this.repository.update(userId, payload);
  }

  toggleActive(user) {
    const updateDto = new UpdateUserRequestDTO({ is_active: !user.is_active });
    return this.repository.update(user.id, updateDto);
  }

  rotateOrRestoreKey(userId, passphrase, mode = "rotate") {
    const updateDto = new UpdateUserRequestDTO(
      mode === "restore"
        ? { is_active: true, key_passphrase: passphrase }
        : { reset_ecc_key: true, key_passphrase: passphrase }
    );
    return this.repository.update(userId, updateDto);
  }

  remove(userId) {
    return this.repository.remove(userId);
  }
}

export const userService = new UserService();
export default userService;
