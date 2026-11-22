<template>
  <div class="p-6 max-w-[1360px] mx-auto space-y-5">
    <!-- Header Halaman -->
    <PageHeader
      :title="t('audit.title')"
      :subtitle="t('audit.subtitle')"
    >
      <template #actions>
        <button
          v-if="canVerifyAuditChain"
          type="button"
          @click="verifyChain"
          :disabled="verifyingChain"
          class="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
        >
          {{ verifyingChain ? t("audit.verifyingChain") : t("audit.verifyChain") }}
        </button>
        <button
          type="button"
          @click="exportCsv"
          class="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
        >
          {{ t("audit.exportCsv") }}
        </button>
        <button
          type="button"
          :disabled="isLoading"
          @click="loadLogs"
          class="h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
        >
          {{ isLoading ? t("common.loading") : t("common.reload") }}
        </button>
      </template>
    </PageHeader>

    <!-- Tab & Filter -->
    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="flex gap-2 w-full sm:w-auto">
        <button
          type="button"
          @click="activeTab = 'crypto'"
          class="h-8 px-3.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          :class="activeTab === 'crypto' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
        >
          Aktivitas Dokumen &amp; Kunci ({{ auditLogs.length }})
        </button>
        <button
          type="button"
          @click="activeTab = 'auth'"
          class="h-8 px-3.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          :class="activeTab === 'auth' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
        >
          Riwayat Masuk / Login ({{ filteredAuthLogs.length }})
        </button>
      </div>

      <div class="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
        <input
          v-model="filterReq.search"
          @input="handleSearchInput"
          type="text"
          placeholder="Cari nama pengguna atau IP..."
          class="h-8 sm:w-60 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
        />
        <select
          v-if="activeTab === 'crypto'"
          v-model="filterReq.action_type"
          @change="loadLogs"
          class="h-8 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="">Semua Jenis Kegiatan</option>
          <option value="ENCRYPTION">Mengunci Dokumen (Enkripsi)</option>
          <option value="DECRYPTION_SUCCESS">Membuka Dokumen (Dekripsi)</option>
          <option value="DECRYPTION_FAILED">Gagal Membuka Dokumen</option>
          <option value="TAMPER_DETECTED">File Rusak / Manipulasi Ditolak</option>
          <option value="DOCUMENT_DOWNLOADED">Mengunduh File Terkunci</option>
          <option value="DOCUMENT_DELETED">Menghapus Dokumen</option>
          <option value="KEY_GENERATED">Membuat Kunci Baru</option>
          <option value="KEY_ROTATED">Memperbarui Kunci</option>
          <option value="LOGIN">Masuk ke Sistem (Login)</option>
          <option value="LOGOUT">Keluar dari Sistem (Logout)</option>
          <option value="UNAUTHORIZED_ACCESS">Akses Ditolak / Gagal Masuk</option>
          <option value="USER_CREATED">Menambah Pengguna</option>
          <option value="USER_UPDATED">Memperbarui Data Pengguna</option>
          <option value="USER_DELETED">Menonaktifkan Pengguna</option>
          <option value="PASSWORD_CHANGED">Mengganti Kata Sandi</option>
          <option value="SETTINGS_UPDATED">Mengubah Pengaturan Sistem</option>
        </select>
        <select
          v-if="activeTab === 'crypto'"
          v-model="filterReq.status"
          @change="loadLogs"
          class="h-8 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="">Semua Status</option>
          <option value="SUCCESS">Berhasil</option>
          <option value="FAILURE">Ditolak / Gagal</option>
          <option value="ALERT">Peringatan Keamanan</option>
        </select>
        <select
          v-if="activeTab === 'auth'"
          v-model="authStatusFilter"
          class="h-8 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="">Semua Hasil Login</option>
          <option value="SUCCESS">Berhasil Masuk</option>
          <option value="FAILED">Gagal Masuk</option>
        </select>
        <button
          v-if="hasActiveFilter"
          type="button"
          @click="resetFilters"
          class="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer shrink-0"
        >
          Reset Filter
        </button>
      </div>
    </div>

    <!-- Tabel Log Kriptografi -->
    <DataTableCard
      v-if="activeTab === 'crypto'"
      :loading="isLoading"
      :empty="auditLogs.length === 0"
      loadingText="Sedang memuat riwayat aktivitas..."
      emptyText="Tidak ada riwayat aktivitas yang sesuai filter."
    >
      <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold whitespace-nowrap">
              <th class="py-3 px-4">Waktu</th>
              <th class="py-3 px-4">Nama Pengguna &amp; IP</th>
              <th class="py-3 px-4">Kegiatan yang Dilakukan</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Dokumen &amp; Sidik Jari</th>
              <th class="py-3 px-4">Keaslian Catatan</th>
              <th class="py-3 px-4 text-right">Rincian</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="log in auditLogs" :key="log.id" class="hover:bg-slate-50 whitespace-nowrap">
              <td class="py-2.5 px-4 font-mono text-slate-500">{{ formatTime(log.timestamp) }}</td>
              <td class="py-2.5 px-4">
                <span class="font-semibold text-slate-900">{{ log.actor_identity }}</span>
                <span class="text-slate-400 font-mono text-[11px] ml-2">({{ log.ip_address }})</span>
              </td>
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
              <td class="py-2.5 px-4">
                <div v-if="log.document_name" class="font-semibold text-slate-800 truncate max-w-[180px]" :title="log.document_name">
                  {{ log.document_name }}
                </div>
                <div class="font-mono text-[11px] text-slate-400">
                  {{ log.document_hash ? log.document_hash.slice(0, 16) + "..." : "—" }}
                </div>
              </td>
              <td class="py-2.5 px-4">
                <StatusBadge
                  :variant="log.signature_verified ? 'success' : 'danger'"
                  :label="log.signature_verified ? 'Terverifikasi Aman' : 'Tidak Valid'"
                />
              </td>
              <td class="py-2.5 px-4 text-right">
                <button
                  type="button"
                  @click="selectedLog = log"
                  class="h-7 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer"
                >
                  Detail
                </button>
              </td>
            </tr>
          </tbody>
        </table>
    </DataTableCard>

    <!-- Tabel Log Login -->
    <DataTableCard
      v-else
      :loading="isLoading"
      :empty="filteredAuthLogs.length === 0"
      loadingText="Sedang memuat riwayat masuk..."
      emptyText="Tidak ada riwayat masuk yang sesuai dengan pencarian."
    >
      <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold whitespace-nowrap">
              <th class="py-3 px-4">Waktu</th>
              <th class="py-3 px-4">Username</th>
              <th class="py-3 px-4">Kegiatan</th>
              <th class="py-3 px-4">Hasil</th>
              <th class="py-3 px-4">Alamat IP</th>
              <th class="py-3 px-4">Keterangan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="item in filteredAuthLogs" :key="item.id" class="hover:bg-slate-50 whitespace-nowrap">
              <td class="py-2.5 px-4 font-mono text-slate-500">{{ formatTime(item.timestamp) }}</td>
              <td class="py-2.5 px-4 font-semibold text-slate-900">{{ item.username_attempted }}</td>
              <td class="py-2.5 px-4 text-slate-700">{{ formatAction(item.event_type) }}</td>
              <td class="py-2.5 px-4">
                <StatusBadge
                  :variant="item.status === 'SUCCESS' ? 'success' : 'danger'"
                  :label="formatStatus(item.status)"
                />
              </td>
              <td class="py-2.5 px-4 font-mono text-slate-500">{{ item.ip_address }}</td>
              <td class="py-2.5 px-4 text-slate-600">{{ item.failure_reason || "Berhasil masuk ke sistem" }}</td>
            </tr>
          </tbody>
        </table>
    </DataTableCard>

    <!-- Modal Detail Bukti Kriptografi Audit Log -->
    <BaseModal
      :open="Boolean(selectedLog)"
      :title="`Rincian Catatan & Bukti Keaslian (#${selectedLog?.id})`"
      :subtitle="selectedLog ? `${formatAction(selectedLog.action_type)} • ${formatTime(selectedLog.timestamp)}` : ''"
      maxWidth="max-w-xl"
      @close="selectedLog = null"
    >
      <div v-if="selectedLog" class="space-y-2.5 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div class="text-slate-400">Pelaku &amp; Alamat IP</div>
            <div class="font-semibold text-slate-900 mt-0.5">{{ selectedLog.actor_identity }} ({{ selectedLog.ip_address }})</div>
          </div>
          <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div class="text-slate-400">Status Verifikasi ECDSA P-256</div>
            <div class="font-semibold mt-0.5" :class="selectedLog.signature_verified ? 'text-emerald-700' : 'text-rose-700'">
              {{ selectedLog.signature_verified ? "Valid & Tidak Dimanipulasi" : "Tidak Valid" }}
            </div>
          </div>
        </div>

        <MonoCopyBox
          label="Hash Rantai Sebelumnya (SHA-256 Hash Chain)"
          :value="selectedLog.prev_log_hash || ''"
          :copyable="false"
        />

        <MonoCopyBox
          label="Tanda Tangan Digital Server (ECDSA P-256)"
          :value="selectedLog.server_signature || ''"
          copyLabel="Tanda tangan ECDSA"
        />

        <div v-if="selectedLog.metadata && Object.keys(selectedLog.metadata).length" class="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
          <div class="text-slate-400">Rincian Tambahan (Metadata)</div>
          <pre class="font-mono text-[11px] text-slate-700 whitespace-pre-wrap break-all">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
        </div>
      </div>

      <template #footer>
        <button
          type="button"
          @click="selectedLog = null"
          class="h-8 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
        >
          Tutup
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { auditService } from "../services";
import { AuditFilterRequestDTO, AuditLogItemDTO, AuthLogItemDTO } from "../dto";
import { usePermissions } from "../composables/usePermissions";
import { useFormatters } from "../composables/useFormatters";
import { useI18n } from "../i18n";
import { useToastStore } from "../stores/toast";
import PageHeader from "../components/PageHeader.vue";
import DataTableCard from "../components/DataTableCard.vue";
import StatusBadge from "../components/StatusBadge.vue";
import BaseModal from "../components/BaseModal.vue";
import MonoCopyBox from "../components/MonoCopyBox.vue";

