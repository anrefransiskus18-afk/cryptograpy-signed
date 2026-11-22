<template>
  <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
    <div class="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
      <input
        v-if="showSearch"
        type="search"
        :value="search"
        :placeholder="resolvedPlaceholder"
        :aria-label="searchAriaLabel || resolvedPlaceholder"
        @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        class="h-9 bg-slate-50 border border-slate-300 rounded-lg px-3 text-xs text-slate-900 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      />
      <slot name="filters" />
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../i18n";

export interface FilterToolbarProps {
  search?: string;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  showSearch?: boolean;
}

const props = withDefaults(defineProps<FilterToolbarProps>(), {
  search: "",
  searchPlaceholder: "",
  searchAriaLabel: "",
  showSearch: true
});

defineEmits<{
  (e: "update:search", value: string): void;
}>();

const { t } = useI18n();
const resolvedPlaceholder = computed(() => props.searchPlaceholder || t("components.searchPlaceholder"));
</script>
