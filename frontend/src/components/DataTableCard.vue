<template>
  <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div v-if="$slots.header" class="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
      <slot name="header" />
    </div>

    <div v-if="loading" class="p-6 space-y-3">
      <SkeletonLoader :rows="4" />
      <p class="text-center text-xs text-slate-500">{{ resolvedLoadingText }}</p>
    </div>

    <div v-else-if="empty" class="p-10 text-center text-xs text-slate-500">
      <slot name="empty">{{ resolvedEmptyText }}</slot>
    </div>

    <div v-else class="overflow-x-auto">
      <slot />
    </div>

    <div v-if="$slots.footer" class="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../i18n";
import SkeletonLoader from "./SkeletonLoader.vue";

export interface DataTableCardProps {
  loading?: boolean;
  empty?: boolean;
  loadingText?: string;
  emptyText?: string;
}

const props = withDefaults(defineProps<DataTableCardProps>(), {
  loading: false,
  empty: false,
  loadingText: "",
  emptyText: ""
});

const { t } = useI18n();
const resolvedLoadingText = computed(() => props.loadingText || t("components.loadingData"));
const resolvedEmptyText = computed(() => props.emptyText || t("components.noData"));
</script>