const { canVerifyAuditChain } = usePermissions();
const { formatTime, formatAction, formatStatus, badgeClass, debounce } = useFormatters();
const { t } = useI18n();
const toast = useToastStore();

const activeTab = ref<"crypto" | "auth">("crypto");
const isLoading = ref(false);
const auditLogs = ref<AuditLogItemDTO[]>([]);
const authLogs = ref<AuthLogItemDTO[]>([]);
const selectedLog = ref<AuditLogItemDTO | null>(null);
const authStatusFilter = ref("");
const verifyingChain = ref(false);
const filterReq = ref(new AuditFilterRequestDTO({ limit: 150 }));

async function verifyChain() {
  verifyingChain.value = true;
  try {
    const res = await auditService.verifyChain();
    if (res.valid) {
      toast.show(`Rantai audit valid (${res.checked}/${res.total} log terverifikasi aman).`, "success");
    } else {
      toast.show(
        `Rantai audit terputus di log #${res.broken_at_id}: ${res.reason || "Integritas tidak valid."}`,
        "error"
      );
    }
  } catch {
    toast.show("Gagal memverifikasi rantai audit.", "error");
  } finally {
    verifyingChain.value = false;
  }
}

const hasActiveFilter = computed(() =>
  Boolean(
    filterReq.value.search ||
    filterReq.value.action_type ||
    filterReq.value.status ||
    authStatusFilter.value
  )
);

