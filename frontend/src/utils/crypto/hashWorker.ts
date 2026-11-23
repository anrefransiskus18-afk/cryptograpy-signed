/**
 * Non-blocking SHA-256 Digest Utility.
 * Offloads large buffer hashing to a Web Worker with correlation ID validation,
 * timeout safety, and automatic WebCrypto fallback.
 */

export interface HashWorkerRequest {
  correlationId: string;
  buffer: ArrayBuffer;
}

export interface HashWorkerResponse {
  correlationId?: string;
  ok: boolean;
  hex?: string;
  error?: string;
}

const WORKER_TIMEOUT_MS = 30_000;

function createCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `hash-${Date.now()}-${Math.trunc(performance.now() * 1000)}`;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] ?? 0).toString(16).padStart(2, "0");
  }
  return hex;
}

export async function sha256HexFallback(data: ArrayBuffer | Uint8Array): Promise<string> {
  const view = data instanceof Uint8Array ? data : new Uint8Array(data);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", copy);
  return bufferToHex(digest);
}

export async function computeSha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const canUseWorker =
    typeof Worker !== "undefined" &&
    typeof Blob !== "undefined" &&
    typeof URL !== "undefined" &&
    typeof URL.createObjectURL === "function";

  if (!canUseWorker) {
    return sha256HexFallback(data);
  }

  const workerCode = `
    self.onmessage = async (e) => {
      const msg = e.data || {};
      const correlationId = msg.correlationId;
      try {
        const digest = await crypto.subtle.digest("SHA-256", msg.buffer);
        const bytes = new Uint8Array(digest);
        let hex = "";
        for (let i = 0; i < bytes.length; i++) {
          hex += bytes[i].toString(16).padStart(2, "0");
        }
        self.postMessage({ correlationId, ok: true, hex });
      } catch (err) {
        self.postMessage({ correlationId, ok: false, error: String(err) });
      }
    };
  `;

  let workerUrl = "";
  let worker: Worker | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const correlationId = createCorrelationId();

  try {
    const blob = new Blob([workerCode], { type: "application/javascript" });
    workerUrl = URL.createObjectURL(blob);
    worker = new Worker(workerUrl);

    const view = data instanceof Uint8Array ? data : new Uint8Array(data);
    const transferable = view.slice().buffer;

    return await new Promise<string>((resolve, reject) => {
      if (!worker) {
        reject(new Error("Worker unavailable"));
        return;
      }
      timer = setTimeout(() => {
        reject(new Error("Worker hashing timed out"));
      }, WORKER_TIMEOUT_MS);

      worker.onmessage = (event: MessageEvent<HashWorkerResponse>) => {
        const res = event.data;
        if (!res || res.correlationId !== correlationId) return;
        if (res.ok && res.hex) {
          resolve(res.hex);
        } else {
          reject(new Error(res.error || "Worker hashing failed"));
        }
      };
      worker.onerror = () => reject(new Error("Worker execution blocked"));
      const req: HashWorkerRequest = { correlationId, buffer: transferable };
      worker.postMessage(req, [transferable]);
    });
  } catch {
    return sha256HexFallback(data);
  } finally {
    if (timer) clearTimeout(timer);
    worker?.terminate();
    if (workerUrl) {
      URL.revokeObjectURL(workerUrl);
    }
  }
}
