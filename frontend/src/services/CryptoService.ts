import { encryptionService, type EncryptionService } from "./EncryptionService";
import { decryptionService, type DecryptionService } from "./DecryptionService";
import {
  keyRepository,
  settingsRepository,
  type KeyRepository,
  type SettingsRepository
} from "../repositories";
import type {
  DecryptDocumentRequestDTO,
  EncryptDocumentRequestDTO,
  EncryptResultResponseDTO,
  PublicKeyDirectoryItemDTO,
  SystemSettingsDTO
} from "../dto";

export class CryptoService {
  private encryption: EncryptionService;
  private decryption: DecryptionService;
  private keyRepo: KeyRepository;
  private settingsRepo: SettingsRepository;

  constructor(
    encService: EncryptionService = encryptionService,
    decService: DecryptionService = decryptionService,
    keyRepo: KeyRepository = keyRepository,
    settingsRepo: SettingsRepository = settingsRepository
  ) {
    this.encryption = encService;
    this.decryption = decService;
    this.keyRepo = keyRepo;
    this.settingsRepo = settingsRepo;
  }

  async loadEncryptionConfig(): Promise<{
    recipientKeys: PublicKeyDirectoryItemDTO[];
    settings: SystemSettingsDTO | null;
  }> {
    const [recipientKeys, settings] = await Promise.all([
      this.keyRepo.listPublicKeys(),
      this.settingsRepo.getSettings().catch(() => null)
    ]);
    return { recipientKeys, settings };
  }

  encrypt(
    payload: EncryptDocumentRequestDTO | Record<string, any>,
    onProgress?: (percent: number) => void
  ): Promise<EncryptResultResponseDTO> {
    return this.encryption.encrypt(payload, onProgress);
  }

  decrypt(
    payload: DecryptDocumentRequestDTO | Record<string, any>,
    onProgress?: (percent: number) => void
  ): Promise<{ blob: Blob; filename: string }> {
    return this.decryption.decrypt(payload, onProgress);
  }
}

export const cryptoService = new CryptoService();
export default cryptoService;
