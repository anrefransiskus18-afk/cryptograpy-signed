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
        <h3 class="text-sm font-bold text-slate-900">{{ resolvedTitle }}</h3>
      </div>
    </template>

    <p class="text-xs text-slate-600 leading-relaxed">{{ resolvedMessage }}</p>

    <template #footer>
      <button
        type="button"
        @click="$emit('cancel')"
        class="h-8 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
      >
        {{ t("common.cancel") }}
      </button>
      <button
        type="button"
        @click="$emit('confirm')"
        class="h-8 px-3.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
        :class="danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'"
      >
        {{ resolvedConfirmText }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import BaseModal from "./BaseModal.vue";
import { useI18n } from "../i18n";

export interface ConfirmModalProps {
  open?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  danger?: boolean;
}

const props = withDefaults(defineProps<ConfirmModalProps>(), {
  open: false,
  title: "",
  message: "",
  confirmText: "",
  danger: true
});

defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

const { t } = useI18n();
const resolvedTitle = computed(() => props.title || t("components.confirmTitle"));
const resolvedMessage = computed(() => props.message || t("components.confirmMessage"));
const resolvedConfirmText = computed(() => props.confirmText || t("components.confirmAction"));
</script>
