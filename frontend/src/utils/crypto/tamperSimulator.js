/**
 * Utilitas simulasi tampering 1-bit pada kontainer `.enc` di sisi browser
 * untuk pengujian deteksi integritas AES-256-GCM.
 */

export async function flipLastBitInContainer(file) {
  const arrayBuf = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);
  if (bytes.length === 0) {
    return file;
  }
  bytes[bytes.length - 1] ^= 0x01;
  return new File([bytes], `RUSAK_${file.name}`, {
    type: "application/octet-stream"
  });
}
