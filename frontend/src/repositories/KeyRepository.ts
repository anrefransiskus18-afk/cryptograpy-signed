import { BaseRepository, type RepositoryRequestConfig } from "./BaseRepository";
import { API_ENDPOINTS } from "../constants/endpoints";
import {
  KeyPassphraseRequestDTO,
  VerifyKeyRequestDTO,
  PublicKeyDirectoryItemDTO,
  MyKeyStatusResponseDTO,
  KeyPairGeneratedResponseDTO,
  VerifyKeyResponseDTO
} from "../dto";

export class KeyRepository extends BaseRepository {
  listPublicKeys(config: RepositoryRequestConfig = {}): Promise<PublicKeyDirectoryItemDTO[]> {
    return this.get<PublicKeyDirectoryItemDTO[]>(API_ENDPOINTS.KEYS.LIST, {
      ...config,
      responseStruct: [PublicKeyDirectoryItemDTO]
    });
  }

  getMyKey(config: RepositoryRequestConfig = {}): Promise<MyKeyStatusResponseDTO> {
    return this.get<MyKeyStatusResponseDTO>(API_ENDPOINTS.KEYS.ME, {
      ...config,
      responseStruct: MyKeyStatusResponseDTO
    });
  }

  generate(payload: KeyPassphraseRequestDTO | Record<string, any>): Promise<KeyPairGeneratedResponseDTO> {
    return this.post<KeyPairGeneratedResponseDTO>(API_ENDPOINTS.KEYS.GENERATE, payload, {
      requestStruct: KeyPassphraseRequestDTO,
      responseStruct: KeyPairGeneratedResponseDTO
    });
  }

  rotate(payload: KeyPassphraseRequestDTO | Record<string, any>): Promise<KeyPairGeneratedResponseDTO> {
    return this.post<KeyPairGeneratedResponseDTO>(API_ENDPOINTS.KEYS.ROTATE, payload, {
      requestStruct: KeyPassphraseRequestDTO,
      responseStruct: KeyPairGeneratedResponseDTO
    });
  }

  verify(payload: VerifyKeyRequestDTO | Record<string, any>): Promise<VerifyKeyResponseDTO> {
    return this.post<VerifyKeyResponseDTO>(API_ENDPOINTS.KEYS.VERIFY, payload, {
      requestStruct: VerifyKeyRequestDTO,
      responseStruct: VerifyKeyResponseDTO
    });
  }
}

export const keyRepository = new KeyRepository();
export default keyRepository;
