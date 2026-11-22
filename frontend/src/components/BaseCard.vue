<template>
  <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div
      v-if="$slots.header || title"
      class="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2"
    >
      <slot name="header">
        <div>
          <h3 class="text-sm font-bold text-slate-900">{{ title }}</h3>
          <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5">{{ subtitle }}</p>
        </div>
      </slot>
    </div>

    <div :class="paddingClass">
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      class="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type BaseCardPadding = "none" | "sm" | "md" | "lg";

export interface BaseCardProps {
  padding?: BaseCardPadding;
  title?: string;
  subtitle?: string;
}

const props = withDefaults(defineProps<BaseCardProps>(), {
  padding: "md",
  title: "",
  subtitle: ""
});

const paddingClass = computed(() => {
  if (props.padding === "none") return "";
  if (props.padding === "sm") return "p-4";
  if (props.padding === "lg") return "p-6";
  return "p-5";
});
</script>
