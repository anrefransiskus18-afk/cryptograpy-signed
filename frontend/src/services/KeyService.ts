import { keyRepository, type KeyRepository } from "../repositories";
import { useAuthStore } from "../stores/auth";
import { authService, type AuthService } from "./AuthService";
import { AppError, ErrorType } from "../utils/errors";
import { downloadTextAsFile } from "../utils/file";
import type {
  KeyPairGeneratedResponseDTO,
  KeyPassphraseRequestDTO,
  MyKeyStatusResponseDTO,
  PublicKeyDirectoryItemDTO,
  VerifyKeyRequestDTO,
  VerifyKeyResponseDTO
} from "../dto";

export class KeyService {
  private repository: KeyRepository;
  private storeProvider: typeof useAuthStore;
  private authService: AuthService;

  constructor(
    repository: KeyRepository = keyRepository,
    storeProvider: typeof useAuthStore = useAuthStore,
    authSvc: AuthService = authService
  ) {
    this.repository = repository;
    this.storeProvider = storeProvider;
    this.authService = authSvc;
  }

  listPublicKeys(): Promise<PublicKeyDirectoryItemDTO[]> {
    return this.repository.listPublicKeys();
  }

  getMyKey(): Promise<MyKeyStatusResponseDTO> {
    return this.repository.getMyKey();
  }

  async loadKeyPageData(): Promise<{
    myKey: MyKeyStatusResponseDTO;
    directoryKeys: PublicKeyDirectoryItemDTO[];
    localPrivateKeyPem: string;
  }> {
    const store = this.storeProvider();
    const [myKey, directoryKeys] = await Promise.all([
      this.repository.getMyKey(),
      this.repository.listPublicKeys()
    ]);
    const localPrivateKeyPem = store.localPrivateKeyPem || myKey.encrypted_private_key_pem || "";
    return { myKey, directoryKeys, localPrivateKeyPem };
  }

  validatePassphrase(passphrase: string | null | undefined): void {
    if (!passphrase || passphrase.length < 8) {
      throw new AppError("Kata sandi kunci minimal 8 karakter.", {
        type: ErrorType.VALIDATION
      });
    }
  }

  async generateOrRotateKey(
    payload: KeyPassphraseRequestDTO | Record<string, any>,
    isRotation = true
  ): Promise<KeyPairGeneratedResponseDTO> {
    this.validatePassphrase(payload?.passphrase);
    const resDto = isRotation
      ? await this.repository.rotate(payload)
      : await this.repository.generate(payload);

    this.storeProvider().setLocalPrivateKey(resDto.private_key_pkcs8_pem, resDto.fingerprint);
    await this.authService.fetchProfile();
    return resDto;
  }

  verifyOwnership(payload: VerifyKeyRequestDTO | Record<string, any>): Promise<VerifyKeyResponseDTO> {
    return this.repository.verify(payload);
  }

  downloadPublicKey(publicKeyPem: string | null | undefined, fingerprint = "ecc"): void {
    if (!publicKeyPem) return;
    downloadTextAsFile(
      publicKeyPem,
      `kunci_publik_${(fingerprint || "ecc").slice(0, 10)}.pem`,
      "application/x-pem-file"
    );
  }

  downloadPrivateKey(privateKeyPem: string | null | undefined, fingerprint = "ecc"): void {
    if (!privateKeyPem) return;
    downloadTextAsFile(
      privateKeyPem,
      `kunci_pribadi_${(fingerprint || "ecc").slice(0, 10)}.pem`,
      "application/x-pem-file"
    );
  }
}

export const keyService = new KeyService();
export default keyService;
