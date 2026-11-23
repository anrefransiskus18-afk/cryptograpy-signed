<template>
  <label
    :for="inputId"
    role="button"
    tabindex="0"
    :aria-label="file ? file.name : resolvedEmptyTitle"
    @keydown.enter.prevent="triggerPicker"
    @keydown.space.prevent="triggerPicker"
    @dragover.prevent="isDragging = true"
    @dragleave="isDragging = false"
    @drop.prevent="handleDrop"
    class="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
    :class="isDragging
      ? 'border-indigo-500 bg-indigo-50/50'
      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'"
  >
    <div v-if="file" class="space-y-1">
      <slot name="selected" :file="file">
        <div class="text-xs font-bold text-indigo-700 break-all">{{ file.name }}</div>
        <div class="text-xs text-slate-500">
          {{ formatBytes(file.size) }} &bull; {{ t("components.dropzoneChange") }}
        </div>
      </slot>
    </div>
    <div v-else class="space-y-1">
      <div class="text-xs font-semibold text-slate-700">{{ resolvedEmptyTitle }}</div>
      <div v-if="hint" class="text-[11px] text-slate-400">{{ hint }}</div>
    </div>
    <input ref="inputRef" :id="inputId" type="file" :accept="accept" class="hidden" @change="handleChange" />
  </label>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useFormatters } from "../composables/useFormatters";
import { useI18n } from "../i18n";

export interface FileDropzoneProps {
  inputId?: string;
  file?: File | null;
  accept?: string;
  emptyTitle?: string;
  hint?: string;
}

const props = withDefaults(defineProps<FileDropzoneProps>(), {
  inputId: "file-upload",
  file: null,
  accept: "",
  emptyTitle: "",
  hint: ""
});

const emit = defineEmits<{
  (e: "select", file: File): void;
}>();

const { formatBytes } = useFormatters();
const { t } = useI18n();
const isDragging = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const resolvedEmptyTitle = computed(() => props.emptyTitle || t("components.dropzoneEmpty"));

function triggerPicker() {
  inputRef.value?.click();
}

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
