import httpClient, { LONG_OPERATION_TIMEOUT_MS } from "../api/httpClient";
import { normalizeApiError } from "../utils/errors";

const TRANSIENT_STATUS_CODES = new Set([502, 503, 504]);

/**
 * BaseRepository: Abstraksi dasar akses HTTP API.
 * Mendukung request cancellation (AbortSignal), safe retry untuk operasi GET idempoten,
 * serta normalisasi error komunikasi yang konsisten.
 */
export class BaseRepository {
  constructor(client = httpClient) {
    this.client = client;
    this._inFlightGets = new Map();
  }

  _buildGetKey(url, config) {
    if (config.signal || config.dedupe === false) return null;
    return `${url}::${JSON.stringify(config.params || {})}`;
  }

  async _executeWithSafeGetRetry(fn, retries = 1) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const status = err?.response?.status;
        const isCanceled = err?.code === "ERR_CANCELED" || err?.name === "CanceledError";
        const isTransient = !err?.response || TRANSIENT_STATUS_CODES.has(status);
        if (isCanceled || !isTransient || attempt === retries) {
          throw normalizeApiError(err);
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    throw normalizeApiError(lastError);
  }

  async get(url, config = {}) {
    const retries = config.retries ?? 1;
    const dedupeKey = this._buildGetKey(url, config);
    if (dedupeKey && this._inFlightGets.has(dedupeKey)) {
      return this._inFlightGets.get(dedupeKey);
    }
    const promise = this._executeWithSafeGetRetry(async () => {
      const response = await this.client.get(url, config);
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

  async post(url, data = null, config = {}) {
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }

  async put(url, data = null, config = {}) {
    try {
      const response = await this.client.put(url, data, config);
      return response.data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }

  async patch(url, data = null, config = {}) {
    try {
      const response = await this.client.patch(url, data, config);
      return response.data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }

  async delete(url, config = {}) {
    try {
      const response = await this.client.delete(url, config);
      return response.data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }

  async getBlob(url, config = {}) {
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

  async postMultipart(url, data, config = {}) {
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
