import { BaseRepository, type RepositoryRequestConfig } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import {
  DocumentFilterRequestDTO,
  DocumentListResponseDTO,
  DocumentResponseDTO
} from "../dto";

export class DocumentRepository extends BaseRepository {
  list(
    params: DocumentFilterRequestDTO | Record<string, any> = {},
    config: RepositoryRequestConfig = {}
  ): Promise<DocumentListResponseDTO> {
    return this.get<DocumentListResponseDTO>(API_ENDPOINTS.DOCUMENTS.BASE, {
      ...config,
      params,
      queryStruct: DocumentFilterRequestDTO,
      responseStruct: DocumentListResponseDTO
    });
  }

  getById(docId: number | string, config: RepositoryRequestConfig = {}): Promise<DocumentResponseDTO> {
    return this.get<DocumentResponseDTO>(API_ENDPOINTS.DOCUMENTS.BY_ID(docId), {
      ...config,
      responseStruct: DocumentResponseDTO
    });
  }

  downloadEncryptedBlob(docId: number | string, config: RepositoryRequestConfig = {}): Promise<Blob> {
    return this.getBlob(API_ENDPOINTS.DOCUMENTS.DOWNLOAD(docId), config);
  }

  remove(docId: number | string): Promise<any> {
    return this.delete(API_ENDPOINTS.DOCUMENTS.BY_ID(docId));
  }
}

export const documentRepository = new DocumentRepository();
export default documentRepository;
