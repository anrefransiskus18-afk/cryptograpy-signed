import { ref, computed, type Ref } from "vue";

export type ThemeMode = "light" | "dark";
export const THEME_STORAGE_KEY = "app_theme";

function getInitialTheme(): ThemeMode {
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

function applyThemeClass(mode: ThemeMode): void {
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }
}

export const theme: Ref<ThemeMode> = ref(getInitialTheme());
applyThemeClass(theme.value);

export function setTheme(mode: ThemeMode): void {
  if (mode !== "light" && mode !== "dark") return;
  theme.value = mode;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
  applyThemeClass(mode);
}

export function toggleTheme(): void {
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
