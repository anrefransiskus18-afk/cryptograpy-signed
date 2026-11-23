<template>
  <div>
    <label v-if="label" :for="inputId" class="block text-xs font-semibold text-slate-700 mb-1">
      {{ label }}
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :class="[
        'w-full h-9 bg-slate-50 border rounded-lg px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed',
        error ? 'border-rose-400' : 'border-slate-300',
        inputClass
      ]"
    />
    <p v-if="error" :id="`${inputId}-error`" class="mt-1 text-[11px] text-rose-600">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${inputId}-hint`" class="mt-1 text-[11px] text-slate-500">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useId } from "vue";

export interface BaseInputProps {
  modelValue?: string | number;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  error?: string;
  hint?: string;
  inputClass?: string;
}

withDefaults(defineProps<BaseInputProps>(), {
  modelValue: "",
  label: "",
  type: "text",
  placeholder: "",
  required: false,
  disabled: false,
  readonly: false,
  error: "",
  hint: "",
  inputClass: ""
});

defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const inputId = useId();
</script>
