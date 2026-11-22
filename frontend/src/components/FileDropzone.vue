<template>
  <label
    :for="inputId"
    @dragover.prevent="isDragging = true"
    @dragleave="isDragging = false"
    @drop.prevent="handleDrop"
    class="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
    :class="isDragging
      ? 'border-indigo-500 bg-indigo-50/50'
      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'"
  >
    <div v-if="file" class="space-y-1">
      <slot name="selected" :file="file">
        <div class="text-xs font-bold text-indigo-700 break-all">{{ file.name }}</div>
        <div class="text-xs text-slate-500">{{ formatBytes(file.size) }} &bull; Klik untuk mengganti file</div>
      </slot>
    </div>
    <div v-else class="space-y-1">
      <div class="text-xs font-semibold text-slate-700">{{ emptyTitle }}</div>
      <div v-if="hint" class="text-[11px] text-slate-400">{{ hint }}</div>
    </div>
    <input :id="inputId" type="file" :accept="accept" class="hidden" @change="handleChange" />
  </label>
</template>

<script setup lang="ts">
import { ref, type PropType } from "vue";
import { useFormatters } from "../composables/useFormatters";

defineProps({
  inputId: { type: String, default: "file-upload" },
  file: { type: Object as PropType<File | null>, default: null },
  accept: { type: String, default: "" },
  emptyTitle: { type: String, default: "Klik untuk memilih file atau seret ke sini" },
  hint: { type: String, default: "" }
});

const emit = defineEmits(["select"]);
const { formatBytes } = useFormatters();
const isDragging = ref(false);

function handleChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const f = input.files?.[0];
  if (f) emit("select", f);
  input.value = "";
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  const f = event.dataTransfer?.files?.[0];
  if (f) emit("select", f);
}
</script>
