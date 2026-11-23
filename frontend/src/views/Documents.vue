<template>
  <div class="p-6 max-w-[1360px] mx-auto space-y-5">
    <!-- Header Halaman -->
    <PageHeader
      :title="t('documents.title')"
      :subtitle="t('documents.subtitle')"
    >
      <template #actions>
        <button
          type="button"
          :disabled="isLoading"
          @click="loadDocuments"
          class="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
        >
          {{ isLoading ? t("common.loading") : t("common.reload") }}
        </button>
        <router-link
          to="/encrypt"
          class="h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white inline-flex items-center"
        >
          {{ t("documents.encryptNew") }}
        </router-link>
      </template>
    </PageHeader>

    <!-- Filter & Pencarian -->
    <FilterToolbar
      v-model:search="filterReq.search"
      searchPlaceholder="Cari nama file atau kode dokumen..."
      @update:search="debouncedSearch"
    >
      <template #filters>
        <BaseSelect
          v-model="filterReq.classification"
          @update:modelValue="handleFilterChange"
          selectClass="font-medium text-slate-700"
        >
          <option value="">Semua Tingkat Kerahasiaan</option>
          <option value="INTERNAL">Internal</option>
          <option value="CONFIDENTIAL">Terbatas (Confidential)</option>
          <option value="SECRET">Rahasia (Secret)</option>
          <option value="TOP_SECRET">Sangat Rahasia (Top Secret)</option>
        </BaseSelect>

        <BaseSelect
          v-model="filterReq.scope"
          @update:modelValue="handleFilterChange"
          selectClass="font-medium text-slate-700"
        >
          <option value="all">Semua Dokumen Saya</option>
          <option value="sent">Dokumen yang Saya Kirim</option>
          <option value="received">Dokumen Masuk untuk Saya</option>
        </BaseSelect>

        <BaseButton
          v-if="filterReq.search || filterReq.classification || filterReq.scope !== 'all'"
          variant="secondary"
          @click="resetFilters"
        >
          Reset Filter
        </BaseButton>
      </template>
    </FilterToolbar>

    <!-- Tabel Dokumen -->
    <DataTableCard
      :loading="isLoading"
      :empty="documents.length === 0"
      loadingText="Sedang memuat daftar dokumen..."
    >
      <template #empty>
        <div class="text-sm font-semibold text-slate-800">Belum ada dokumen ditemukan</div>
        <p class="text-xs text-slate-500 mt-1">Klik tombol "+ Kunci Dokumen Baru" di kanan atas untuk mengamankan dokumen pertama Anda.</p>
      </template>

      <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold whitespace-nowrap">
              <th class="py-3 px-4">Nama Dokumen &amp; Kode</th>
              <th class="py-3 px-4">Tingkat Kerahasiaan</th>
              <th class="py-3 px-4">Pengirim &rarr; Penerima</th>
              <th class="py-3 px-4">Ukuran File</th>
              <th class="py-3 px-4">Waktu Dikunci</th>
              <th class="py-3 px-4 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="doc in documents" :key="doc.id" class="hover:bg-slate-50">
              <td class="py-3 px-4 max-w-[260px]">
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
              <td class="py-3 px-4 max-w-[220px]">
                <div class="truncate text-slate-700 font-medium">
                  {{ doc.sender_full_name }} &rarr; {{ doc.recipients[0]?.recipient_full_name || "Penerima" }}
                </div>
                <div class="text-[11px] mt-0.5">
                  <span
                    v-if="(doc.recipients[0]?.decrypted_count ?? 0) > 0"
                    class="text-emerald-700 font-medium"
                  >
                    Sudah dibuka ({{ doc.recipients[0]?.decrypted_count }}x)
                  </span>
                  <span v-else class="text-slate-400">Belum dibuka penerima</span>
                </div>
              </td>
              <td class="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                {{ formatBytes(doc.encrypted_size_bytes) }}
              </td>
              <td class="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                {{ formatTime(doc.created_at) }}
              </td>
              <td class="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                <button
                  type="button"
                  @click="inspectDocument(doc.id)"
                  class="h-7 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] cursor-pointer"
                >
                  Info File
                </button>
                <button
                  type="button"
                  @click="downloadEncrypted(doc)"
                  class="h-7 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] cursor-pointer"
                >
                  Unduh (.enc)
                </button>
                <router-link
                  :to="`/decrypt?document_id=${doc.id}`"
                  class="h-7 px-2.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] inline-flex items-center"
                >
                  Buka Isi
                </router-link>
                <button
                  v-if="canDeleteDoc(doc)"
                  type="button"
                  @click="docToDelete = doc"
                  class="h-7 px-2.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-[11px] cursor-pointer"
                >
                  Hapus
                </button>
              </td>
            </tr>
          </tbody>
        </table>

      <!-- Footer Paginasi -->
      <template v-if="!isLoading && totalItems > 0" #footer>
        <PaginationBar
          :page="filterReq.page"
          :totalPages="totalPages"
          :shownCount="documents.length"
          :totalItems="totalItems"
          itemLabel="dokumen"
          @change="changePage"
        />
      </template>
    </DataTableCard>

    <!-- Modal Detail Dokumen -->
    <BaseModal
      :open="Boolean(selectedDocDetail)"
      title="Informasi Keamanan Dokumen"
      :subtitle="selectedDocDetail?.original_filename"
      maxWidth="max-w-lg"
      @close="selectedDocDetail = null"
    >
      <div v-if="selectedDocDetail" class="space-y-2.5 text-xs">
        <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Kode Unik Dokumen</span>
          <div class="flex items-center gap-1.5">
            <span class="font-mono font-semibold text-slate-800">{{ selectedDocDetail.doc_uid }}</span>
            <CopyButton :value="selectedDocDetail.doc_uid" label="Kode Dokumen" />
          </div>
        </div>
        <div class="flex justify-between py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Tingkat Kerahasiaan</span>
          <span class="font-semibold text-slate-800">{{ formatClassification(selectedDocDetail.classification) }}</span>
        </div>
        <div class="flex justify-between py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Ukuran File Asli / Terkunci</span>
          <span class="font-mono text-slate-800">
            {{ formatBytes(selectedDocDetail.original_size_bytes) }} / {{ formatBytes(selectedDocDetail.encrypted_size_bytes) }}
          </span>
        </div>
        <div class="flex justify-between py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Kecepatan Penguncian</span>
          <span class="font-mono text-slate-800">
            {{ selectedDocDetail.encryption_metadata?.encryption_duration_ms ?? "—" }} milidetik
          </span>
        </div>
        <MonoCopyBox
          label="Sidik Jari Keaslian Dokumen Asli (SHA-256)"
          :value="selectedDocDetail.sha256_plaintext_hash"
          copyLabel="Sidik jari dokumen asli"
        />
        <MonoCopyBox
          label="Sidik Jari File Terkunci .enc (SHA-256)"
          :value="selectedDocDetail.sha256_ciphertext_hash"
          copyLabel="Sidik jari file .enc"
        />
      </div>

      <template #footer>
        <button
          type="button"
          @click="selectedDocDetail && downloadEncrypted(selectedDocDetail)"
          class="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
        >
          Unduh (.enc)
        </button>
        <router-link
          :to="`/decrypt?document_id=${selectedDocDetail?.id}`"
          class="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white inline-flex items-center"
        >
          Buka Isi Dokumen
        </router-link>
        <button
          type="button"
          @click="selectedDocDetail = null"
          class="h-8 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
        >
          Tutup
        </button>
      </template>
    </BaseModal>

    <ConfirmModal
      :open="Boolean(docToDelete)"
      title="Hapus Dokumen dari Daftar"
      :message="`Apakah Anda yakin ingin menghapus dokumen '${docToDelete?.original_filename}'?`"
      confirmText="Ya, Hapus"
      @cancel="docToDelete = null"
      @confirm="executeDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted } from "vue";
