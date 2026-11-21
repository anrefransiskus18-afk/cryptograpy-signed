import { documentRepository } from "../repositories";
import { triggerBlobDownload } from "../utils/file";

export class DocumentService {
  constructor(repository = documentRepository) {
    this.repository = repository;
  }

  list(params = {}) {
    return this.repository.list(params);
  }

  getById(docId) {
    return this.repository.getById(docId);
  }

  async downloadEncrypted(doc) {
    const blob = await this.repository.downloadEncryptedBlob(doc.id);
    const filename = `${doc.original_filename}.enc`;
    triggerBlobDownload(blob, filename);
    return filename;
  }

  remove(docId) {
    return this.repository.remove(docId);
  }
}

export const documentService = new DocumentService();
export default documentService;
