import { encryptionService } from "./EncryptionService";
import { decryptionService } from "./DecryptionService";
import { keyRepository, settingsRepository } from "../repositories";

/**
 * CryptoService: Orkestrator tingkat tinggi untuk operasi kriptografi dokumen.
 */
export class CryptoService {
  constructor(
    encService = encryptionService,
    decService = decryptionService,
    keyRepo = keyRepository,
    settingsRepo = settingsRepository
  ) {
    this.encryption = encService;
    this.decryption = decService;
    this.keyRepo = keyRepo;
    this.settingsRepo = settingsRepo;
  }

  async loadEncryptionConfig() {
    const [recipientKeys, settings] = await Promise.all([
      this.keyRepo.listPublicKeys(),
      this.settingsRepo.getSettings().catch(() => null)
    ]);
    return { recipientKeys, settings };
  }

  encrypt(payload, onProgress) {
    return this.encryption.encrypt(payload, onProgress);
  }

  decrypt(payload, onProgress) {
    return this.decryption.decrypt(payload, onProgress);
  }
}

export const cryptoService = new CryptoService();
export default cryptoService;