import { documentService } from "../services";
import { DocumentFilterRequestDTO, DocumentResponseDTO, extractApiError } from "../dto";
import { usePermissions } from "../composables/usePermissions";
import { useFormatters } from "../composables/useFormatters";
import { useI18n } from "../i18n";
import { useToastStore } from "../stores/toast";
import { isCanceledError } from "../utils/validators";
import FilterToolbar from "../components/FilterToolbar.vue";
import BaseSelect from "../components/BaseSelect.vue";
import BaseButton from "../components/BaseButton.vue";
import ConfirmModal from "../components/ConfirmModal.vue";
import PageHeader from "../components/PageHeader.vue";
import DataTableCard from "../components/DataTableCard.vue";
import BaseModal from "../components/BaseModal.vue";
import CopyButton from "../components/CopyButton.vue";
import MonoCopyBox from "../components/MonoCopyBox.vue";
import PaginationBar from "../components/PaginationBar.vue";

const { canDeleteDocument: canDeleteDoc } = usePermissions();
const { t } = useI18n();
const {
  formatBytes,
  formatTime,
  formatClassification,
  classificationBadge,
  debounce
} = useFormatters();
const toast = useToastStore();

const documents = shallowRef<DocumentResponseDTO[]>([]);
const totalItems = ref(0);
const isLoading = ref(false);
const filterReq = ref(new DocumentFilterRequestDTO({ page: 1, per_page: 10 }));
const selectedDocDetail = ref<DocumentResponseDTO | null>(null);
const docToDelete = ref<DocumentResponseDTO | null>(null);

