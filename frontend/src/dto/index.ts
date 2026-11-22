export { Lazy } from "../lib/lazy";
export * from "./auth.dto";
export * from "./document.dto";
export * from "./key.dto";
export * from "./user.dto";
export * from "./audit.dto";

/**
 * Standar ekstraksi error response dari backend API
 */
export function extractApiError(
  err: unknown,
  fallbackMessage = "Terjadi kesalahan pada permintaan ke server."
): string {
  const e = err as {
    response?: {
      data?: {
        detail?: string | { message?: string };
        message?: string;
      };
    };
  } | null | undefined;
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (detail && typeof detail === "object" && typeof detail.message === "string") {
    return detail.message;
  }
  if (typeof e?.response?.data?.message === "string") {
    return e.response.data.message;
  }
  return fallbackMessage;
}
