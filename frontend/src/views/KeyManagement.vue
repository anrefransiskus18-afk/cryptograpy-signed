<template>
  <div class="p-6 max-w-[1360px] mx-auto space-y-6">
    <PageHeader
      :title="t('keys.title')"
      :subtitle="t('keys.subtitle')"
    />

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Kiri: Kunci Saya & Operasi Kunci -->
      <div class="lg:col-span-5 space-y-5">
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900">Status Kunci Digital Saya</h3>
            <StatusBadge
              :variant="myKey.fingerprint ? 'success' : 'warning'"
              :label="myKey.fingerprint ? 'Siap Digunakan' : 'Belum Aktif'"
            />
          </div>

          <div v-if="myKey.fingerprint" class="space-y-3 text-xs">
            <MonoCopyBox
              label="ID Kunci Digital (Sidik Jari Kunci)"
              :value="myKey.fingerprint"
              copyLabel="ID Kunci Digital"
              copyText="Salin ID Kunci"
            />

            <div class="flex flex-wrap gap-2">
              <button
                v-if="myKey.public_key_pem"
                type="button"
                @click="downloadPublicKey"
                class="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs cursor-pointer"
              >
                Unduh Kunci Publik (.pem)
              </button>
              <button
                v-if="localPrivateKeyPem"
                type="button"
                @click="downloadPrivateKey"
                class="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs cursor-pointer"
              >
                Unduh Cadangan Kunci Pribadi (.pem)
              </button>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-200 space-y-3">
            <PasswordInput
              v-model="keyReq.passphrase"
              label="Kata Sandi Kunci Pribadi (Passphrase)"
              placeholder="Masukkan kata sandi kunci (min. 8 karakter)"
            />

            <AlertBanner v-if="statusMsg" variant="success" :message="statusMsg" />
            <AlertBanner v-if="errorMsg" variant="error" :message="errorMsg" />

            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                :disabled="loading"
                @click="handleKeyAction"
                class="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-semibold text-xs cursor-pointer"
              >
                {{ myKey.has_active_key ? "Perbarui Kunci Baru" : "Buat Kunci Keamanan" }}
              </button>
              <button
                type="button"
                :disabled="loading || !myKey.has_active_key"
                @click="verifyKeyOwnership"
                class="h-9 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-semibold text-xs cursor-pointer"
              >
                Cek Kecocokan Kunci
              </button>
            </div>
          </div>
        </div>

        <!-- Riwayat Kunci Saya -->
        <div
          v-if="myKey.key_history && myKey.key_history.length > 0"
          class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div class="px-5 py-3.5 border-b border-slate-200">
            <h3 class="text-xs font-bold text-slate-900">Riwayat Pergantian Kunci Saya</h3>
          </div>
          <div class="divide-y divide-slate-100 text-xs">
            <div
              v-for="hk in myKey.key_history.slice(0, 5)"
              :key="hk.id"
              class="px-5 py-2.5 flex items-center justify-between gap-2"
            >
              <div class="min-w-0">
                <div class="font-mono text-[11px] text-slate-700 truncate">
                  {{ (hk.fingerprint || "—").slice(0, 24) }}...
                </div>
                <div class="text-[11px] text-slate-400">
                  Dibuat: {{ formatTime(hk.created_at) }}
                </div>
              </div>
              <span
                class="px-2 py-0.5 rounded text-[10px] font-semibold shrink-0"
                :class="hk.is_revoked
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-emerald-50 text-emerald-700'"
              >
                {{ hk.is_revoked ? "Diganti / Nonaktif" : "Kunci Aktif" }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Kanan: Direktori Kunci Publik -->
      <PublicKeyDirectoryTable
        v-model:search="recipientSearch"
        :keys="filteredDirectoryKeys"
        :loading="isLoading"
      />
    </div>

    <ConfirmModal
      :open="showConfirmRotate"
      title="Perbarui Kunci Keamanan Saya"
      message="Memperbarui kunci akan menonaktifkan kunci keamanan lama Anda dan membuat pasangan kunci baru. Apakah Anda yakin ingin melanjutkan?"
      confirmText="Ya, Perbarui Kunci"
      :danger="false"
      @cancel="showConfirmRotate = false"
      @confirm="executeKeyRotation"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { keyService } from "../services";
import {
  KeyPassphraseRequestDTO,
  VerifyKeyRequestDTO,
  MyKeyStatusResponseDTO,
  PublicKeyDirectoryItemDTO,
  extractApiError
} from "../dto";
import { useFormatters } from "../composables/useFormatters";
import { useI18n } from "../i18n";
import { useToastStore } from "../stores/toast";
import ConfirmModal from "../components/ConfirmModal.vue";
import PageHeader from "../components/PageHeader.vue";
import StatusBadge from "../components/StatusBadge.vue";
import MonoCopyBox from "../components/MonoCopyBox.vue";
import PasswordInput from "../components/PasswordInput.vue";
import AlertBanner from "../components/AlertBanner.vue";
import PublicKeyDirectoryTable from "../components/keys/PublicKeyDirectoryTable.vue";
import { DEMO_KEY_PASSPHRASE } from "../config/demo";

const emit = defineEmits<{
  (e: "auth-updated"): void;
}>();
const { formatTime } = useFormatters();
const { t } = useI18n();
const toast = useToastStore();

const keyReq = ref(new KeyPassphraseRequestDTO({ passphrase: DEMO_KEY_PASSPHRASE }));
const myKey = ref(new MyKeyStatusResponseDTO());
const localPrivateKeyPem = ref("");
const directoryKeys = ref<PublicKeyDirectoryItemDTO[]>([]);
const recipientSearch = ref("");
const isLoading = ref(false);
const loading = ref(false);
const showConfirmRotate = ref(false);
const statusMsg = ref("");
const errorMsg = ref("");

const filteredDirectoryKeys = computed(() => {
  const q = recipientSearch.value.trim().toLowerCase();
  if (!q) return directoryKeys.value;
  return directoryKeys.value.filter(
    (k) =>
      k.full_name.toLowerCase().includes(q) ||
      k.username.toLowerCase().includes(q) ||
      k.department.toLowerCase().includes(q)
  );
});

async function loadKeyData() {
  isLoading.value = true;
  try {
    const data = await keyService.loadKeyPageData();
    myKey.value = data.myKey;
    directoryKeys.value = data.directoryKeys;
    localPrivateKeyPem.value = data.localPrivateKeyPem;
  } catch (err) {
    toast.show(extractApiError(err, "Gagal memuat data kunci keamanan."), "error");
  } finally {
    isLoading.value = false;
  }
}

function handleKeyAction() {
  statusMsg.value = "";
  errorMsg.value = "";
  try {
    keyService.validatePassphrase(keyReq.value.passphrase);
  } catch (err: unknown) {
    errorMsg.value = extractApiError(err, "Kata sandi kunci keamanan tidak valid.");
    return;
  }
  if (myKey.value.has_active_key) {
    showConfirmRotate.value = true;
  } else {
    generateKeypair(false);
  }
}

async function executeKeyRotation() {
  showConfirmRotate.value = false;
  await generateKeypair(true);
}

async function generateKeypair(isRotation = true) {
  statusMsg.value = "";
  errorMsg.value = "";
  loading.value = true;
  try {
    const resDto = await keyService.generateOrRotateKey(keyReq.value, isRotation);
    localPrivateKeyPem.value = resDto.private_key_pkcs8_pem;

    statusMsg.value = isRotation
      ? "Kunci keamanan Anda berhasil diperbarui."
      : "Pasangan kunci keamanan baru berhasil dibuat.";
    toast.show(statusMsg.value, "success");
    emit("auth-updated");
    await loadKeyData();
  } catch (err) {
    errorMsg.value = extractApiError(err, "Gagal memperbarui kunci keamanan.");
  } finally {
    loading.value = false;
  }
}

async function verifyKeyOwnership() {
  statusMsg.value = "";
  errorMsg.value = "";
  loading.value = true;
  try {
    const verifyDto = new VerifyKeyRequestDTO({
      private_key_pkcs8: localPrivateKeyPem.value,
      passphrase: keyReq.value.passphrase
    });
    const resDto = await keyService.verifyOwnership(verifyDto);
    if (resDto.is_valid) {
      statusMsg.value = "Kata sandi benar! Kunci pribadi cocok dengan kunci publik Anda.";
      toast.show("Kunci keamanan berhasil diverifikasi.", "success");
    } else {
      errorMsg.value = "Kunci pribadi tidak cocok dengan kunci aktif Anda.";
    }
  } catch (err) {
    errorMsg.value = extractApiError(err, "Kata sandi kunci salah atau tidak sesuai.");
  } finally {
    loading.value = false;
  }
}

function downloadPrivateKey() {
  keyService.downloadPrivateKey(localPrivateKeyPem.value, myKey.value.fingerprint);
}

function downloadPublicKey() {
  keyService.downloadPublicKey(myKey.value.public_key_pem, myKey.value.fingerprint);
}

onMounted(() => {
  loadKeyData();
});
</script>