function resetFilters() {
  filterReq.value.search = "";
  filterReq.value.action_type = "";
  filterReq.value.status = "";
  authStatusFilter.value = "";
  loadLogs();
}

const filteredAuthLogs = computed(() => {
  const q = (filterReq.value.search || "").trim().toLowerCase();
  return authLogs.value.filter((item) => {
    if (authStatusFilter.value && item.status !== authStatusFilter.value) {
      return false;
    }
    if (!q) return true;
    return (
      (item.username_attempted || "").toLowerCase().includes(q) ||
      (item.ip_address || "").toLowerCase().includes(q) ||
      (item.event_type || "").toLowerCase().includes(q) ||
      (item.failure_reason || "").toLowerCase().includes(q)
    );
  });
});

async function loadLogs() {
  isLoading.value = true;
  try {
    const data = await auditService.loadAllLogs(filterReq.value, 100);
    auditLogs.value = data.auditLogs;
    authLogs.value = data.authLogs;
  } catch {
    toast.show("Gagal memuat data riwayat aktivitas.", "error");
  } finally {
    isLoading.value = false;
  }
}

const debouncedLoadLogs = debounce(() => {
  loadLogs();
}, 300);

function handleSearchInput() {
  if (activeTab.value === "crypto") {
    debouncedLoadLogs();
  }
}

function exportCsv() {
  const message = auditService.exportLogsToCsv(activeTab.value, auditLogs.value, filteredAuthLogs.value);
  toast.show(message, "success");
}

onMounted(() => {
  loadLogs();
});

onUnmounted(() => {
  debouncedLoadLogs.cancel?.();
});
</script>
