export { Lazy } from "../lib/lazy";
export * from "./auth.dto";
export * from "./document.dto";
export * from "./key.dto";
export * from "./user.dto";
export * from "./audit.dto";

/**
 * Standar ekstraksi error response dari backend API
 */
export function extractApiError(err, fallbackMessage = "Terjadi kesalahan pada permintaan ke server.") {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (detail && typeof detail.message === "string") {
    return detail.message;
  }
  if (typeof err?.response?.data?.message === "string") {
    return err.response.data.message;
  }
  return fallbackMessage;
}
