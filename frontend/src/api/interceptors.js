import { Lazy } from "../lib/lazy";
import { logger } from "../utils/logger";

function createCorrelationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.trunc(performance.now() * 1000)}`;
}

/**
 * Mendaftarkan Request & Response Interceptor pada instance Axios terpusat.
 * Menangani: JWT Bearer, Lazy.transform, Correlation ID, API latency telemetry, dan 401 session reset.
 */
export function attachInterceptors(client) {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("jwt_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const correlationId = config.headers["X-Correlation-ID"] || createCorrelationId();
    config.headers["X-Correlation-ID"] = correlationId;
    config._meta = {
      correlationId,
      startTime: typeof performance !== "undefined" ? performance.now() : Date.now()
    };

    if (config.params) {
      config.params = config.queryStruct
        ? Lazy.transform(config.params, config.queryStruct, { serialize: true, mode: "query" })
        : Lazy.transform(config.params, "query");
    }

    if (config.data !== undefined && config.data !== null) {
      config.data = config.requestStruct
        ? Lazy.transform(config.data, config.requestStruct, {
            serialize: true,
            mode: config.requestMode || "auto"
          })
        : Lazy.transform(config.data);
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const meta = response.config?._meta;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const durationMs = meta ? Math.round(now - meta.startTime) : null;
      const correlationId = response.headers?.["x-correlation-id"] || meta?.correlationId;

      logger.info("api_request_ok", {
        method: response.config?.method?.toUpperCase(),
        url: response.config?.url,
        status: response.status,
        durationMs,
        correlationId
      });

      if (response.config?.responseStruct && !(response.data instanceof Blob)) {
        response.data = Lazy.transform(response.data, response.config.responseStruct);
      }
      return response;
    },
    async (error) => {
      const meta = error.config?._meta;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const durationMs = meta ? Math.round(now - meta.startTime) : null;
      const correlationId = error.response?.headers?.["x-correlation-id"] || meta?.correlationId;

      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          error.response.data = JSON.parse(text);
        } catch {
          // biarkan jika respons error bukan JSON
        }
      }

      logger.warn("api_request_failed", {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: error.response?.status || null,
        code: error.code || null,
        durationMs,
        correlationId
      });

      if (error.response && error.response.status === 401) {
        const currentPath = window.location.pathname;
        if (currentPath !== "/login") {
          localStorage.removeItem("jwt_token");
          localStorage.removeItem("current_user");
          sessionStorage.removeItem("local_pkcs8_private_key");
          sessionStorage.removeItem("local_key_fingerprint");
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );
}
