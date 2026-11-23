import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { Lazy, type StructTarget, type SerializeMode } from "../lib/lazy";
import { logger } from "../utils/logger";
import { clearAllSessionStorage, getStoredToken } from "../utils/sessionStorage";

export interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  queryStruct?: StructTarget;
  requestStruct?: StructTarget;
  requestMode?: SerializeMode;
  responseStruct?: StructTarget;
  _meta?: {
    correlationId: string;
    startTime: number;
  };
}

function createCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.trunc(performance.now() * 1000)}`;
}

function readCookie(name: string): string {
  if (typeof document === "undefined" || !document.cookie) return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function attachInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use((rawConfig) => {
    const config = rawConfig as ExtendedAxiosRequestConfig;
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = (config.method || "get").toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
      const csrf = readCookie("csrf_token");
      if (csrf && !config.headers["X-CSRF-Token"]) {
        config.headers["X-CSRF-Token"] = csrf;
      }
    }

    const correlationId = (config.headers["X-Correlation-ID"] as string) || createCorrelationId();
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
    (response: AxiosResponse) => {
      const cfg = response.config as ExtendedAxiosRequestConfig | undefined;
      const meta = cfg?._meta;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const durationMs = meta ? Math.round(now - meta.startTime) : null;
      const correlationId = response.headers?.["x-correlation-id"] || meta?.correlationId;

      logger.info("api_request_ok", {
        method: cfg?.method?.toUpperCase(),
        url: cfg?.url,
        status: response.status,
        durationMs,
        correlationId
      });

      if (cfg?.responseStruct && !(response.data instanceof Blob)) {
        response.data = Lazy.transform(response.data, cfg.responseStruct);
      }
      return response;
    },
    async (error) => {
      const cfg = error?.config as ExtendedAxiosRequestConfig | undefined;
      const meta = cfg?._meta;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const durationMs = meta ? Math.round(now - meta.startTime) : null;
      const correlationId = error?.response?.headers?.["x-correlation-id"] || meta?.correlationId;

      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          error.response.data = JSON.parse(text);
        } catch {
          // biarkan jika respons error bukan JSON
        }
      }

      logger.warn("api_request_failed", {
        method: cfg?.method?.toUpperCase(),
        url: cfg?.url,
        status: error?.response?.status || null,
        code: error?.code || null,
        durationMs,
        correlationId
      });

      if (error?.response && error.response.status === 401) {
        const currentPath = window.location.pathname;
        if (currentPath !== "/login") {
          clearAllSessionStorage();
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );
}
