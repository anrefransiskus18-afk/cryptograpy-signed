/**
 * Pengaturan mode demo.
 * Dalam mode produksi (`vite build`), demo mode NONAKTIF secara default kecuali
 * `VITE_SHOW_DEMO_ACCOUNTS=true` disetel eksplisit. Dalam mode pengembangan (`vite dev`),
 * demo mode aktif kecuali `VITE_SHOW_DEMO_ACCOUNTS=false`.
 */
export const DEMO_MODE: boolean =
  import.meta.env?.VITE_SHOW_DEMO_ACCOUNTS === "true" ||
  (Boolean(import.meta.env?.DEV) && import.meta.env?.VITE_SHOW_DEMO_ACCOUNTS !== "false");
export const DEMO_PASSWORD: string = DEMO_MODE ? "Admin@2026!" : "";
export const DEMO_KEY_PASSPHRASE: string = DEMO_MODE ? "KeyPass@2026!" : "";
export const DEMO_NEW_USER_PASSWORD: string = DEMO_MODE ? "User@2026!" : "";
