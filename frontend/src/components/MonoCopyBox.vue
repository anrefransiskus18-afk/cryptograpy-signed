<template>
  <div class="space-y-1">
    <div v-if="label || (copyable && value)" class="flex items-center justify-between gap-2">
      <span class="text-xs text-slate-500">{{ label }}</span>
      <CopyButton
        v-if="copyable && value"
        :value="value"
        :label="copyLabel || label || 'Teks'"
        :text="copyText"
        :size="size"
      />
    </div>
    <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
      {{ value || fallback }}
    </div>
  </div>
</template>

<script setup lang="ts">
import CopyButton from "./CopyButton.vue";

defineProps({
  label: { type: String, default: "" },
  value: { type: String, default: "" },
  copyLabel: { type: String, default: "" },
  copyText: { type: String, default: "Salin" },
  copyable: { type: Boolean, default: true },
  fallback: { type: String, default: "—" },
  size: { type: String, default: "xs" }
});
</script>
