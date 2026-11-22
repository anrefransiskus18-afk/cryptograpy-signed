import { documentRepository, type DocumentRepository } from "../repositories";
import { triggerBlobDownload } from "../utils/file";
import type { DocumentFilterRequestDTO, DocumentListResponseDTO, DocumentResponseDTO } from "../dto";

export class DocumentService {
  private repository: DocumentRepository;

  constructor(repository: DocumentRepository = documentRepository) {
    this.repository = repository;
  }

  list(params: DocumentFilterRequestDTO | Record<string, any> = {}): Promise<DocumentListResponseDTO> {
    return this.repository.list(params);
  }

  getById(docId: number | string): Promise<DocumentResponseDTO> {
    return this.repository.getById(docId);
  }

  async downloadEncrypted(doc: { id: number | string; original_filename: string }): Promise<string> {
    const blob = await this.repository.downloadEncryptedBlob(doc.id);
    const filename = `${doc.original_filename}.enc`;
    triggerBlobDownload(blob, filename);
    return filename;
  }

  remove(docId: number | string): Promise<any> {
    return this.repository.remove(docId);
  }
}

export const documentService = new DocumentService();
export default documentService;