const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / filterReq.value.per_page)));

let listAbortController: AbortController | null = null;

async function loadDocuments() {
  listAbortController?.abort();
  listAbortController = typeof AbortController !== "undefined" ? new AbortController() : null;
  const controller = listAbortController;
  isLoading.value = true;
  try {
    const resDto = await documentService.list(filterReq.value, {
      signal: controller?.signal
    });
    documents.value = resDto.items;
    totalItems.value = resDto.total ?? resDto.items.length;
  } catch (err: unknown) {
    if (isCanceledError(err)) return;
    toast.show("Gagal memuat daftar dokumen.", "error");
  } finally {
    if (listAbortController === controller) {
      isLoading.value = false;
    }
  }
}

function handleFilterChange() {
  filterReq.value.page = 1;
  loadDocuments();
}

function resetFilters() {
  filterReq.value.search = "";
  filterReq.value.classification = "";
  filterReq.value.scope = "all";
  filterReq.value.page = 1;
  loadDocuments();
}

const debouncedSearch = debounce(() => {
  handleFilterChange();
}, 300);

function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value) return;
  filterReq.value.page = nextPage;
  loadDocuments();
}

async function inspectDocument(docId: number) {
  try {
    selectedDocDetail.value = await documentService.getById(docId);
  } catch {
    toast.show("Gagal memuat informasi dokumen.", "error");
  }
}

async function downloadEncrypted(doc: DocumentResponseDTO) {
  try {
    const filename = await documentService.downloadEncrypted(doc);
    toast.show(`File ${filename} berhasil diunduh.`, "success");
  } catch (err) {
    toast.show(extractApiError(err, "Gagal mengunduh file."), "error");
  }
}

async function executeDelete() {
  if (!docToDelete.value) return;
  try {
    await documentService.remove(docToDelete.value.id);
    toast.show("Dokumen berhasil dihapus.", "success");
    docToDelete.value = null;
    if (documents.value.length <= 1 && filterReq.value.page > 1) {
      filterReq.value.page -= 1;
    }
    await loadDocuments();
  } catch (err) {
    toast.show(extractApiError(err, "Gagal menghapus dokumen."), "error");
  }
}

onMounted(() => {
  loadDocuments();
});

onUnmounted(() => {
  listAbortController?.abort();
  debouncedSearch.cancel?.();
});
</script>
