<template>
  <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div v-if="$slots.header" class="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
      <slot name="header" />
    </div>

    <div v-if="loading" class="p-10 text-center text-xs text-slate-500">
      {{ loadingText }}
    </div>

    <div v-else-if="empty" class="p-10 text-center text-xs text-slate-500">
      <slot name="empty">{{ emptyText }}</slot>
    </div>

    <div v-else class="overflow-x-auto">
      <slot />
    </div>

    <div v-if="$slots.footer" class="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  empty: { type: Boolean, default: false },
  loadingText: { type: String, default: "Sedang memuat data..." },
  emptyText: { type: String, default: "Tidak ada data yang tersedia." }
});
</script>
