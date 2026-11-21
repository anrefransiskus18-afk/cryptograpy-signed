import { ref } from "vue";
import id from "./locales/id";
import en from "./locales/en";

export const SUPPORTED_LOCALES = ["id", "en"];
export const STORAGE_KEY = "app_locale";

const messages = { id, en };

function getInitialLocale() {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      return saved;
    }
  }
  return "id";
}

export const locale = ref(getInitialLocale());

export function setLocale(nextLocale) {
  if (!SUPPORTED_LOCALES.includes(nextLocale)) return;
  locale.value = nextLocale;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, nextLocale);
  }
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = nextLocale;
  }
}

function resolvePath(obj, path) {
  return path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

export function t(key, params = {}) {
  const currentPack = messages[locale.value] || messages.id;
  let template = resolvePath(currentPack, key);
  if (template === undefined) {
    template = resolvePath(messages.id, key);
  }
  if (typeof template !== "string") {
    return key;
  }
  return template.replace(/\{(\w+)\}/g, (_, token) =>
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
  install(app) {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = locale.value;
    }
    app.config.globalProperties.$t = t;
    app.config.globalProperties.$i18n = { locale, setLocale, t };
  }
};

export default i18nPlugin;
