import { cryptoRepository } from "../repositories";
import { AppError, ErrorType } from "../utils/errors";
import { triggerBlobDownload } from "../utils/file";
import { flipLastBitInContainer } from "../utils/crypto/tamperSimulator";
import { MAX_UPLOAD_BYTES } from "./EncryptionService";

export class DecryptionService {
  constructor(repository = cryptoRepository) {
    this.repository = repository;
  }

  validateEncFile(file) {
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

  isRecipientUser(doc, userId) {
    if (!userId || !Array.isArray(doc?.recipients)) return false;
    return doc.recipients.some((r) => r.recipient_user_id === userId);
  }

  sortDocumentsForUser(docs, userId) {
    return [...(docs || [])].sort((a, b) => {
      const aMine = this.isRecipientUser(a, userId) ? 0 : 1;
      const bMine = this.isRecipientUser(b, userId) ? 0 : 1;
      return aMine - bMine;
    });
  }

  simulateOneBitTamper(file) {
    return flipLastBitInContainer(file);
  }

  async decrypt(payload, onProgress) {
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

    const downloadName = payload.original_filename || "Dokumen_Terpulihkan";
    triggerBlobDownload(blob, downloadName);
    return { blob, filename: downloadName };
  }
}

export const decryptionService = new DecryptionService();
export default decryptionService;
