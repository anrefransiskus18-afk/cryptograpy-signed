<template>
  <div class="p-6 max-w-3xl mx-auto space-y-5">
    <!-- Header Halaman -->
    <PageHeader :title="t('decrypt.title')">
      <template #actions>
        <router-link
          to="/documents"
          class="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center shrink-0"
        >
          {{ t("decrypt.viewDocuments") }}
        </router-link>
      </template>
    </PageHeader>

    <!-- Peringatan Manipulasi Data (Tamper Alert) -->
    <AlertBanner
      v-if="tamperAlert"
      variant="error"
      title="Pembukaan Dokumen Ditolak — Isi File Terdeteksi Telah Diubah atau Rusak!"
      :message="tamperAlert"
    />

    <!-- Notifikasi Sukses -->
    <AlertBanner
      v-if="decryptionSuccess"
      variant="success"
      title="Dokumen Berhasil Dibuka &amp; Keasliannya Terjamin"
    >
      Dokumen asli telah diunduh ke komputer Anda dengan nama <code class="font-semibold">{{ decryptReq.original_filename }}</code>.
    </AlertBanner>

    <!-- Form Utama Dekripsi -->
    <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
      <!-- 1. Pilih Sumber Dokumen -->
      <div class="space-y-3">
        <label class="block text-xs font-semibold text-slate-700">
          1. Pilih Dokumen yang Ingin Dibuka
        </label>

        <select
          v-model="decryptReq.document_id"
          @change="handleSelectStoredDocument"
          class="h-9 w-full bg-slate-50 border border-slate-300 rounded-lg px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
        >
          <option :value="null">-- Pilih dari Daftar Dokumen di Sistem, atau Unggah File di Bawah --</option>
          <option v-for="d in sortedStoredDocuments" :key="d.id" :value="d.id">
            {{ isRecipientCurrentUser(d) ? "[Untuk Anda]" : `[Penerima: ${d.recipients[0]?.recipient_full_name || "Lainnya"}]` }}
            {{ d.original_filename }} ({{ formatClassification(d.classification) }})
          </option>
        </select>

        <AlertBanner v-if="recipientMismatchNote" variant="warning" :message="recipientMismatchNote" />

        <FileDropzone
          inputId="enc-upload"
          :file="decryptReq.enc_file"
          accept=".enc"
          emptyTitle="Atau klik / tarik (drag &amp; drop) file .enc dari komputer Anda ke kotak ini"
          @select="assignEncFile"
        >
          <template #selected="{ file }">
            <p class="text-xs font-bold text-slate-900 truncate max-w-md mx-auto">{{ file.name }}</p>
            <p class="text-[11px] font-mono text-slate-500">Ukuran file: {{ formatBytes(file.size) }}</p>
            <button
              type="button"
              @click.prevent="decryptReq.enc_file = null"
              class="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              Batalkan Pilihan File
            </button>
          </template>
        </FileDropzone>

        <div v-if="decryptReq.enc_file" class="flex justify-end">
          <button
            type="button"
            @click="simulateOneBitTamper"
            class="text-xs font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
          >
            Simulasikan File Diubah Pihak Lain (Uji Keamanan)
          </button>
        </div>
      </div>

      <!-- 2. Nama File & Passphrase -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">2. Simpan Sebagai Nama File</label>
          <input
            v-model="decryptReq.original_filename"
            type="text"
            placeholder="Contoh: Laporan_Keuangan.pdf"
            class="h-9 w-full bg-slate-50 border border-slate-300 rounded-lg px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <PasswordInput
          v-model="decryptReq.passphrase"
          label="3. Kata Sandi Kunci Keamanan"
          placeholder="Masukkan kata sandi kunci Anda"
        />
      </div>

      <!-- Opsi Kunci Privat Manual -->
      <div class="space-y-2 pt-2 border-t border-slate-100">
        <label class="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" v-model="decryptReq.use_stored_key" class="rounded border-slate-300" />
          <span>Gunakan kunci keamanan saya yang sudah tersimpan otomatis di sistem</span>
        </label>

        <div v-if="!decryptReq.use_stored_key" class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-semibold text-slate-700">Tempel atau Unggah Cadangan Kunci Pribadi (.pem)</label>
            <label
              for="pem-file-upload"
              class="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              Pilih File Kunci (.pem)
              <input
                id="pem-file-upload"
                type="file"
                accept=".pem,.key,.txt"
                class="hidden"
                @change="handlePemFileUpload"
              />
            </label>
          </div>
          <textarea
            v-model="decryptReq.private_key_pkcs8"
            rows="3"
            placeholder="-----BEGIN ENCRYPTED PRIVATE KEY----- ..."
            class="w-full font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-600"
          ></textarea>
        </div>
      </div>

      <!-- Indikator Progres Dekripsi -->
      <ProgressBar
        v-if="isDecrypting"
        label="Memverifikasi keaslian &amp; membuka dokumen..."
        :progress="uploadProgress"
      />

      <AlertBanner v-if="generalError" variant="warning" :message="generalError" />

      <button
        type="button"
        :disabled="isDecrypting || (!decryptReq.enc_file && !decryptReq.document_id) || (!decryptReq.private_key_pkcs8 && !decryptReq.use_stored_key) || !decryptReq.passphrase"
        @click="executeDecryption"
        class="h-10 w-full rounded-lg font-semibold text-xs transition-colors flex items-center justify-center cursor-pointer"
        :class="isDecrypting || (!decryptReq.enc_file && !decryptReq.document_id) || (!decryptReq.private_key_pkcs8 && !decryptReq.use_stored_key) || !decryptReq.passphrase
          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
          : 'bg-indigo-600 hover:bg-indigo-700 text-white'"
      >
        {{ isDecrypting ? "Memeriksa Keaslian & Membuka Dokumen..." : "Buka Kunci & Unduh Dokumen Asli" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { cryptoService, decryptionService, documentService } from "../services";
import {
  DecryptDocumentRequestDTO,
  DocumentFilterRequestDTO,
  DocumentResponseDTO,
  extractApiError
} from "../dto";
import { ErrorType } from "../utils/errors";
import { useAuthStore } from "../stores/auth";
import { useFormatters } from "../composables/useFormatters";
import { useI18n } from "../i18n";
import { useToastStore } from "../stores/toast";
import { DEMO_KEY_PASSPHRASE } from "../config/demo";
import PageHeader from "../components/PageHeader.vue";
import AlertBanner from "../components/AlertBanner.vue";
import FileDropzone from "../components/FileDropzone.vue";
import PasswordInput from "../components/PasswordInput.vue";
import ProgressBar from "../components/ProgressBar.vue";

const route = useRoute();
const authStore = useAuthStore();
const { t } = useI18n();
const { formatBytes, formatClassification } = useFormatters();
const toast = useToastStore();

const storedDocuments = ref<DocumentResponseDTO[]>([]);
const decryptReq = ref(
  new DecryptDocumentRequestDTO({
    passphrase: DEMO_KEY_PASSPHRASE,
    aad_json: ""
  })
);

const isDecrypting = ref(false);
const uploadProgress = ref(0);
const tamperAlert = ref("");
const generalError = ref("");
const recipientMismatchNote = ref("");
const decryptionSuccess = ref(false);

function isRecipientCurrentUser(doc: DocumentResponseDTO) {
  return decryptionService.isRecipientUser(doc, authStore.user?.id);
}

const sortedStoredDocuments = computed(() =>
  decryptionService.sortDocumentsForUser(storedDocuments.value, authStore.user?.id)
);

function assignEncFile(file: File) {
  try {
    decryptionService.validateEncFile(file);
  } catch (err: any) {
    generalError.value = err.message;
    return;
  }
  decryptReq.value.document_id = null;
  decryptReq.value.enc_file = file;
  decryptReq.value.aad_json = "";
  recipientMismatchNote.value = "";
  tamperAlert.value = "";
  generalError.value = "";
  decryptionSuccess.value = false;

  if (file.name.endsWith(".enc")) {
    decryptReq.value.original_filename = file.name.slice(0, -4);
  }
}

function handlePemFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    decryptReq.value.private_key_pkcs8 = String(reader.result || "").trim();
    toast.show(`File kunci ${file.name} berhasil dimuat.`, "info");
  };
  reader.onerror = () => {
    toast.show(`Gagal membaca file kunci ${file.name}.`, "error");
  };
  reader.readAsText(file);
}

