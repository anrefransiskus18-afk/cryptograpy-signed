<template>
  <div>
    <label v-if="label" :for="selectId" class="block text-xs font-semibold text-slate-700 mb-1">
      {{ label }}
    </label>
    <select
      :id="selectId"
      :value="modelValue ?? ''"
      :required="required"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      :class="[
        'w-full h-9 bg-slate-50 border rounded-lg px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed',
        error ? 'border-rose-400' : 'border-slate-300',
        selectClass
      ]"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <slot>
        <option
          v-for="opt in options"
          :key="String(opt.value)"
          :value="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}
        </option>
      </slot>
    </select>
    <p v-if="error" class="mt-1 text-[11px] text-rose-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { useId } from "vue";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface BaseSelectProps {
  modelValue?: string | number | null;
  label?: string;
  options?: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  selectClass?: string;
}

withDefaults(defineProps<BaseSelectProps>(), {
  modelValue: "",
  label: "",
  options: () => [],
  placeholder: "",
  required: false,
  disabled: false,
  error: "",
  selectClass: ""
});

defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const selectId = useId();
</script>
