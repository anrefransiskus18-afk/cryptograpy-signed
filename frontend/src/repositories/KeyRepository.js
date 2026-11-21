import { BaseRepository } from "./BaseRepository";
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
  listPublicKeys(config = {}) {
    return this.get(API_ENDPOINTS.KEYS.LIST, {
      ...config,
      responseStruct: [PublicKeyDirectoryItemDTO]
    });
  }

  getMyKey(config = {}) {
    return this.get(API_ENDPOINTS.KEYS.ME, {
      ...config,
      responseStruct: MyKeyStatusResponseDTO
    });
  }

  generate(payload) {
    return this.post(API_ENDPOINTS.KEYS.GENERATE, payload, {
      requestStruct: KeyPassphraseRequestDTO,
      responseStruct: KeyPairGeneratedResponseDTO
    });
  }

  rotate(payload) {
    return this.post(API_ENDPOINTS.KEYS.ROTATE, payload, {
      requestStruct: KeyPassphraseRequestDTO,
      responseStruct: KeyPairGeneratedResponseDTO
    });
  }

  verify(payload) {
    return this.post(API_ENDPOINTS.KEYS.VERIFY, payload, {
      requestStruct: VerifyKeyRequestDTO,
      responseStruct: VerifyKeyResponseDTO
    });
  }
}

export const keyRepository = new KeyRepository();
export default keyRepository;
