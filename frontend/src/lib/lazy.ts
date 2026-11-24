/**
 * Lazy Struct Transformer Library
 */

export type SerializeMode = "auto" | "payload" | "json" | "query" | "params" | "formData";

export interface LazyTransformOptions {
  serialize?: boolean;
  mode?: SerializeMode;
}

export interface StructConstructor<T = unknown> {
  new (data: never): T;
  fromResponse?: (data: never) => T;
  schema?: Record<string, StructTarget>;
}

export type StructTarget =
  | StructConstructor<unknown>
  | StructConstructor<unknown>[]
  | SerializeMode
  | typeof FormData
  | null
  | undefined;

interface SerializableObject extends Record<string, unknown> {
  toFormData?: () => FormData;
  toQueryParams?: () => Record<string, unknown>;
  toPayload?: () => Record<string, unknown>;
  toJSONString?: () => string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class Lazy {
  static transform<T = unknown>(
    source: unknown,
    TargetStruct: StructTarget = null,
    options: LazyTransformOptions = {}
  ): T {
    if (source === null || source === undefined) {
      return source as T;
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
      const srcObj = isRecord(source) ? source : null;
      const list: unknown[] = Array.isArray(source)
        ? source
        : Array.isArray(srcObj?.items)
          ? srcObj.items
          : Array.isArray(srcObj?.logs)
            ? srcObj.logs
            : [];
      return list.map((item) => Lazy.transform(item, ItemStruct, options)) as unknown as T;
    }

    if (Array.isArray(source)) {
      return source.map((item) => Lazy.transform(item, TargetStruct, options)) as unknown as T;
    }

    const Ctor = TargetStruct as StructConstructor<unknown>;
    const normalizedSource = isRecord(source) ? source : {};
    let instance: unknown;
    if (source instanceof Ctor) {
      instance = source;
    } else if (typeof Ctor.fromResponse === "function" && !options.serialize) {
      instance = (Ctor.fromResponse as (data: Record<string, unknown>) => unknown)(normalizedSource);
    } else {
      instance = new (Ctor as new (data?: Record<string, unknown>) => unknown)(normalizedSource);
    }

    if (Ctor.schema && typeof Ctor.schema === "object" && isRecord(instance)) {
      for (const [field, FieldStruct] of Object.entries(Ctor.schema)) {
        const fieldVal = instance[field];
        if (fieldVal !== undefined && fieldVal !== null) {
          instance[field] = Lazy.transform(fieldVal, FieldStruct);
        }
      }
    }

    if (options.serialize) {
      return Lazy._serializeStruct(instance, options.mode || "auto") as T;
    }

    return instance as T;
  }

  static _serializeStruct(source: unknown, mode: SerializeMode = "auto"): unknown {
    if (source === null || source === undefined) return source;
    if (typeof source !== "object") return source;
    if (source instanceof FormData || source instanceof Blob || source instanceof File) {
      return source;
    }

    const obj = source as SerializableObject;

    if (mode === "formData") {
      if (typeof obj.toFormData === "function") {
        return obj.toFormData();
      }
      return Lazy._objectToFormData(obj);
    }

    if (mode === "query" || mode === "params") {
      if (typeof obj.toQueryParams === "function") {
        return obj.toQueryParams();
      }
      return Lazy._cleanObject(obj, { stripEmptyString: true });
    }

    if (mode === "payload" || mode === "json") {
      if (typeof obj.toPayload === "function") {
        return obj.toPayload();
      }
      return Lazy._cleanObject(obj);
    }

    if (typeof obj.toFormData === "function") {
      return obj.toFormData();
    }
    if (typeof obj.toPayload === "function") {
      return obj.toPayload();
    }
    if (typeof obj.toQueryParams === "function") {
      return obj.toQueryParams();
    }

    if (Array.isArray(source)) {
      return source.map((item) => Lazy._serializeStruct(item, "auto"));
    }

    return Lazy._cleanObject(obj);
  }

  static _cleanObject(
    obj: Record<string, unknown>,
    { stripEmptyString = false }: { stripEmptyString?: boolean } = {}
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val === undefined) continue;
      if (stripEmptyString && val === "") continue;

      if (val !== null && typeof val === "object" && !(val instanceof Blob) && !(val instanceof File)) {
        const nested = val as SerializableObject;
        if (typeof nested.toJSONString === "function") {
          out[key] = nested.toJSONString();
        } else if (typeof nested.toPayload === "function") {
          out[key] = nested.toPayload();
        } else if (Array.isArray(val)) {
          out[key] = val.map((v) => Lazy._serializeStruct(v, "auto"));
        } else {
          out[key] = Lazy._cleanObject(nested, { stripEmptyString });
        }
      } else {
        out[key] = val;
      }
    }
    return out;
  }

  static _objectToFormData(obj: Record<string, unknown>): FormData {
    const formData = new FormData();
    for (const [key, val] of Object.entries(obj)) {
      if (val === undefined || val === null) continue;
      if (val instanceof Blob || val instanceof File) {
        formData.append(key, val);
      } else if (typeof val === "object") {
        const nested = val as SerializableObject;
        if (typeof nested.toJSONString === "function") {
          formData.append(key, nested.toJSONString());
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
