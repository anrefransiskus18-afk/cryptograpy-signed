/**
 * Centralized Browser Session & Key Storage Adapter.
 * Isolates direct localStorage/sessionStorage key management from stores, router, and interceptors.
 */

export const SESSION_STORAGE_KEYS = {
  JWT_TOKEN: "jwt_token",
  CURRENT_USER: "current_user",
  LOCAL_PRIVATE_KEY: "local_pkcs8_private_key",
  LOCAL_KEY_FINGERPRINT: "local_key_fingerprint"
} as const;

export function getStoredToken(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(SESSION_STORAGE_KEYS.JWT_TOKEN) || "";
}

export function setStoredToken(token: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(SESSION_STORAGE_KEYS.JWT_TOKEN);
  }
  if (typeof sessionStorage === "undefined") return;
  if (token) {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.JWT_TOKEN, token);
  } else {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.JWT_TOKEN);
  }
}

export function getStoredRawUser(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(SESSION_STORAGE_KEYS.CURRENT_USER);
}

export function setStoredUser(user: unknown | null): void {
  if (typeof localStorage === "undefined") return;
  if (user) {
    localStorage.setItem(SESSION_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEYS.CURRENT_USER);
  }
}

export function getStoredPrivateKey(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(SESSION_STORAGE_KEYS.LOCAL_PRIVATE_KEY) || "";
}

export function setStoredPrivateKey(pem: string): void {
  if (typeof sessionStorage === "undefined") return;
  if (pem) {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.LOCAL_PRIVATE_KEY, pem);
  } else {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.LOCAL_PRIVATE_KEY);
  }
}

export function getStoredKeyFingerprint(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(SESSION_STORAGE_KEYS.LOCAL_KEY_FINGERPRINT) || "";
}

export function setStoredKeyFingerprint(fingerprint: string): void {
  if (typeof sessionStorage === "undefined") return;
  if (fingerprint) {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.LOCAL_KEY_FINGERPRINT, fingerprint);
  } else {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.LOCAL_KEY_FINGERPRINT);
  }
}

export function clearAllSessionStorage(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(SESSION_STORAGE_KEYS.JWT_TOKEN);
    localStorage.removeItem(SESSION_STORAGE_KEYS.CURRENT_USER);
  }
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.JWT_TOKEN);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.LOCAL_PRIVATE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.LOCAL_KEY_FINGERPRINT);
  }
}
