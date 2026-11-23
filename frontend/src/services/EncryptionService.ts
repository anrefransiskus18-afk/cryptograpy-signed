import { cryptoRepository, type CryptoRepository } from "../repositories";
import { Lazy, EncryptDocumentRequestDTO, EncryptResultResponseDTO } from "../dto";
import { AppError, ErrorType } from "../utils/errors";
import { triggerBlobDownload } from "../utils/file";

export const MAX_UPLOAD_BYTES = 125 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt",
  ".txt", ".csv", ".json", ".xml", ".zip", ".png", ".jpg", ".jpeg",
  ".md", ".bin", ".enc"
]);

export const CLASSIFICATION_MIN_LEVEL: Record<string, number> = {
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  SECRET: 3,
  TOP_SECRET: 4
};

export class EncryptionService {
  private repository: CryptoRepository;

  constructor(repository: CryptoRepository = cryptoRepository) {
    this.repository = repository;
  }

  validateFile(file: File | null | undefined): File {
    if (!file) {
      throw new AppError("Berkas dokumen wajib dipilih.", { type: ErrorType.VALIDATION });
    }
    if (file.size === 0) {
      throw new AppError("Dokumen yang dipilih kosong (0 byte).", { type: ErrorType.VALIDATION });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new AppError("Ukuran berkas melebihi batas maksimum sistem (125 MB).", {
        type: ErrorType.VALIDATION
      });
    }
    const dotIdx = file.name.lastIndexOf(".");
    if (dotIdx !== -1) {
      const ext = file.name.slice(dotIdx).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new AppError(`Format berkas '${ext}' tidak diizinkan demi keamanan sistem.`, {
          type: ErrorType.VALIDATION
        });
      }
    }
    return file;
  }

  getClearanceMismatchMessage(
    recipient: { full_name?: string; clearance_level?: number } | null | undefined,
    classification: string,
    formatClassification?: (cls: string) => string
  ): string {
    if (!recipient) return "";
    const reqLevel = CLASSIFICATION_MIN_LEVEL[classification] || 1;
    const recLevel = recipient.clearance_level || 1;
    if (recLevel < reqLevel) {
      const clsLabel =
        typeof formatClassification === "function" ? formatClassification(classification) : classification;
      return `Penerima "${recipient.full_name}" memiliki izin akses Level ${recLevel}, sedangkan dokumen "${clsLabel}" membutuhkan minimal Level ${reqLevel}. Silakan pilih penerima lain atau sesuaikan tingkat kerahasiaan.`;
    }
    return "";
  }

  createSampleDocument(): File {
    const sampleText =
      "DOKUMEN INTERNAL RAHASIA PT XYZ\n" +
      "Nomor: 042/DIR-KEU/XI/2026\n" +
      "Klasifikasi: CONFIDENTIAL\n" +
      "Isi: Rencana Anggaran Strategis & Akuisisi Infrastruktur Kriptografi Kuartal IV 2026.\n";
    const blob = new Blob([sampleText], { type: "text/plain" });
    return new File([blob], "Memo_Akuisisi_Strategis_2026.txt", { type: "text/plain" });
  }

  async encrypt(
    payload: EncryptDocumentRequestDTO | Record<string, unknown>,
    onProgress?: (percent: number) => void
  ): Promise<EncryptResultResponseDTO> {
    this.validateFile((payload?.document ?? null) as File | null);
    if (!payload?.recipient_key_id) {
      throw new AppError("Penerima dokumen wajib dipilih.", { type: ErrorType.VALIDATION });
    }

    const reqStruct = Lazy.transform<EncryptDocumentRequestDTO>(payload, EncryptDocumentRequestDTO);
    const res = await this.repository.encrypt(reqStruct, (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    });

    const resultDto = Lazy.transform<EncryptResultResponseDTO>(
      {
        blob: new Blob([res.data], { type: "application/octet-stream" }),
        headers: res.headers as Record<string, string>,
        originalFilename: reqStruct.document?.name || "document"
      },
      EncryptResultResponseDTO
    );
    triggerBlobDownload(resultDto.blob, resultDto.filename);
    return resultDto;
  }

  downloadResult(resultDto: EncryptResultResponseDTO | null | undefined): void {
    if (resultDto?.blob && resultDto?.filename) {
      triggerBlobDownload(resultDto.blob, resultDto.filename);
    }
  }
}

export const encryptionService = new EncryptionService();
export default encryptionService;
