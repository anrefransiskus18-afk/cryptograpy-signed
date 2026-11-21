/**
 * Lazy Struct Transformer Library
 * Berfungsi untuk mentransformasi Request Struct maupun Response Struct (DTO)
 * secara otomatis di seluruh aplikasi tanpa perlu transformasi manual di tiap endpoint.
 */

export class Lazy {
  /**
   * Mentransformasi data mentah ke Struct Class (Response/Request DTO)
   * ATAU mentransformasi instance Struct Class menjadi payload HTTP (JSON / Query / FormData).
   *
   * Contoh penggunaan:
   * 1. Response Object: `Lazy.transform(res.data, UserProfileDTO)`
   * 2. Response Array:  `Lazy.transform(res.data, [UserResponseDTO])` atau `Lazy.transform(res.data, UserResponseDTO)`
   * 3. Request Payload: `Lazy.transform(loginReqDto)` atau `Lazy.transform(rawForm, LoginRequestDTO, { serialize: true })`
   * 4. Request FormData: `Lazy.transform(encryptReqDto, "formData")`
   * 5. Request Query:    `Lazy.transform(filterReqDto, "query")`
   *
   * @param {any} source Data sumber (object mentah, array, atau instance DTO)
   * @param {Function|Array|string|null} [TargetStruct=null] Class DTO tujuan atau mode serialisasi ("payload" | "query" | "formData")
   * @param {Object} [options={}] Opsi tambahan ({ serialize: boolean, mode: "payload" | "query" | "formData" })
   * @returns {any} Hasil transformasi
   */
  static transform(source, TargetStruct = null, options = {}) {
    if (source === null || source === undefined) {
      return source;
    }

    // 1. Jika dipanggil tanpa TargetStruct, atau TargetStruct berupa mode serialisasi ("payload", "query", "formData")
    if (!TargetStruct || typeof TargetStruct === "string" || TargetStruct === FormData) {
      const mode = TargetStruct === FormData ? "formData" : (TargetStruct || options.mode || "auto");
      return Lazy._serializeStruct(source, mode);
    }

    // 2. Jika TargetStruct adalah notasi Array, misal: Lazy.transform(data, [UserResponseDTO])
    if (Array.isArray(TargetStruct)) {
      const ItemStruct = TargetStruct[0];
      const list = Array.isArray(source)
        ? source
        : (Array.isArray(source?.items) ? source.items : (Array.isArray(source?.logs) ? source.logs : []));
      return list.map((item) => Lazy.transform(item, ItemStruct, options));
    }

    // 3. Jika source sendiri adalah Array dan TargetStruct adalah Class DTO
    if (Array.isArray(source)) {
      return source.map((item) => Lazy.transform(item, TargetStruct, options));
    }

    // 4. Instansiasi TargetStruct dari source
    let instance;
    if (source instanceof TargetStruct) {
      instance = source;
    } else if (typeof TargetStruct.fromResponse === "function" && !options.serialize) {
      instance = TargetStruct.fromResponse(source);
    } else {
      instance = new TargetStruct(source);
    }

    // 5. Jika TargetStruct memiliki definisi `static schema`, transformasikan field bersarang (nested structs)
    if (TargetStruct.schema && typeof TargetStruct.schema === "object") {
      for (const [field, FieldStruct] of Object.entries(TargetStruct.schema)) {
        if (instance[field] !== undefined && instance[field] !== null) {
          instance[field] = Lazy.transform(instance[field], FieldStruct);
        }
      }
    }

    // 6. Jika opsi serialize aktif, langsung ubah instance DTO menjadi payload siap kirim
    if (options.serialize) {
      return Lazy._serializeStruct(instance, options.mode || "auto");
    }

    return instance;
  }

  /**
   * Mengubah instance Request Struct / Object menjadi payload siap kirim (JSON, Query Params, atau FormData)
   */
  static _serializeStruct(source, mode = "auto") {
    if (source === null || source === undefined) return source;
    if (typeof source !== "object") return source;
    if (source instanceof FormData || source instanceof Blob || source instanceof File) {
      return source;
    }

    if (mode === "formData") {
      if (typeof source.toFormData === "function") {
        return source.toFormData();
      }
      return Lazy._objectToFormData(source);
    }

    if (mode === "query" || mode === "params") {
      if (typeof source.toQueryParams === "function") {
        return source.toQueryParams();
      }
      return Lazy._cleanObject(source, { stripEmptyString: true });
    }

    if (mode === "payload" || mode === "json") {
      if (typeof source.toPayload === "function") {
        return source.toPayload();
      }
      return Lazy._cleanObject(source);
    }

    // Mode "auto": deteksi metode yang tersedia pada struct
    if (typeof source.toFormData === "function") {
      return source.toFormData();
    }
    if (typeof source.toPayload === "function") {
      return source.toPayload();
    }
    if (typeof source.toQueryParams === "function") {
      return source.toQueryParams();
    }

    if (Array.isArray(source)) {
      return source.map((item) => Lazy._serializeStruct(item, "auto"));
    }

    return Lazy._cleanObject(source);
  }

  /**
   * Membersihkan object dari nilai `undefined` dan menserialisasi nested struct secara rekursif
   */
  static _cleanObject(obj, { stripEmptyString = false } = {}) {
    const out = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val === undefined) continue;
      if (stripEmptyString && val === "") continue;

      if (val !== null && typeof val === "object" && !(val instanceof Blob) && !(val instanceof File)) {
        if (typeof val.toJSONString === "function") {
          out[key] = val.toJSONString();
        } else if (typeof val.toPayload === "function") {
          out[key] = val.toPayload();
        } else if (Array.isArray(val)) {
          out[key] = val.map((v) => Lazy._serializeStruct(v, "auto"));
        } else {
          out[key] = Lazy._cleanObject(val, { stripEmptyString });
        }
      } else {
        out[key] = val;
      }
    }
    return out;
  }

  /**
   * Mengonversi struct/object menjadi FormData secara generik
   */
  static _objectToFormData(obj) {
    const formData = new FormData();
    for (const [key, val] of Object.entries(obj)) {
      if (val === undefined || val === null) continue;
      if (val instanceof Blob || val instanceof File) {
        formData.append(key, val);
      } else if (typeof val === "object") {
        if (typeof val.toJSONString === "function") {
          formData.append(key, val.toJSONString());
        } else {
          formData.append(key, JSON.stringify(val));
        }
      } else {
        formData.append(key, String(val));
      }
    }
    return formData;
  }
}

export default Lazy;
