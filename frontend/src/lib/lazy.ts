/**
 * Lazy Struct Transformer Library
 */

export type SerializeMode = "auto" | "payload" | "json" | "query" | "params" | "formData";

export interface LazyTransformOptions {
  serialize?: boolean;
  mode?: SerializeMode;
}

export interface StructConstructor<T = any> {
  new (data?: any): T;
  fromResponse?: (data: any) => T;
  schema?: Record<string, StructTarget>;
}

export type StructTarget =
  | StructConstructor
  | StructConstructor[]
  | SerializeMode
  | typeof FormData
  | null
  | undefined;

export class Lazy {
  static transform<T = any>(
    source: any,
    TargetStruct: StructTarget = null,
    options: LazyTransformOptions = {}
  ): T {
    if (source === null || source === undefined) {
      return source;
    }

    if (!TargetStruct || typeof TargetStruct === "string" || TargetStruct === FormData) {
      const mode: SerializeMode =
        TargetStruct === FormData
          ? "formData"
          : ((TargetStruct as SerializeMode) || options.mode || "auto");
      return Lazy._serializeStruct(source, mode) as T;
    }

    if (Array.isArray(TargetStruct)) {
      const ItemStruct = TargetStruct[0];
      const list: any[] = Array.isArray(source)
        ? source
        : Array.isArray(source?.items)
          ? source.items
          : Array.isArray(source?.logs)
            ? source.logs
            : [];
      return list.map((item) => Lazy.transform(item, ItemStruct, options)) as unknown as T;
    }

    if (Array.isArray(source)) {
      return source.map((item) => Lazy.transform(item, TargetStruct, options)) as unknown as T;
    }

    const Ctor = TargetStruct as StructConstructor;
    let instance: any;
    if (source instanceof Ctor) {
      instance = source;
    } else if (typeof Ctor.fromResponse === "function" && !options.serialize) {
      instance = Ctor.fromResponse(source);
    } else {
      instance = new Ctor(source);
    }

    if (Ctor.schema && typeof Ctor.schema === "object") {
      for (const [field, FieldStruct] of Object.entries(Ctor.schema)) {
        if (instance[field] !== undefined && instance[field] !== null) {
          instance[field] = Lazy.transform(instance[field], FieldStruct);
        }
      }
    }

    if (options.serialize) {
      return Lazy._serializeStruct(instance, options.mode || "auto") as T;
    }

    return instance as T;
  }

  static _serializeStruct(source: any, mode: SerializeMode = "auto"): any {
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

  static _cleanObject(
    obj: Record<string, any>,
    { stripEmptyString = false }: { stripEmptyString?: boolean } = {}
  ): Record<string, any> {
    const out: Record<string, any> = {};
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

  static _objectToFormData(obj: Record<string, any>): FormData {
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
