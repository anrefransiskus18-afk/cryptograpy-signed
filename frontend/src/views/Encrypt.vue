<template>
  <div class="p-6 max-w-3xl mx-auto space-y-5">
    <PageHeader
      :title="t('encrypt.title')"
      :subtitle="t('encrypt.subtitle')"
    >
      <template #actions>
        <router-link
          to="/documents"
          class="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center shrink-0"
        >
          {{ t("encrypt.viewDocuments") }}
        </router-link>
      </template>
    </PageHeader>

    <!-- Hasil Enkripsi (Jika Selesai) -->
    <div
      v-if="lastEncryptionResult"
      class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div class="space-y-0.5">
        <div class="text-xs font-bold text-emerald-900">
          Dokumen Berhasil Dikunci ({{ lastEncryptionResult.timeMs }} milidetik)
        </div>
        <div class="text-xs text-emerald-800">
          File terkunci <code class="font-semibold">{{ lastEncryptionResult.filename }}</code> telah disimpan ke sistem dan diunduh ke komputer Anda.
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          @click="encryptionService.downloadResult(lastEncryptionResult)"
          class="h-8 px-3 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold cursor-pointer"
        >
          Unduh Ulang (.enc)
        </button>
        <router-link
          v-if="lastEncryptionResult.docId"
          :to="`/decrypt?document_id=${lastEncryptionResult.docId}`"
          class="h-8 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center"
        >
          Coba Buka Dokumen Ini &rarr;
        </router-link>
      </div>
    </div>

    <!-- Form Utama Enkripsi -->
    <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
      <!-- 1. Pilih File (Drag & Drop + Klik) -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-slate-700">1. Pilih Dokumen yang Ingin Diamankan</label>
          <button
            type="button"
            @click="createSampleDocument"
            class="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            Isi Otomatis dengan File Contoh
          </button>
        </div>

        <FileDropzone
          inputId="file-upload"
          :file="encryptReq.document"
          accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.csv,.json,.xml,.zip,.png,.jpg,.jpeg,.md,.bin"
          emptyTitle="Klik di sini atau tarik (drag &amp; drop) file dokumen ke kotak ini"
          hint="Mendukung semua jenis dokumen (PDF, Word, Excel, CSV, TXT, ZIP)"
          @select="validateAndSetFile"
        >
          <template #selected="{ file }">
            <p class="text-xs font-bold text-slate-900 truncate max-w-md mx-auto">{{ file.name }}</p>
            <p class="text-[11px] font-mono text-slate-500">Ukuran file: {{ formatBytes(file.size) }}</p>
            <button
              type="button"
              @click.prevent="encryptReq.document = null"
              class="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              Batalkan Pilihan File
            </button>
          </template>
        </FileDropzone>
      </div>

      <!-- 2. Penerima & Klasifikasi -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label :for="recipientSelectId" class="block text-xs font-semibold text-slate-700 mb-1.5">2. Pilih Penerima Dokumen</label>
          <select
            :id="recipientSelectId"
            v-model="encryptReq.recipient_key_id"
            class="h-9 w-full bg-slate-50 border border-slate-300 rounded-lg px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
          >
            <option :value="null" disabled>-- Pilih Siapa yang Boleh Membuka --</option>
            <option
              v-for="item in recipientKeys"
              :key="item.key_id"
              :value="item.key_id"
            >
              {{ item.full_name }} — {{ item.department }} (Izin Level {{ item.clearance_level }})
            </option>
          </select>
        </div>

        <BaseSelect
          v-model="encryptReq.aad.classification"
          label="3. Tingkat Kerahasiaan Dokumen"
        >
          <option value="INTERNAL">Internal — Lingkup Perusahaan (Min. Level 1)</option>
          <option value="CONFIDENTIAL">Terbatas / Confidential (Min. Level 2)</option>
          <option value="SECRET">Rahasia / Secret (Min. Level 3)</option>
          <option value="TOP_SECRET">Sangat Rahasia / Top Secret (Min. Level 4)</option>
        </BaseSelect>
      </div>

      <AlertBanner v-if="clearanceWarning" variant="warning" :message="clearanceWarning" />

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BaseInput
          v-model="encryptReq.aad.origin_department"
          label="Unit / Departemen Pengirim"
          placeholder="Contoh: Divisi Keuangan"
        />

        <BaseSelect
          v-model="encryptReq.wrap_mode"
          label="Metode Penguncian File"
        >
          <option value="XOR_AAD">Standar Cepat (Format HC01 — Direkomendasikan)</option>
          <option value="AES_GCM_KW">Perlindungan Lapis Ganda (Format HC02)</option>
        </BaseSelect>

        <BaseSelect
          :modelValue="encryptReq.expires_in_hours ? String(encryptReq.expires_in_hours) : ''"
          label="Masa Berlaku Akses"
          @update:modelValue="encryptReq.expires_in_hours = $event ? Number($event) : null"
        >
          <option value="">Tanpa Batas Waktu</option>
          <option value="24">24 Jam</option>
          <option value="168">7 Hari</option>
          <option value="720">30 Hari</option>
        </BaseSelect>
      </div>

      <!-- Indikator Progres Unggah & Enkripsi -->
      <ProgressBar
        v-if="isEncrypting"
        label="Mengunggah &amp; mengunci dokumen..."
        :progress="uploadProgress"
      />

      <AlertBanner v-if="errorMessage" variant="error" :message="errorMessage" />

      <BaseButton
        :loading="isEncrypting"
        :disabled="isEncrypting || !encryptReq.document || !encryptReq.recipient_key_id || Boolean(clearanceWarning)"
        block
        class="h-10"
        @click="executeEncryption"
      >
        {{ isEncrypting ? "Sedang Mengunci Dokumen..." : "Kunci Dokumen & Unduh Hasilnya (.enc)" }}
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, useId } from "vue";
import { useRoute } from "vue-router";
import { cryptoService, encryptionService } from "../services";
import {
  EncryptDocumentRequestDTO,
  EncryptResultResponseDTO,
  PublicKeyDirectoryItemDTO,
  extractApiError
} from "../dto";
import { useAuthStore } from "../stores/auth";
import { useFormatters } from "../composables/useFormatters";
import { useI18n } from "../i18n";
import { useToastStore } from "../stores/toast";
import PageHeader from "../components/PageHeader.vue";
import FileDropzone from "../components/FileDropzone.vue";
import AlertBanner from "../components/AlertBanner.vue";
import ProgressBar from "../components/ProgressBar.vue";
import BaseSelect from "../components/BaseSelect.vue";
import BaseInput from "../components/BaseInput.vue";
import BaseButton from "../components/BaseButton.vue";

