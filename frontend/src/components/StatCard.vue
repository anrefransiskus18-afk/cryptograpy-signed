<template>
  <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
    <div class="text-xs font-medium text-slate-500">{{ label }}</div>
    <div class="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">{{ value }}</div>
    <div v-if="subtitle" class="text-xs text-slate-400 mt-1 truncate">{{ subtitle }}</div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: 0 },
  subtitle: { type: String, default: "" }
});
</script>
