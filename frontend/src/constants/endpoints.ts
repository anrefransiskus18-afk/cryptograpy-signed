export const API_ENDPOINTS = Object.freeze({
  AUTH: {
    LOGIN: "/login",
    LOGOUT: "/logout",
    ME: "/me",
    CHANGE_PASSWORD: "/change-password"
  },
  CRYPTO: {
    ENCRYPT: "/encrypt",
    DECRYPT: "/decrypt"
  },
  DOCUMENTS: {
    BASE: "/documents",
    BY_ID: (id: number | string) => `/documents/${id}`,
    DOWNLOAD: (id: number | string) => `/documents/${id}/download`,
    REVOKE_RECIPIENT: (docId: number | string, userId: number | string) =>
      `/documents/${docId}/recipients/${userId}/revoke`
  },
  KEYS: {
    LIST: "/keys",
    ME: "/keys/me",
    GENERATE: "/keys/generate",
    ROTATE: "/keys/rotate",
    VERIFY: "/keys/verify"
  },
  USERS: {
    BASE: "/users",
    BY_ID: (id: number | string) => `/users/${id}`
  },
  AUDIT: {
    LOGS: "/audit",
    AUTH_LOGS: "/auth-logs",
    VERIFY_CHAIN: "/audit/verify-chain"
  },
  DASHBOARD: {
    STATS: "/stats"
  },
  SETTINGS: {
    BASE: "/settings",
    BENCHMARKS: "/benchmarks/latest"
  }
} as const);
