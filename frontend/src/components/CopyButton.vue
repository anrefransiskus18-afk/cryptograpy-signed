<template>
  <button
    type="button"
    :aria-label="`${resolvedText} ${resolvedLabel}`"
    @click="handleCopy"
    :class="sizeClass"
    class="rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors shrink-0"
  >
    {{ resolvedText }}
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useFormatters } from "../composables/useFormatters";
import { useToastStore } from "../stores/toast";
import { useI18n } from "../i18n";

export type CopyButtonSize = "xs" | "sm";

export interface CopyButtonProps {
  value?: string;
  label?: string;
  text?: string;
  size?: CopyButtonSize;
}

const props = withDefaults(defineProps<CopyButtonProps>(), {
  value: "",
  label: "",
  text: "",
  size: "xs"
});

const { copyToClipboard } = useFormatters();
const toast = useToastStore();
const { t } = useI18n();

const resolvedLabel = computed(() => props.label || t("components.defaultCopyLabel"));
const resolvedText = computed(() => props.text || t("components.copy"));

const sizeClass = computed(() =>
  props.size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-1.5 py-0.5 text-[10px]"
);

async function handleCopy() {
  if (!props.value) return;
  const ok = await copyToClipboard(props.value);
  if (ok) {
    toast.show(t("components.copiedSuccess", { label: resolvedLabel.value }), "info");
  }
}
</script>
