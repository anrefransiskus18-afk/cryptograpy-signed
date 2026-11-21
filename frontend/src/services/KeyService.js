import { keyRepository } from "../repositories";
import { useAuthStore } from "../stores/auth";
import { authService } from "./AuthService";
import { AppError, ErrorType } from "../utils/errors";
import { downloadTextAsFile } from "../utils/file";

export class KeyService {
  constructor(repository = keyRepository, storeProvider = useAuthStore, authSvc = authService) {
    this.repository = repository;
    this.storeProvider = storeProvider;
    this.authService = authSvc;
  }

  listPublicKeys() {
    return this.repository.listPublicKeys();
  }

  getMyKey() {
    return this.repository.getMyKey();
  }

  async loadKeyPageData() {
    const store = this.storeProvider();
    const [myKey, directoryKeys] = await Promise.all([
      this.repository.getMyKey(),
      this.repository.listPublicKeys()
    ]);
    const localPrivateKeyPem = store.localPrivateKeyPem || myKey.encrypted_private_key_pem || "";
    return { myKey, directoryKeys, localPrivateKeyPem };
  }

  validatePassphrase(passphrase) {
    if (!passphrase || passphrase.length < 8) {
      throw new AppError("Kata sandi kunci minimal 8 karakter.", {
        type: ErrorType.VALIDATION
      });
    }
  }

  async generateOrRotateKey(payload, isRotation = true) {
    this.validatePassphrase(payload?.passphrase);
    const resDto = isRotation
      ? await this.repository.rotate(payload)
      : await this.repository.generate(payload);

    this.storeProvider().setLocalPrivateKey(resDto.private_key_pkcs8_pem, resDto.fingerprint);
    await this.authService.fetchProfile();
    return resDto;
  }

  verifyOwnership(payload) {
    return this.repository.verify(payload);
  }

  downloadPublicKey(publicKeyPem, fingerprint = "ecc") {
    if (!publicKeyPem) return;
    downloadTextAsFile(
      publicKeyPem,
      `kunci_publik_${(fingerprint || "ecc").slice(0, 10)}.pem`,
      "application/x-pem-file"
    );
  }

  downloadPrivateKey(privateKeyPem, fingerprint = "ecc") {
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
