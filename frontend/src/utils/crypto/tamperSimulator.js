/**
 * Utilitas simulasi tampering 1-bit pada kontainer `.enc` di sisi browser
 * untuk pengujian deteksi integritas AES-256-GCM.
 * Menggunakan Blob.slice() agar konsumsi memori O(1) bahkan untuk file 125 MiB.
 */

export async function flipLastBitInContainer(file) {
  if (!file || file.size === 0) {
    return file;
  }
  const prefix = file.slice(0, file.size - 1);
  const lastByteBuf = await file.slice(file.size - 1).arrayBuffer();
  const lastByte = new Uint8Array(lastByteBuf);
  lastByte[0] ^= 0x01;
  return new File([prefix, lastByte], `RUSAK_${file.name}`, {
    type: "application/octet-stream"
  });
}
