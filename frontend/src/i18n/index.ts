import { ref, type App, type Ref } from "vue";
import id from "./locales/id";
import en from "./locales/en";

export type SupportedLocale = "id" | "en";
export const SUPPORTED_LOCALES: SupportedLocale[] = ["id", "en"];
export const STORAGE_KEY = "app_locale";

type LocaleMessages = typeof id;
const messages: Record<SupportedLocale, LocaleMessages> = { id, en };

function getInitialLocale(): SupportedLocale {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      return saved;
    }
  }
  return "id";
}

export const locale: Ref<SupportedLocale> = ref(getInitialLocale());

export function setLocale(nextLocale: SupportedLocale): void {
  if (!SUPPORTED_LOCALES.includes(nextLocale)) return;
  locale.value = nextLocale;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, nextLocale);
  }
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = nextLocale;
  }
}

function resolvePath(obj: Record<string, any>, path: string): unknown {
  return path.split(".").reduce<any>((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

export function t(key: string, params: Record<string, unknown> = {}): string {
  const currentPack = messages[locale.value] || messages.id;
  let template = resolvePath(currentPack as Record<string, any>, key);
  if (template === undefined) {
    template = resolvePath(messages.id as Record<string, any>, key);
  }
  if (typeof template !== "string") {
    return key;
  }
  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    params[token] !== undefined ? String(params[token]) : `{${token}}`
  );
}

export function useI18n() {
  return {
    locale,
    setLocale,
    t,
    supportedLocales: SUPPORTED_LOCALES
  };
}

export const i18nPlugin = {
  install(app: App): void {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = locale.value;
    }
    app.config.globalProperties.$t = t;
    app.config.globalProperties.$i18n = { locale, setLocale, t };
  }
};

export default i18nPlugin;
