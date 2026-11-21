import { ref, computed } from "vue";

export const THEME_STORAGE_KEY = "app_theme";

function getInitialTheme() {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light") {
      return saved;
    }
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyThemeClass(mode) {
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }
}

export const theme = ref(getInitialTheme());
applyThemeClass(theme.value);

export function setTheme(mode) {
  if (mode !== "light" && mode !== "dark") return;
  theme.value = mode;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
  applyThemeClass(mode);
}

export function toggleTheme() {
  setTheme(theme.value === "dark" ? "light" : "dark");
}

export function useTheme() {
  const isDark = computed(() => theme.value === "dark");
  return {
    theme,
    isDark,
    setTheme,
    toggleTheme
  };
}
