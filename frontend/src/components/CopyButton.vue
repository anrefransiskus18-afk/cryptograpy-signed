<template>
  <button
    type="button"
    @click="handleCopy"
    :class="sizeClass"
    class="rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors shrink-0"
  >
    {{ text }}
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useFormatters } from "../composables/useFormatters";
import { useToastStore } from "../stores/toast";

const props = defineProps({
  value: { type: String, default: "" },
  label: { type: String, default: "Teks" },
  text: { type: String, default: "Salin" },
  size: { type: String, default: "xs" }
});

const { copyToClipboard } = useFormatters();
const toast = useToastStore();

const sizeClass = computed(() =>
  props.size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-1.5 py-0.5 text-[10px]"
);

async function handleCopy() {
  if (!props.value) return;
  const ok = await copyToClipboard(props.value);
  if (ok) {
    toast.show(`${props.label} berhasil disalin.`, "info");
  }
}
</script>
