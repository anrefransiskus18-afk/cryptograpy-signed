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
