<template>
  <div
    v-if="open"
    ref="dialogRef"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    @click.self="$emit('close')"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 outline-none"
  >
    <div :class="[maxWidth, 'bg-white border border-slate-200 rounded-xl w-full p-5 shadow-xl space-y-4']">
      <div class="flex items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <slot name="header">
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-slate-900 truncate">{{ title }}</h3>
            <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5 truncate">{{ subtitle }}</p>
          </div>
        </slot>
        <button
          type="button"
          @click="$emit('close')"
          class="text-slate-400 hover:text-slate-700 text-lg font-bold px-1 cursor-pointer shrink-0"
          aria-label="Tutup"
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
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  maxWidth: { type: String, default: "max-w-lg" }
});

const emit = defineEmits(["close"]);
const dialogRef = ref(null);
let previouslyFocused = null;

function handleKeydown(e) {
  if (e.key === "Escape" && props.open) {
    emit("close");
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (typeof window === "undefined") return;
    if (isOpen) {
      previouslyFocused = typeof document !== "undefined" ? document.activeElement : null;
      window.addEventListener("keydown", handleKeydown);
      await nextTick();
      dialogRef.value?.focus?.();
    } else {
      window.removeEventListener("keydown", handleKeydown);
      previouslyFocused?.focus?.();
      previouslyFocused = null;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", handleKeydown);
  }
});
</script>
