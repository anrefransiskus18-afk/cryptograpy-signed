<template>
  <div class="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
    <div
      v-for="t in toastStore.toasts"
      :key="t.id"
      class="pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl border shadow-xl transition-all bg-white"
      :class="toastStyle(t.type)"
    >
      <div class="flex items-start gap-2.5">
        <span
          class="mt-0.5 h-2.5 w-2.5 rounded-full shrink-0"
          :class="dotStyle(t.type)"
        ></span>
        <div class="text-xs font-medium text-slate-800 leading-relaxed">
          {{ t.message }}
        </div>
      </div>
      <button
        type="button"
        @click="toastStore.dismiss(t.id)"
        class="text-xs text-slate-400 hover:text-slate-700 font-bold px-1"
      >
        &times;
      </button>
    </div>
  </div>
</template>

<script setup>
import { useToastStore } from "../stores/toast";

const toastStore = useToastStore();

function toastStyle(type) {
  if (type === "error") return "border-rose-300 shadow-rose-900/5";
  if (type === "success") return "border-emerald-300 shadow-emerald-900/5";
  if (type === "warning") return "border-amber-300 shadow-amber-900/5";
  return "border-indigo-200 shadow-slate-900/5";
}

function dotStyle(type) {
  if (type === "error") return "bg-rose-500";
  if (type === "success") return "bg-emerald-500";
  if (type === "warning") return "bg-amber-500";
  return "bg-indigo-600";
}
</script>
