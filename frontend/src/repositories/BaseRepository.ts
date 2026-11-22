import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import httpClient, { LONG_OPERATION_TIMEOUT_MS } from "../api/httpClient";
import { normalizeApiError } from "../utils/errors";
import type { StructTarget, SerializeMode } from "../lib/lazy";

export interface RepositoryRequestConfig extends AxiosRequestConfig {
  retries?: number;
  dedupe?: boolean;
  queryStruct?: StructTarget;
  requestStruct?: StructTarget;
  requestMode?: SerializeMode;
  responseStruct?: StructTarget;
}

const TRANSIENT_STATUS_CODES = new Set([502, 503, 504]);

export class BaseRepository {
  protected client: AxiosInstance;
  private _inFlightGets: Map<string, Promise<unknown>>;

  constructor(client: AxiosInstance = httpClient) {
    this.client = client;
    this._inFlightGets = new Map();
  }

  private _buildGetKey(url: string, config: RepositoryRequestConfig): string | null {
    if (config.signal || config.dedupe === false) return null;
    return `${url}::${JSON.stringify(config.params || {})}`;
  }

  private async _executeWithSafeGetRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        lastError = err;
        const httpErr = err as { response?: { status?: number }; code?: string; name?: string } | null;
        const status = httpErr?.response?.status;
        const isCanceled = httpErr?.code === "ERR_CANCELED" || httpErr?.name === "CanceledError";
        const isTransient = !httpErr?.response || (status !== undefined && TRANSIENT_STATUS_CODES.has(status));
        if (isCanceled || !isTransient || attempt === retries) {
          throw normalizeApiError(err);
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    throw normalizeApiError(lastError);
  }

  async get<T = any>(url: string, config: RepositoryRequestConfig = {}): Promise<T> {
    const retries = config.retries ?? 1;
    const dedupeKey = this._buildGetKey(url, config);
    if (dedupeKey && this._inFlightGets.has(dedupeKey)) {
      return this._inFlightGets.get(dedupeKey) as Promise<T>;
    }
    const promise = this._executeWithSafeGetRetry<T>(async () => {
      const response = await this.client.get<T>(url, config);
      return response.data;
    }, retries);

    if (!dedupeKey) {
      return promise;
    }
    this._inFlightGets.set(dedupeKey, promise);
    try {
      return await promise;
    } finally {
      this._inFlightGets.delete(dedupeKey);
    }
  }

  async post<T = any>(url: string, data: unknown = null, config: RepositoryRequestConfig = {}): Promise<T> {
    try {
      const response = await this.client.post<T>(url, data, config);
      return response.data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }

  async put<T = any>(url: string, data: unknown = null, config: RepositoryRequestConfig = {}): Promise<T> {
    try {
      const response = await this.client.put<T>(url, data, config);
      return response.data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }

  async patch<T = any>(url: string, data: unknown = null, config: RepositoryRequestConfig = {}): Promise<T> {
    try {
      const response = await this.client.patch<T>(url, data, config);
      return response.data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }

  async delete<T = any>(url: string, config: RepositoryRequestConfig = {}): Promise<T> {
    try {
      const response = await this.client.delete<T>(url, config);
      return response.data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }

  async getBlob(url: string, config: RepositoryRequestConfig = {}): Promise<Blob> {
    const retries = config.retries ?? 1;
    return this._executeWithSafeGetRetry(async () => {
      const response = await this.client.get(url, {
        responseType: "blob",
        timeout: LONG_OPERATION_TIMEOUT_MS,
        ...config
      });
      return new Blob([response.data], { type: "application/octet-stream" });
    }, retries);
  }

  async postMultipart(
    url: string,
    data: unknown,
    config: RepositoryRequestConfig = {}
  ): Promise<AxiosResponse<Blob>> {
    try {
      return await this.client.post(url, data, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: "blob",
        timeout: LONG_OPERATION_TIMEOUT_MS,
        ...config
      });
    } catch (err) {
      throw normalizeApiError(err);
    }
  }
}

export default BaseRepository;
