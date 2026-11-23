<template>
  <div>
    <div v-if="label" class="flex items-center justify-between mb-1.5">
      <label :for="inputId" class="block text-xs font-semibold text-slate-700">{{ label }}</label>
      <button
        type="button"
        @click="show = !show"
        :aria-pressed="show"
        class="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
      >
        {{ show ? t("components.hidePassword") : t("components.showPassword") }}
      </button>
    </div>
    <div class="relative">
      <input
        :id="inputId"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :type="show ? 'text' : 'password'"
        :required="required"
        :minlength="minlength"
        :placeholder="placeholder"
        :class="[inputClass, !label ? 'pr-24' : '']"
        class="w-full border border-slate-300 rounded-lg px-3.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 transition-colors"
      />
      <button
        v-if="!label"
        type="button"
        @click="show = !show"
        :aria-pressed="show"
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
      >
        {{ show ? t("components.hidePassword") : t("components.showPassword") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useId } from "vue";
import { useI18n } from "../i18n";

export interface PasswordInputProps {
  modelValue?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  minlength?: number | string;
  inputClass?: string;
}

withDefaults(defineProps<PasswordInputProps>(), {
  modelValue: "",
  label: "",
  placeholder: "",
  required: false,
  minlength: undefined,
  inputClass: "h-9 bg-slate-50"
});

defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const { t } = useI18n();
const inputId = useId();
const show = ref(false);
</script>
