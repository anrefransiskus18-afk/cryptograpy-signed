<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between text-xs text-slate-600">
      <span>{{ label }}</span>
      <span class="font-mono font-semibold text-indigo-600">{{ progress }}%</span>
    </div>
    <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        class="h-full bg-indigo-600 transition-all duration-150"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  label: { type: String, default: "Memproses..." },
  progress: { type: Number, default: 0 }
});
</script>
