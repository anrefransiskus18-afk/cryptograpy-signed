import type { AxiosProgressEvent, AxiosResponse } from "axios";
import { BaseRepository, type RepositoryRequestConfig } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import { DecryptDocumentRequestDTO } from "../dto";

export class CryptoRepository extends BaseRepository {
  encrypt(
    formDataOrStruct: unknown,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
    config: RepositoryRequestConfig = {}
  ): Promise<AxiosResponse<Blob>> {
    return this.postMultipart(API_ENDPOINTS.CRYPTO.ENCRYPT, formDataOrStruct, {
      ...config,
      onUploadProgress
    });
  }

  async decrypt(
    payload: DecryptDocumentRequestDTO | Record<string, unknown>,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
    config: RepositoryRequestConfig = {}
  ): Promise<Blob> {
    const response = await this.postMultipart(API_ENDPOINTS.CRYPTO.DECRYPT, payload, {
      ...config,
      requestStruct: DecryptDocumentRequestDTO,
      requestMode: "formData",
      onUploadProgress
    });
    return new Blob([response.data], { type: "application/octet-stream" });
  }
}

export const cryptoRepository = new CryptoRepository();
export default cryptoRepository;
