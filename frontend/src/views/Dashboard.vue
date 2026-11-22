<template>
  <div class="p-6 max-w-[1360px] mx-auto space-y-6">
    <!-- Ringkasan Atas -->
    <PageHeader
      :title="t('dashboard.welcomeTitle', { name: authStore.user?.full_name || 'User' })"
      :subtitle="t('dashboard.subtitle')"
    >
      <template #actions>
        <router-link
          to="/decrypt"
          class="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center transition-colors"
        >
          {{ t("dashboard.openDocument") }}
        </router-link>
        <router-link
          to="/encrypt"
          class="h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white inline-flex items-center transition-colors"
        >
          {{ t("dashboard.lockNewDocument") }}
        </router-link>
      </template>
    </PageHeader>

    <div v-if="isLoading && !recentDocs.length" class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <SkeletonLoader :rows="3" />
    </div>

    <!-- 4 Kartu Statistik yang Mudah Dipahami -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        :label="t('dashboard.statLockedTitle')"
        :value="stats.metrics.encrypted_documents"
        :subtitle="t('dashboard.statLockedSub', { size: formatBytes(stats.metrics.total_storage_bytes) })"
      />
      <StatCard
        :label="t('dashboard.statReadyTitle')"
        :value="stats.metrics.active_keys"
        :subtitle="t('dashboard.statReadySub', { count: stats.metrics.total_users })"
      />
      <StatCard
        :label="t('dashboard.statDecryptedTitle')"
        :value="stats.metrics.total_decryptions"
        :subtitle="t('dashboard.statDecryptedSub')"
      />
      <StatCard
        :label="t('dashboard.statTamperTitle')"
        :value="stats.metrics.tamper_alerts"
        :subtitle="t('dashboard.statTamperSub')"
      />
    </div>

    <!-- Dokumen Terbaru & Status Kunci -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Tabel Dokumen Terbaru -->
      <DataTableCard
        class="lg:col-span-8"
        :loading="isLoading"
        :empty="recentDocs.length === 0"
        loadingText="Sedang memuat dokumen terbaru..."
        emptyText="Belum ada dokumen yang dikunci di sistem."
      >
        <template #header>
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-sm font-bold text-slate-900">Dokumen Terbaru</h3>
            <span
              v-for="(cnt, clsKey) in stats.usage_statistics?.classification_breakdown"
              :key="clsKey"
              class="px-2 py-0.5 rounded text-[11px] font-medium"
              :class="classificationBadge(clsKey)"
            >
              {{ formatClassification(clsKey) }}: {{ cnt }}
            </span>
          </div>
          <router-link to="/documents" class="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            Lihat Semua Dokumen &rarr;
          </router-link>
        </template>

        <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold whitespace-nowrap">
                <th class="py-3 px-4">Nama Dokumen &amp; Kode</th>
                <th class="py-3 px-4">Tingkat Kerahasiaan</th>
                <th class="py-3 px-4">Pengirim &rarr; Penerima</th>
                <th class="py-3 px-4">Ukuran File</th>
                <th class="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="doc in recentDocs.slice(0, 5)" :key="doc.id" class="hover:bg-slate-50">
                <td class="py-3 px-4 max-w-[220px]">
                  <div class="font-semibold text-slate-900 truncate" :title="doc.original_filename">
                    {{ doc.original_filename }}
                  </div>
                  <div class="font-mono text-[11px] text-slate-400 truncate">Kode: {{ doc.doc_uid }}</div>
                </td>
                <td class="py-3 px-4 whitespace-nowrap">
                  <span class="px-2 py-0.5 rounded text-[11px] font-medium" :class="classificationBadge(doc.classification)">
                    {{ formatClassification(doc.classification) }}
                  </span>
                </td>
                <td class="py-3 px-4 max-w-[200px] truncate text-slate-600">
                  {{ doc.sender_full_name }} &rarr; {{ doc.recipients[0]?.recipient_full_name || "Penerima" }}
                </td>
                <td class="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                  {{ formatBytes(doc.encrypted_size_bytes) }}
                </td>
                <td class="py-3 px-4 text-right whitespace-nowrap">
                  <router-link
                    :to="`/decrypt?document_id=${doc.id}`"
                    class="h-7 px-2.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] inline-flex items-center"
                  >
                    Buka Dokumen
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
      </DataTableCard>

      <!-- Status Kunci Pengguna -->
      <div class="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900">Kunci Keamanan Saya</h3>
          <StatusBadge
            :variant="stats.my_key.has_active_key ? 'success' : 'warning'"
            :label="stats.my_key.has_active_key ? 'Siap Digunakan' : 'Belum Aktif'"
          />
        </div>

        <p class="text-xs text-slate-500 leading-relaxed">
          Kunci keamanan ini digunakan secara otomatis agar rekan kerja dapat mengirim dokumen rahasia kepada Anda.
        </p>

        <div v-if="stats.my_key.has_active_key" class="space-y-2.5 text-xs">
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Standar Keamanan</span>
            <span class="font-mono font-semibold text-slate-800">{{ stats.my_key.curve }}</span>
          </div>
          <MonoCopyBox
            label="ID Kunci Digital (Sidik Jari Kunci)"
            :value="stats.my_key.fingerprint || ''"
            copyLabel="ID Kunci Digital"
            copyText="Salin ID Kunci"
            size="sm"
          />
        </div>

        <router-link
          to="/keys"
          class="h-9 w-full rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center transition-colors"
        >
          Pengaturan Kunci Keamanan
        </router-link>
      </div>
    </div>

    <!-- Log Aktivitas Terbaru -->
    <DataTableCard
      :empty="stats.recent_logs.length === 0"
      emptyText="Belum ada riwayat aktivitas terbaru."
    >
      <template #header>
        <h3 class="text-sm font-bold text-slate-900">Riwayat Aktivitas Terakhir</h3>
        <router-link to="/audit-logs" class="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          Lihat Semua Riwayat &rarr;
        </router-link>
      </template>

      <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold whitespace-nowrap">
              <th class="py-3 px-4">Waktu</th>
              <th class="py-3 px-4">Nama Pengguna</th>
              <th class="py-3 px-4">Kegiatan yang Dilakukan</th>
              <th class="py-3 px-4">Hasil</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="log in stats.recent_logs.slice(0, 5)" :key="log.id" class="hover:bg-slate-50 whitespace-nowrap">
              <td class="py-2.5 px-4 font-mono text-slate-500">{{ formatTime(log.timestamp) }}</td>
              <td class="py-2.5 px-4 font-medium text-slate-900">{{ log.actor_identity }}</td>
              <td class="py-2.5 px-4">
                <span class="px-2 py-0.5 rounded text-[11px] font-medium" :class="badgeClass(log.action_type)">
                  {{ formatAction(log.action_type) }}
                </span>
              </td>
              <td class="py-2.5 px-4">
                <StatusBadge
                  :variant="log.status === 'SUCCESS' ? 'success' : 'danger'"
                  :label="formatStatus(log.status)"
                />
              </td>
            </tr>
          </tbody>
        </table>
    </DataTableCard>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { dashboardService } from "../services";
