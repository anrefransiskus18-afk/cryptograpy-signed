<template>
  <div :role="variant === 'success' ? 'status' : 'alert'" :class="variantClasses" class="p-3 rounded-lg border text-xs">
    <div v-if="title" class="font-semibold mb-0.5">{{ title }}</div>
    <slot>{{ message }}</slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
  variant: { type: String, default: "error" },
  title: { type: String, default: "" },
  message: { type: String, default: "" }
});

const variantClasses = computed(() => {
  if (props.variant === "success") {
    return "bg-emerald-50 border-emerald-200 text-emerald-800";
  }
  if (props.variant === "warning") {
    return "bg-amber-50 border-amber-200 text-amber-800";
  }
  return "bg-rose-50 border-rose-200 text-rose-700";
});
</script>
