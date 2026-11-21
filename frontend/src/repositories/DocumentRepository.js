import { BaseRepository } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import {
  DocumentFilterRequestDTO,
  DocumentListResponseDTO,
  DocumentResponseDTO
} from "../dto";

export class DocumentRepository extends BaseRepository {
  list(params = {}, config = {}) {
    return this.get(API_ENDPOINTS.DOCUMENTS.BASE, {
      ...config,
      params,
      queryStruct: DocumentFilterRequestDTO,
      responseStruct: DocumentListResponseDTO
    });
  }

  getById(docId, config = {}) {
    return this.get(API_ENDPOINTS.DOCUMENTS.BY_ID(docId), {
      ...config,
      responseStruct: DocumentResponseDTO
    });
  }

  downloadEncryptedBlob(docId, config = {}) {
    return this.getBlob(API_ENDPOINTS.DOCUMENTS.DOWNLOAD(docId), config);
  }

  remove(docId) {
    return this.delete(API_ENDPOINTS.DOCUMENTS.BY_ID(docId));
  }
}

export const documentRepository = new DocumentRepository();
export default documentRepository;
