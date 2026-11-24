<template>
  <DataTableCard
    class="lg:col-span-7"
    :loading="loading"
    :empty="keys.length === 0"
    loadingText="Sedang memuat daftar penerima dokumen..."
    emptyText="Tidak ada penerima dokumen yang sesuai dengan pencarian."
  >
    <template #header>
      <div>
        <h3 class="text-sm font-bold text-slate-900">
          Daftar Penerima Dokumen Terdaftar ({{ keys.length }} Orang)
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">
          Pengguna di bawah ini memiliki kunci aktif dan siap menerima dokumen terkunci.
        </p>
      </div>
      <input
        :value="search"
        type="text"
        aria-label="Cari penerima dokumen"
        placeholder="Cari nama atau departemen..."
        class="h-8 sm:w-56 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </template>

    <table class="w-full text-left border-collapse text-xs">
      <thead>
        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold whitespace-nowrap">
          <th class="py-3 px-4">Nama Lengkap</th>
          <th class="py-3 px-4">Unit / Departemen</th>
          <th class="py-3 px-4">Peran</th>
          <th class="py-3 px-4">ID Kunci Digital</th>
          <th class="py-3 px-4 text-right">Tindakan</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr v-for="k in keys" :key="k.key_id" class="hover:bg-slate-50">
          <td class="py-3 px-4 whitespace-nowrap">
            <div class="font-semibold text-slate-900">{{ k.full_name }}</div>
            <div class="text-[11px] text-slate-400">@{{ k.username }}</div>
          </td>
          <td class="py-3 px-4 text-slate-600 whitespace-nowrap">{{ k.department }}</td>
          <td class="py-3 px-4 whitespace-nowrap">
            <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
              {{ formatRole(k.role) }}
            </span>
          </td>
          <td class="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
            <div class="inline-flex items-center gap-1.5">
              <span>{{ (k.fingerprint || "—").slice(0, 18) }}...</span>
              <CopyButton :value="k.fingerprint" label="ID Kunci Digital" />
            </div>
          </td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <router-link
              :to="`/encrypt?recipient_key_id=${k.key_id}`"
              class="h-7 px-2.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] inline-flex items-center"
            >
              Kirim File
            </router-link>
          </td>
        </tr>
      </tbody>
    </table>
  </DataTableCard>
</template>

<script setup lang="ts">
import type { PublicKeyDirectoryItemDTO } from "../../dto";
import { useFormatters } from "../../composables/useFormatters";
import CopyButton from "../CopyButton.vue";
import DataTableCard from "../DataTableCard.vue";

defineProps<{
  keys: PublicKeyDirectoryItemDTO[];
  loading: boolean;
  search: string;
}>();

const emit = defineEmits<{
  (e: "update:search", value: string): void;
}>();

const { formatRole } = useFormatters();
</script>
