<template>
  <div>
    <div v-if="label" class="flex items-center justify-between mb-1.5">
      <label :for="inputId" class="block text-xs font-semibold text-slate-700">{{ label }}</label>
      <button
        type="button"
        @click="show = !show"
        class="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
      >
        {{ show ? "Sembunyikan" : "Lihat Sandi" }}
      </button>
    </div>
    <div class="relative">
      <input
        :id="inputId"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
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
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
      >
        {{ show ? "Sembunyikan" : "Lihat Sandi" }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, useId } from "vue";

defineProps({
  modelValue: { type: String, default: "" },
  label: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  required: { type: Boolean, default: false },
  minlength: { type: [Number, String], default: null },
  inputClass: { type: String, default: "h-9 bg-slate-50" }
});

defineEmits(["update:modelValue"]);

const inputId = useId();
const show = ref(false);
</script>
