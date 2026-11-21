/**
 * Utilitas unduhan berkas & ekspor CSV di sisi browser.
 */

const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function sanitizeCsvCell(value) {
  const raw = String(value ?? "");
  const neutralized = CSV_FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function triggerBlobDownload(blob, filename) {
  const urlApi = typeof window !== "undefined" ? window.URL : undefined;
  const url = urlApi.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  const timer = setTimeout(() => {
    urlApi?.revokeObjectURL?.(url);
  }, 1000);
  timer?.unref?.();
}

export function downloadTextAsFile(content, filename, mimeType = "text/plain;charset=utf-8;") {
  const blob = new Blob([content], { type: mimeType });
  triggerBlobDownload(blob, filename);
}

export function exportRowsToCsv(headers, rows, filename) {
  const csvLines = rows.map((row) =>
    headers.map((h) => sanitizeCsvCell(row[h])).join(",")
  );
  const csvContent = [headers.join(","), ...csvLines].join("\n");
  downloadTextAsFile(csvContent, filename, "text/csv;charset=utf-8;");
}
