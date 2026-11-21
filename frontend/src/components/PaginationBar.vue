<template>
  <div class="flex items-center justify-between w-full text-xs text-slate-600">
    <div>
      Menampilkan <span class="font-semibold text-slate-900">{{ shownCount }}</span> dari
      <span class="font-semibold text-slate-900">{{ totalItems }}</span> {{ itemLabel }}
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        :disabled="page <= 1"
        @click="$emit('change', page - 1)"
        class="h-7 px-2.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
      >
        Sebelumnya
      </button>
      <span class="px-2 font-medium text-slate-700">
        Halaman {{ page }} dari {{ totalPages }}
      </span>
      <button
        type="button"
        :disabled="page >= totalPages"
        @click="$emit('change', page + 1)"
        class="h-7 px-2.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
      >
        Berikutnya
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  shownCount: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  itemLabel: { type: String, default: "item" }
});

defineEmits(["change"]);
</script>
