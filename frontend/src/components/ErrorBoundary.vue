<template>
  <div v-if="capturedError" class="p-6 max-w-lg mx-auto my-12">
    <BaseCard padding="lg" title="Terjadi Kesalahan Tampilan">
      <div class="space-y-4 text-xs text-slate-600">
        <p>
          Maaf, bagian halaman ini mengalami gangguan tak terduga. Anda dapat mencoba memuat ulang tampilan atau kembali ke Beranda.
        </p>
        <div class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-mono text-[11px] break-all">
          {{ capturedError.message || "Unexpected component error" }}
        </div>
        <div class="flex items-center justify-end gap-2">
          <BaseButton variant="secondary" @click="goHome">Ke Beranda</BaseButton>
          <BaseButton @click="reset">Coba Lagi</BaseButton>
        </div>
      </div>
    </BaseCard>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from "vue";
import { useRouter } from "vue-router";
import { logger } from "../utils/logger";
import BaseCard from "./BaseCard.vue";
import BaseButton from "./BaseButton.vue";

const router = useRouter();
const capturedError = ref<Error | null>(null);

onErrorCaptured((err, instance, info) => {
  capturedError.value = err instanceof Error ? err : new Error(String(err));
  logger.error("vue_error_boundary_captured", {
    component: instance?.$options?.name || "UnknownComponent",
    info,
    error: err
  });
  return false;
});

function reset() {
  capturedError.value = null;
}

function goHome() {
  capturedError.value = null;
  router.push("/");
}
</script>
