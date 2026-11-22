import { cryptoRepository, type CryptoRepository } from "../repositories";
import { AppError, ErrorType } from "../utils/errors";
import { triggerBlobDownload } from "../utils/file";
import { flipLastBitInContainer } from "../utils/crypto/tamperSimulator";
import { MAX_UPLOAD_BYTES } from "./EncryptionService";
import type { DecryptDocumentRequestDTO, DocumentResponseDTO } from "../dto";

export class DecryptionService {
  private repository: CryptoRepository;

  constructor(repository: CryptoRepository = cryptoRepository) {
    this.repository = repository;
  }

  validateEncFile(file: File | null | undefined): File {
    if (!file) {
      throw new AppError("Berkas .enc wajib dipilih.", { type: ErrorType.VALIDATION });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new AppError("Ukuran berkas .enc melebihi batas maksimum sistem (125 MB).", {
        type: ErrorType.VALIDATION
      });
    }
    return file;
  }

  isRecipientUser(doc: Pick<DocumentResponseDTO, "recipients"> | null | undefined, userId?: number | null): boolean {
    if (!userId || !Array.isArray(doc?.recipients)) return false;
    return doc.recipients.some((r) => r.recipient_user_id === userId);
  }

  sortDocumentsForUser<T extends Pick<DocumentResponseDTO, "recipients">>(
    docs: T[] | null | undefined,
    userId?: number | null
  ): T[] {
    return [...(docs || [])].sort((a, b) => {
      const aMine = this.isRecipientUser(a, userId) ? 0 : 1;
      const bMine = this.isRecipientUser(b, userId) ? 0 : 1;
      return aMine - bMine;
    });
  }

  simulateOneBitTamper(file: File): Promise<File> {
    return flipLastBitInContainer(file);
  }

  async decrypt(
    payload: DecryptDocumentRequestDTO | Record<string, unknown>,
    onProgress?: (percent: number) => void
  ): Promise<{ blob: Blob; filename: string }> {
    if (!payload?.enc_file && !payload?.document_id) {
      throw new AppError("Pilih dokumen atau unggah berkas .enc terlebih dahulu.", {
        type: ErrorType.VALIDATION
      });
    }
    if (!payload?.use_stored_key && !payload?.private_key_pkcs8) {
      throw new AppError("Kunci pribadi (.pem) wajib disertakan.", {
        type: ErrorType.VALIDATION
      });
    }
    if (!payload?.passphrase) {
      throw new AppError("Kata sandi kunci keamanan wajib diisi.", {
        type: ErrorType.VALIDATION
      });
    }

    const blob = await this.repository.decrypt(payload, (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    });

    const rawFilename = payload.original_filename;
    const downloadName =
      typeof rawFilename === "string" && rawFilename ? rawFilename : "Dokumen_Terpulihkan";
    triggerBlobDownload(blob, downloadName);
    return { blob, filename: downloadName };
  }
}

export const decryptionService = new DecryptionService();
export default decryptionService;
