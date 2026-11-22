<template>
  <span :class="badgeClasses" class="px-2 py-0.5 rounded text-[11px] font-medium inline-flex items-center">
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
  variant: { type: String, default: "neutral" },
  label: { type: String, default: "" }
});

const badgeClasses = computed(() => {
  if (props.variant === "success") return "bg-emerald-50 text-emerald-700";
  if (props.variant === "danger") return "bg-rose-50 text-rose-700";
  if (props.variant === "warning") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
});
</script>
