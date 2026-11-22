/**
 * Non-blocking SHA-256 Digest Utility.
 * Offloads large buffer hashing to a Web Worker when supported, with automatic WebCrypto fallback.
 */

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
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
      try {
        const digest = await crypto.subtle.digest("SHA-256", e.data);
        const bytes = new Uint8Array(digest);
        let hex = "";
        for (let i = 0; i < bytes.length; i++) {
          hex += bytes[i].toString(16).padStart(2, "0");
        }
        self.postMessage({ ok: true, hex });
      } catch (err) {
        self.postMessage({ ok: false, error: String(err) });
      }
    };
  `;

  let workerUrl = "";
  let worker: Worker | null = null;
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
      worker.onmessage = (event: MessageEvent<{ ok: boolean; hex?: string; error?: string }>) => {
        if (event.data?.ok && event.data.hex) {
          resolve(event.data.hex);
        } else {
          reject(new Error(event.data?.error || "Worker hashing failed"));
        }
      };
      worker.onerror = () => reject(new Error("Worker execution blocked"));
      worker.postMessage(transferable, [transferable]);
    });
  } catch {
    return sha256HexFallback(data);
  } finally {
    worker?.terminate();
    if (workerUrl) {
      URL.revokeObjectURL(workerUrl);
    }
  }
}