import { DashboardResponseDTO, extractApiError } from "../dto";
import { useAuthStore } from "../stores/auth";
import { useFormatters } from "../composables/useFormatters";
import { useAsync } from "../composables/useAsync";
import { useI18n } from "../i18n";
import { useToastStore } from "../stores/toast";
import StatCard from "../components/StatCard.vue";
import PageHeader from "../components/PageHeader.vue";
import DataTableCard from "../components/DataTableCard.vue";
import StatusBadge from "../components/StatusBadge.vue";
import MonoCopyBox from "../components/MonoCopyBox.vue";
import SkeletonLoader from "../components/SkeletonLoader.vue";

const authStore = useAuthStore();
const toast = useToastStore();
const { t } = useI18n();
const {
  formatBytes,
  formatTime,
  formatClassification,
  formatAction,
  formatStatus,
  badgeClass,
  classificationBadge
} = useFormatters();

const recentDocs = ref([]);
const stats = ref(new DashboardResponseDTO());
const { loading: isLoading, execute: runDashboardLoad } = useAsync(() =>
  dashboardService.loadDashboardData()
);

async function loadDashboardData() {
  try {
    const data = await runDashboardLoad();
    stats.value = data.stats;
    recentDocs.value = data.recentDocs;
  } catch (err) {
    toast.show(extractApiError(err, "Gagal memuat data beranda."), "error");
  }
}

onMounted(() => {
  loadDashboardData();
});
</script>
