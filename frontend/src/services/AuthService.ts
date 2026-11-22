import { authRepository, type AuthRepository } from "../repositories";
import { useAuthStore } from "../stores/auth";
import { Lazy, LoginRequestDTO, type LoginResponseDTO, type UserProfileDTO } from "../dto";
import { AppError, ErrorType } from "../utils/errors";

export class AuthService {
  private repository: AuthRepository;
  private storeProvider: typeof useAuthStore;

  constructor(repository: AuthRepository = authRepository, storeProvider: typeof useAuthStore = useAuthStore) {
    this.repository = repository;
    this.storeProvider = storeProvider;
  }

  async login(username: string, password: string): Promise<LoginResponseDTO> {
    const reqDto = Lazy.transform<LoginRequestDTO>({ username, password }, LoginRequestDTO);
    if (!reqDto.username || !reqDto.password) {
      throw new AppError("Username/Email dan kata sandi wajib diisi.", {
        type: ErrorType.VALIDATION
      });
    }
    const resDto = await this.repository.login(reqDto);
    this.storeProvider().setSession(resDto.access_token, resDto.user);
    return resDto;
  }

  async logout(): Promise<void> {
    const store = this.storeProvider();
    try {
      if (store.token) {
        await this.repository.logout();
      }
    } catch {
      // Abaikan error jaringan saat logout agar sesi lokal tetap dibersihkan
    } finally {
      store.clearSession();
    }
  }

  async fetchProfile(): Promise<UserProfileDTO> {
    const profileDto = await this.repository.getMe();
    return this.storeProvider().setUser(profileDto);
  }

  async updateProfile(payload: Record<string, any>): Promise<UserProfileDTO> {
    const updated = await this.repository.updateMe(payload);
    this.storeProvider().setUser(updated);
    return updated;
  }

  async changePassword(payload: Record<string, any>, confirmPassword?: string): Promise<any> {
    const newPass = String(payload?.new_password || "");
    if (newPass.length < 8) {
      throw new AppError("Kata sandi baru minimal harus 8 karakter.", {
        type: ErrorType.VALIDATION
      });
    }
    if (confirmPassword !== undefined && newPass !== confirmPassword) {
      throw new AppError("Konfirmasi kata sandi baru tidak cocok.", {
        type: ErrorType.VALIDATION
      });
    }
    const res = await this.repository.changePassword(payload);
    if (res?.relogin_required) {
      await this.logout();
    }
    return res;
  }
}

export const authService = new AuthService();
export default authService;
