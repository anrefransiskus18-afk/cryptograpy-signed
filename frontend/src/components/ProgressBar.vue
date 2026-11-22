<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between text-xs text-slate-600">
      <span>{{ resolvedLabel }}</span>
      <span class="font-mono font-semibold text-indigo-600">{{ progress }}%</span>
    </div>
    <div
      role="progressbar"
      :aria-valuenow="progress"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="resolvedLabel"
      class="w-full h-2 bg-slate-100 rounded-full overflow-hidden"
    >
      <div
        class="h-full bg-indigo-600 transition-all duration-150"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../i18n";

export interface ProgressBarProps {
  label?: string;
  progress?: number;
}

const props = withDefaults(defineProps<ProgressBarProps>(), {
  label: "",
  progress: 0
});

const { t } = useI18n();
const resolvedLabel = computed(() => props.label || t("components.processing"));
</script>
