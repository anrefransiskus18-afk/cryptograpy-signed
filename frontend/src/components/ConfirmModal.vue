<template>
  <BaseModal :open="open" maxWidth="max-w-md" @close="$emit('cancel')">
    <template #header>
      <div class="flex items-center gap-2.5">
        <div
          class="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
          :class="danger ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'"
        >
          !
        </div>
        <h3 class="text-sm font-bold text-slate-900">{{ title }}</h3>
      </div>
    </template>

    <p class="text-xs text-slate-600 leading-relaxed">{{ message }}</p>

    <template #footer>
      <button
        type="button"
        @click="$emit('cancel')"
        class="h-8 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
      >
        Batal
      </button>
      <button
        type="button"
        @click="$emit('confirm')"
        class="h-8 px-3.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
        :class="danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'"
      >
        {{ confirmText }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from "./BaseModal.vue";

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "Konfirmasi Tindakan" },
  message: { type: String, default: "Apakah Anda yakin ingin melanjutkan tindakan ini?" },
  confirmText: { type: String, default: "Ya, Lanjutkan" },
  danger: { type: Boolean, default: true }
});

defineEmits(["confirm", "cancel"]);
</script>
