<template>
  <div class="p-6 max-w-[1360px] mx-auto space-y-6">
    <!-- Header Halaman -->
    <PageHeader
      :title="t('settings.title')"
      :subtitle="t('settings.subtitle')"
    />

    <div v-if="isLoading" class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <SkeletonLoader :rows="4" />
    </div>

    <!-- Konfigurasi Kriptografi -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <h3 class="text-sm font-bold text-slate-900">Standar Keamanan Sistem Aktif</h3>
        <div class="divide-y divide-slate-100 text-xs">
          <div class="py-2.5 flex justify-between gap-2">
            <span class="text-slate-500">Penguncian Isi Dokumen</span>
            <span class="font-mono font-semibold text-slate-800">{{ settings.symmetric_algorithm }}</span>
          </div>
          <div class="py-2.5 flex justify-between gap-2">
            <span class="text-slate-500">Kunci Digital Pengguna</span>
            <span class="font-mono font-semibold text-slate-800">{{ settings.asymmetric_curve }}</span>
          </div>
          <div class="py-2.5 flex justify-between gap-2">
            <span class="text-slate-500">Metode Pertukaran Kunci</span>
            <span class="font-mono font-semibold text-slate-800">{{ settings.key_agreement }} + {{ settings.kdf_algorithm }}</span>
          </div>
          <div class="py-2.5 flex justify-between gap-2">
            <span class="text-slate-500">Perlindungan Kata Sandi Akun</span>
            <span class="font-mono font-semibold text-slate-800">{{ settings.password_hashing }}</span>
          </div>
          <div class="py-2.5 flex justify-between gap-2">
            <span class="text-slate-500">Penyimpanan Kunci Pribadi</span>
            <span class="font-mono font-semibold text-slate-800">{{ settings.private_key_format }}</span>
          </div>
        </div>
      </div>

      <div v-if="authStore.isAdmin" class="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div class="space-y-1">
          <h3 class="text-sm font-bold text-slate-900">Konfigurasi Operasional Instansi</h3>
          <p class="text-xs text-slate-500">
            Atur identitas unit kerja, masa berlaku sesi login, dan metode penguncian dokumen standar.
          </p>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Nama Instansi / Unit Kerja</label>
            <input
              v-model="settings.organization_name"
              type="text"
              :disabled="!authStore.isAdmin"
              class="w-full h-9 bg-slate-50 border border-slate-300 rounded-lg px-3 text-xs text-slate-900 disabled:opacity-60"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Durasi Sesi Login Pengguna (Menit)</label>
            <input
              v-model.number="settings.jwt_expiration_minutes"
              type="number"
              min="15"
              max="1440"
              :disabled="!authStore.isAdmin"
              class="w-full h-9 bg-slate-50 border border-slate-300 rounded-lg px-3 text-xs text-slate-900 disabled:opacity-60"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Metode Penguncian File Default</label>
            <select
              v-model="settings.default_key_wrap_mode"
              :disabled="!authStore.isAdmin"
              class="w-full h-9 bg-slate-50 border border-slate-300 rounded-lg px-3 text-xs text-slate-900 disabled:opacity-60"
            >
              <option value="XOR_AAD">Standar Cepat (Format HC01 — Direkomendasikan)</option>
              <option value="AES_GCM_KW">Perlindungan Lapis Ganda (Format HC02)</option>
            </select>
          </div>
        </div>

        <button
          v-if="authStore.isAdmin"
          type="button"
          :disabled="isSaving"
          @click="saveSettings"
          class="w-full h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
        >
          {{ isSaving ? "Menyimpan..." : "Simpan Pengaturan" }}
        </button>
      </div>
    </div>

    <!-- Tabel Hasil Benchmark -->
    <div v-if="benchmarks.performance_results.length" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Hasil Uji Kecepatan &amp; Ketahanan Keamanan</h3>
          <p class="text-xs text-slate-500 mt-0.5">Pengujian pada ukuran file 1 MB, 10 MB, dan 100 MB</p>
        </div>
        <span class="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
          Penolakan File Rusak/Dimanipulasi: {{ benchmarks.tamper_detection.detected_scenarios }}/{{ benchmarks.tamper_detection.total_scenarios }} (100% Aman)
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-sans font-semibold whitespace-nowrap">
              <th class="py-3 px-4">Ukuran File Uji</th>
              <th class="py-3 px-4">Waktu Mengunci (Enkripsi)</th>
              <th class="py-3 px-4">Waktu Membuka (Dekripsi)</th>
              <th class="py-3 px-4">Kecepatan Proses</th>
              <th class="py-3 px-4">Tambahan Ukuran</th>
              <th class="py-3 px-4">Tingkat Keacakan (Entropi)</th>
              <th class="py-3 px-4">Efek Avalanche</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="row in benchmarks.performance_results" :key="row.code" class="hover:bg-slate-50 whitespace-nowrap">
              <td class="py-3 px-4 font-sans font-semibold text-slate-900">{{ row.label }}</td>
              <td class="py-3 px-4 text-slate-800">{{ row.avg_encrypt_ms }} ms</td>
              <td class="py-3 px-4 text-slate-800">{{ row.avg_decrypt_ms }} ms</td>
              <td class="py-3 px-4 text-slate-700">{{ row.throughput_encrypt_mibs }} / {{ row.throughput_decrypt_mibs }} MB/dtk</td>
              <td class="py-3 px-4 text-slate-600">+{{ row.overhead_bytes }} Byte</td>
              <td class="py-3 px-4 text-slate-800">{{ row.ciphertext_entropy }} / 8.00</td>
              <td class="py-3 px-4 text-slate-800">{{ row.avalanche_effect_percent }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { settingsService } from "../services";
import {
  SystemSettingsDTO,
  UpdateSettingsRequestDTO,
  BenchmarkResponseDTO,
  extractApiError
} from "../dto";
import { useAuthStore } from "../stores/auth";
import { useAsync } from "../composables/useAsync";
import { useI18n } from "../i18n";
import { useToastStore } from "../stores/toast";
import PageHeader from "../components/PageHeader.vue";
import SkeletonLoader from "../components/SkeletonLoader.vue";

const authStore = useAuthStore();
const toast = useToastStore();
const { t } = useI18n();

const settings = ref(new SystemSettingsDTO());
const benchmarks = ref(new BenchmarkResponseDTO());
const isSaving = ref(false);
const { loading: isLoading, execute: runSettingsLoad } = useAsync(() =>
  settingsService.loadSettingsPageData()
);

async function loadData() {
  try {
    const data = await runSettingsLoad();
    settings.value = data.settings;
    benchmarks.value = data.benchmarks;
  } catch (err) {
    toast.show(extractApiError(err, "Gagal memuat pengaturan sistem."), "error");
  }
}

async function saveSettings() {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    const updateReq = new UpdateSettingsRequestDTO({
      organization_name: settings.value.organization_name,
      default_key_wrap_mode: settings.value.default_key_wrap_mode,
      jwt_expiration_minutes: settings.value.jwt_expiration_minutes
    });
    settings.value = await settingsService.updateSettings(updateReq);
    toast.show("Pengaturan berhasil disimpan.", "success");
  } catch (err) {
    toast.show(extractApiError(err, "Gagal menyimpan pengaturan."), "error");
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>
