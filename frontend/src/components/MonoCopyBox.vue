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

export interface MonoCopyBoxProps {
  label?: string;
  value?: string;
  copyLabel?: string;
  copyText?: string;
  copyable?: boolean;
  fallback?: string;
  size?: "xs" | "sm";
}

withDefaults(defineProps<MonoCopyBoxProps>(), {
  label: "",
  value: "",
  copyLabel: "",
  copyText: "Salin",
  copyable: true,
  fallback: "—",
  size: "xs"
});
</script>
