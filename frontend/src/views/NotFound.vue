<template>
  <div class="min-h-[70vh] flex items-center justify-center p-6">
    <BaseCard padding="lg" class="max-w-md w-full text-center">
      <div class="space-y-4">
        <div class="text-3xl font-extrabold text-indigo-600 font-mono">404</div>
        <h1 class="text-base font-bold text-slate-900">Halaman Tidak Ditemukan</h1>
        <p class="text-xs text-slate-500">
          Alamat yang Anda tuju tidak tersedia atau telah dipindahkan.
        </p>
        <div class="pt-2">
          <BaseButton @click="router.push('/')">Kembali ke Beranda</BaseButton>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import BaseCard from "../components/BaseCard.vue";
import BaseButton from "../components/BaseButton.vue";

const router = useRouter();
</script>
