/**
 * Utilitas unduhan berkas & ekspor CSV di sisi browser.
 */

const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/g;

export function sanitizeFilename(filename: unknown, fallback = "download"): string {
  const raw = String(filename ?? "")
    .replace(CONTROL_CHARS_RE, "")
    .replace(/[/\\]+/g, "_")
    .replace(/\.\.+/g, ".")
    .replace(/^\.+/, "")
    .trim();
  const safe = raw.slice(0, 200);
  return safe || fallback;
}

export function sanitizeCsvCell(value: unknown): string {
  const raw = String(value ?? "");
  const neutralized = CSV_FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const urlApi = typeof window !== "undefined" ? window.URL : undefined;
  if (!urlApi) return;
  const safeName = sanitizeFilename(filename);
  const url = urlApi.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", safeName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  const timer = setTimeout(() => {
    urlApi?.revokeObjectURL?.(url);
  }, 1000);
  (timer as unknown as { unref?: () => void })?.unref?.();
}

export function downloadTextAsFile(
  content: string,
  filename: string,
  mimeType = "text/plain;charset=utf-8;"
): void {
  const blob = new Blob([content], { type: mimeType });
  triggerBlobDownload(blob, filename);
}

export function exportRowsToCsv(
  headers: string[],
  rows: ReadonlyArray<object>,
  filename: string
): void {
  const csvLines = rows.map((row) =>
    headers.map((h) => sanitizeCsvCell((row as Record<string, unknown>)[h])).join(",")
  );
  const csvContent = [headers.join(","), ...csvLines].join("\n");
  downloadTextAsFile(csvContent, filename, "text/csv;charset=utf-8;");
}