async function handleSelectStoredDocument() {
  if (!decryptReq.value.document_id) {
    recipientMismatchNote.value = "";
    return;
  }
  decryptReq.value.enc_file = null;
  tamperAlert.value = "";
  generalError.value = "";
  decryptionSuccess.value = false;
  try {
    const docDto = await documentService.getById(decryptReq.value.document_id);
    decryptReq.value.original_filename = docDto.original_filename;
    if (docDto.encryption_metadata?.aad_json) {
      decryptReq.value.aad_json = JSON.stringify(docDto.encryption_metadata.aad_json);
    }
    if (!isRecipientCurrentUser(docDto)) {
      const recipName = docDto.recipients?.[0]?.recipient_full_name || "pengguna lain";
      recipientMismatchNote.value = `Catatan: Dokumen ini ditujukan untuk '${recipName}'. Hanya kunci pribadi milik penerima tersebut yang dapat membuka isi dokumen ini.`;
    } else {
      recipientMismatchNote.value = "";
    }
  } catch {
    generalError.value = "Gagal memuat informasi dokumen.";
  }
}

async function simulateOneBitTamper() {
  if (!decryptReq.value.enc_file) return;
  decryptReq.value.enc_file = await decryptionService.simulateOneBitTamper(decryptReq.value.enc_file);
  generalError.value = "Simulasi aktif: isi file telah diubah 1-bit. Klik 'Buka Kunci & Unduh Dokumen Asli' untuk melihat sistem menolak file yang dimanipulasi.";
  toast.show("Simulasi perubahan isi file diaktifkan.", "warning");
}

async function executeDecryption() {
  tamperAlert.value = "";
  generalError.value = "";
  decryptionSuccess.value = false;
  uploadProgress.value = 15;
  isDecrypting.value = true;

  try {
    const { filename } = await cryptoService.decrypt(decryptReq.value, (percent) => {
      uploadProgress.value = percent;
    });
    decryptionSuccess.value = true;
    toast.show(`Dokumen ${filename} berhasil dibuka.`, "success");
  } catch (err: any) {
    if (err?.type === ErrorType.CRYPTO || err?.status === 422 || err?.errorCode === "TAMPER_DETECTED") {
      tamperAlert.value = err.message || "Isi dokumen tidak asli atau telah dimodifikasi.";
      toast.show("Peringatan: File terdeteksi telah diubah atau rusak!", "error");
      return;
    }
    generalError.value = extractApiError(err, "Gagal membuka dokumen.");
  } finally {
    isDecrypting.value = false;
    uploadProgress.value = 0;
  }
}

onMounted(async () => {
  try {
    const docListDto = await documentService.list(new DocumentFilterRequestDTO({ per_page: 100 }));
    storedDocuments.value = docListDto.items;
    const queryDocId = Number(route.query.document_id);
    if (queryDocId) {
      decryptReq.value.document_id = queryDocId;
      await handleSelectStoredDocument();
    }
  } catch (err) {
    generalError.value = extractApiError(err, "Gagal memuat daftar dokumen.");
  }
});
</script>