const recipientSelectId = useId();

const route = useRoute();
const authStore = useAuthStore();
const { t } = useI18n();
const { formatBytes, formatClassification } = useFormatters();
const toast = useToastStore();

const encryptReq = ref(
  new EncryptDocumentRequestDTO({
    aad: {
      classification: "INTERNAL",
      origin_department: authStore.user?.department || "Divisi Keamanan Informasi",
      document_version: "1.0"
    }
  })
);
const recipientKeys = ref<PublicKeyDirectoryItemDTO[]>([]);
const isEncrypting = ref(false);
const uploadProgress = ref(0);
const errorMessage = ref("");
const lastEncryptionResult = ref<EncryptResultResponseDTO | null>(null);

const selectedRecipient = computed(() =>
  recipientKeys.value.find((k) => k.key_id === encryptReq.value.recipient_key_id) || null
);

const clearanceWarning = computed(() =>
  encryptionService.getClearanceMismatchMessage(
    selectedRecipient.value,
    encryptReq.value.aad.classification,
    formatClassification
  )
);

function validateAndSetFile(file: File) {
  try {
    encryptReq.value.document = encryptionService.validateFile(file);
    errorMessage.value = "";
  } catch (err: unknown) {
    errorMessage.value = extractApiError(err, "File tidak valid.");
  }
}

function createSampleDocument() {
  encryptReq.value.document = encryptionService.createSampleDocument();
  errorMessage.value = "";
  toast.show("File contoh siap dikunci.", "info");
}

async function fetchInitialConfig() {
  try {
    const { recipientKeys: keysList, settings } = await cryptoService.loadEncryptionConfig();
    recipientKeys.value = keysList;
    const queryKeyId = Number(route.query.recipient_key_id);
    if (queryKeyId && recipientKeys.value.some((k) => k.key_id === queryKeyId)) {
      encryptReq.value.recipient_key_id = queryKeyId;
    } else if (recipientKeys.value[0] && !encryptReq.value.recipient_key_id) {
      encryptReq.value.recipient_key_id = recipientKeys.value[0].key_id;
    }
    if (settings?.default_key_wrap_mode) {
      encryptReq.value.wrap_mode = settings.default_key_wrap_mode;
    }
    if (authStore.user?.department) {
      encryptReq.value.aad.origin_department = authStore.user.department;
    }
  } catch {
    errorMessage.value = "Gagal memuat daftar penerima dokumen.";
  }
}

async function executeEncryption() {
  errorMessage.value = "";
  lastEncryptionResult.value = null;
  uploadProgress.value = 10;
  isEncrypting.value = true;

  try {
    const resultDto = await cryptoService.encrypt(encryptReq.value, (percent) => {
      uploadProgress.value = percent;
    });
    lastEncryptionResult.value = resultDto;
    encryptReq.value.document = null;
    toast.show(`Dokumen ${resultDto.filename} berhasil dikunci dan diunduh.`, "success");
  } catch (err) {
    errorMessage.value = extractApiError(err, "Terjadi kesalahan saat mengunci dokumen.");
  } finally {
    isEncrypting.value = false;
    uploadProgress.value = 0;
  }
}

onMounted(() => {
  fetchInitialConfig();
});
</script>
