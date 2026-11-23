<template>
  <Teleport to="body">
    <div
      v-if="open"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="title ? titleId : undefined"
      @click.self="$emit('close')"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
    >
      <div
        ref="dialogRef"
        tabindex="-1"
        :class="[maxWidth, 'bg-white border border-slate-200 rounded-xl w-full p-5 shadow-xl space-y-4 focus:outline-none']"
      >
        <div class="flex items-center justify-between border-b border-slate-200 pb-3 gap-3">
          <slot name="header">
            <div class="min-w-0">
              <h3 :id="titleId" class="text-sm font-bold text-slate-900 truncate">{{ title }}</h3>
              <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5 truncate">{{ subtitle }}</p>
            </div>
          </slot>
          <button
            type="button"
            @click="$emit('close')"
            class="text-slate-400 hover:text-slate-700 text-lg font-bold px-1 cursor-pointer shrink-0"
            :aria-label="t('components.close')"
          >
            &times;
          </button>
        </div>

        <div>
          <slot />
        </div>

        <div v-if="$slots.footer" class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, useId, onBeforeUnmount } from "vue";
import { useI18n } from "../i18n";

export interface BaseModalProps {
  open?: boolean;
  title?: string;
  subtitle?: string;
  maxWidth?: string;
}

const props = withDefaults(defineProps<BaseModalProps>(), {
  open: false,
  title: "",
  subtitle: "",
  maxWidth: "max-w-lg"
});

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { t } = useI18n();
const titleId = useId();
const dialogRef = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

function getFocusableElements(): HTMLElement[] {
  if (!dialogRef.value) return [];
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(dialogRef.value.querySelectorAll<HTMLElement>(selector));
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.open) return;
  if (e.key === "Escape") {
    emit("close");
    return;
  }
  if (e.key === "Tab") {
    const focusables = getFocusableElements();
    if (focusables.length === 0) {
      e.preventDefault();
      dialogRef.value?.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      window.addEventListener("keydown", handleKeydown);
      await nextTick();
      const focusables = getFocusableElements();
      (focusables[0] || dialogRef.value)?.focus();
    } else {
      window.removeEventListener("keydown", handleKeydown);
      previouslyFocused?.focus?.();
      previouslyFocused = null;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>
