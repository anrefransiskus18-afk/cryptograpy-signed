<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : undefined"
    :class="[
      baseClass,
      sizeClass,
      variantClass,
      block ? 'w-full' : ''
    ]"
  >
    <svg
      v-if="loading"
      class="w-3.5 h-3.5 animate-spin shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type BaseButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type BaseButtonSize = "xs" | "sm" | "md";

export interface BaseButtonProps {
  type?: "button" | "submit" | "reset";
  variant?: BaseButtonVariant;
  size?: BaseButtonSize;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
}

const props = withDefaults(defineProps<BaseButtonProps>(), {
  type: "button",
  variant: "primary",
  size: "md",
  loading: false,
  disabled: false,
  block: false
});

const baseClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-60 disabled:cursor-not-allowed";

const sizeClass = computed(() => {
  if (props.size === "xs") return "h-7 px-2.5 text-[11px]";
  if (props.size === "sm") return "h-8 px-3 text-xs";
  return "h-9 px-4 text-xs";
});

const variantClass = computed(() => {
  if (props.variant === "secondary") {
    return "bg-slate-100 hover:bg-slate-200 text-slate-700";
  }
  if (props.variant === "danger") {
    return "bg-rose-600 hover:bg-rose-700 text-white";
  }
  if (props.variant === "ghost") {
    return "bg-transparent hover:bg-slate-100 text-slate-600";
  }
  return "bg-indigo-600 hover:bg-indigo-700 text-white";
});
</script>
