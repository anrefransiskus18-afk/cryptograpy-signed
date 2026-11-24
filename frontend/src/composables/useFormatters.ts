import { t } from "../i18n";

export type DebouncedFn<A extends unknown[]> = ((...args: A) => void) & {
  cancel: () => void;
};

export function useFormatters() {
  function formatBytes(bytes: number | null | undefined): string {
    if (bytes === 0 || bytes === null || bytes === undefined) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(Math.max(1, bytes)) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  function formatTime(isoStr: string | null | undefined): string {
    if (!isoStr) return "—";
    const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(isoStr);
    const d = new Date(hasZone ? isoStr : `${isoStr}Z`);
    if (Number.isNaN(d.getTime())) return isoStr.replace("T", " ").slice(0, 19);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function formatRole(role: string | null | undefined): string {
    const key = `roles.${role}`;
    const translated = t(key);
    return translated !== key ? translated : role || t("roles.STAFF");
  }

  function formatClassification(cls: string | null | undefined): string {
    const key = `classifications.${cls}`;
    const translated = t(key);
    return translated !== key ? translated : cls || t("classifications.INTERNAL");
  }

  function formatAction(action: string | null | undefined): string {
    const key = `actions.${action}`;
    const translated = t(key);
    return translated !== key ? translated : action || "Aktivitas Sistem";
  }

  function formatStatus(status: string | null | undefined): string {
    const key = `statuses.${status}`;
    const translated = t(key);
    return translated !== key ? translated : status || t("statuses.SUCCESS");
  }

  function badgeClass(action: string | null | undefined): string {
    if (!action) return "bg-slate-100 text-slate-700 border border-slate-200";
    if (
      action.includes("TAMPER") ||
      action.includes("FAILED") ||
      action.includes("REVOKE") ||
      action.includes("DEACTIVATED") ||
      action.includes("DELETED") ||
      action.includes("UNAUTHORIZED")
    ) {
      return "bg-rose-50 text-rose-700 border border-rose-200";
    }
    if (
      action.includes("ENCRYPT") ||
      action.includes("DECRYPTION_SUCCESS") ||
      action.includes("VERIFIED") ||
      action.includes("LOGIN_SUCCESS") ||
      action === "LOGIN"
    ) {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (action.includes("KEY")) {
      return "bg-sky-50 text-sky-700 border border-sky-200";
    }
    return "bg-indigo-50 text-indigo-700 border border-indigo-200";
  }

  function classificationBadge(cls: string | null | undefined): string {
    switch (cls) {
      case "TOP_SECRET":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      case "SECRET":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "CONFIDENTIAL":
        return "bg-indigo-50 text-indigo-700 border border-indigo-200";
      default:
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
  }

  function debounce<A extends unknown[]>(fn: (...args: A) => void, delay = 300): DebouncedFn<A> {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = ((...args: A) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, delay);
    }) as DebouncedFn<A>;
    debounced.cancel = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    return debounced;
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(String(text));
      return true;
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = String(text);
        document.body.appendChild(textarea);
        textarea.select();
        const ok = Boolean(document.execCommand("copy"));
        textarea.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  return {
    formatBytes,
    formatTime,
    formatRole,
    formatClassification,
    formatAction,
    formatStatus,
    badgeClass,
    classificationBadge,
    debounce,
    copyToClipboard
  };
}
