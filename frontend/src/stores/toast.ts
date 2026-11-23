import { defineStore } from "pinia";
import { ref } from "vue";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export const useToastStore = defineStore("toast", () => {
  const toasts = ref<ToastItem[]>([]);
  let nextId = 1;

  function show(message: string, type: ToastType = "info", duration = 4500): void {
    const id = nextId++;
    toasts.value.push({ id, message, type });
    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
  }

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return { toasts, show, dismiss };
});
