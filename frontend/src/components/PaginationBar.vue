<template>
  <div class="flex items-center justify-between w-full text-xs text-slate-600">
    <div>
      {{ t("components.showing") }} <span class="font-semibold text-slate-900">{{ shownCount }}</span> {{ t("components.of") }}
      <span class="font-semibold text-slate-900">{{ totalItems }}</span> {{ resolvedItemLabel }}
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        :disabled="page <= 1"
        @click="$emit('change', page - 1)"
        class="h-7 px-2.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
      >
        {{ t("components.previous") }}
      </button>
      <span class="px-2 font-medium text-slate-700">
        {{ t("components.page") }} {{ page }} {{ t("components.of") }} {{ totalPages }}
      </span>
      <button
        type="button"
        :disabled="page >= totalPages"
        @click="$emit('change', page + 1)"
        class="h-7 px-2.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
      >
        {{ t("components.next") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../i18n";

export interface PaginationBarProps {
  page: number;
  totalPages: number;
  shownCount: number;
  totalItems: number;
  itemLabel?: string;
}

const props = withDefaults(defineProps<PaginationBarProps>(), {
  itemLabel: ""
});

defineEmits<{
  (e: "change", nextPage: number): void;
}>();

const { t } = useI18n();
const resolvedItemLabel = computed(() => props.itemLabel || t("components.items"));
</script>
