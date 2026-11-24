/**
 * Zero-dependency Runtime Boundary Validators & Type Guards.
 * Validates untrusted external payloads and cancellation errors at runtime.
 */
import { AppError } from "./errors";

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isCanceledError(err: unknown): boolean {
  return err instanceof AppError && err.errorCode === "ERR_CANCELED";
}

export function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`Expected non-empty string for "${fieldName}".`);
  }
  return value;
}

export function assertFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Expected finite number for "${fieldName}".`);
  }
  return value;
}

export function assertArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
  fieldName: string
): T[] {
  if (!Array.isArray(value) || !value.every(guard)) {
    throw new TypeError(`Expected valid array for "${fieldName}".`);
  }
  return value;
}

/**
 * Runtime DTO field-reading helpers for narrowing `Record<string, unknown>` safely.
 */
export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

export function asNullableString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return fallback;
  return Boolean(value);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? value : {};
}

export function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(isPlainRecord);
}

export function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === "string");
}
