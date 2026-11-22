<template>
  <div class="p-6 max-w-4xl mx-auto space-y-5">
    <PageHeader
      :title="t('profile.title')"
      :subtitle="t('profile.subtitle')"
    />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <!-- Informasi Akun & Ubah Profil -->
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900">Identitas Akun Saya</h3>
          <button
            v-if="profile && !editingProfile"
            type="button"
            @click="startEditProfile"
            class="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            Ubah Profil
          </button>
        </div>

        <form v-if="editingProfile" @submit.prevent="saveProfile" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              v-model="profileForm.full_name"
              required
              class="w-full h-9 bg-slate-50 border border-slate-300 rounded-lg px-3.5 text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Email Kantor</label>
            <input
              v-model="profileForm.email"
              type="email"
              required
              class="w-full h-9 bg-slate-50 border border-slate-300 rounded-lg px-3.5 text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Unit / Departemen</label>
            <input
              v-model="profileForm.department"
              required
              class="w-full h-9 bg-slate-50 border border-slate-300 rounded-lg px-3.5 text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="editingProfile = false"
              class="h-8 px-3.5 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingProfile"
              class="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
            >
              {{ savingProfile ? "Menyimpan..." : "Simpan Profil" }}
            </button>
          </div>
        </form>

        <div v-else-if="profile" class="space-y-2.5 text-xs">
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Nama Lengkap</span>
            <span class="font-semibold text-slate-900">{{ profile.full_name }}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Username / NIK</span>
            <span class="font-mono text-slate-800">@{{ profile.username }} ({{ profile.nik }})</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Email Kantor</span>
            <span class="text-slate-800">{{ profile.email }}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Unit / Departemen</span>
            <span class="text-slate-800">{{ profile.department }}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Peran &amp; Tingkat Akses</span>
            <span class="font-semibold text-indigo-700">{{ formatRole(profile.role) }} (Level {{ profile.clearance_level }})</span>
          </div>
          <MonoCopyBox
            class="pt-1"
            label="ID Kunci Digital Aktif"
            :value="profile.active_key_fingerprint || ''"
            copyLabel="ID Kunci Digital"
            copyText="Salin ID Kunci"
            fallback="Belum Ada"
          />
        </div>
      </div>

      <!-- Ubah Password -->
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Ganti Kata Sandi Login</h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Gunakan minimal 8 karakter untuk menjaga keamanan akun Anda.
          </p>
        </div>

        <form @submit.prevent="changePassword" class="space-y-3.5 text-xs">
          <PasswordInput
            v-model="passwordReq.current_password"
            label="Kata Sandi Saat Ini"
            placeholder="Masukkan kata sandi lama"
            required
          />

          <PasswordInput
            v-model="passwordReq.new_password"
            label="Kata Sandi Baru (Minimal 8 Karakter)"
            placeholder="Masukkan kata sandi baru"
            required
          />

          <PasswordInput
            v-model="confirmNewPassword"
            label="Konfirmasi Kata Sandi Baru"
            placeholder="Ketik ulang kata sandi baru"
            required
          />

          <AlertBanner v-if="validationError" variant="error" :message="validationError" />

          <button
            type="submit"
            :disabled="saving"
            class="w-full h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
          >
            {{ saving ? "Menyimpan..." : "Simpan Kata Sandi Baru" }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { authService } from "../services";
import {
  ChangePasswordRequestDTO,
  UpdateProfileRequestDTO,
  UserProfileDTO,
  extractApiError
} from "../dto";
import { useFormatters } from "../composables/useFormatters";
import { useI18n } from "../i18n";
import { useToastStore } from "../stores/toast";
import PageHeader from "../components/PageHeader.vue";
import MonoCopyBox from "../components/MonoCopyBox.vue";
import PasswordInput from "../components/PasswordInput.vue";
import AlertBanner from "../components/AlertBanner.vue";

const emit = defineEmits<{
  (e: "auth-updated"): void;
}>();
const router = useRouter();
const { formatRole } = useFormatters();
const { t } = useI18n();
const toast = useToastStore();

const profile = ref<UserProfileDTO | null>(null);
const editingProfile = ref(false);
const savingProfile = ref(false);
const profileForm = ref(new UpdateProfileRequestDTO());
const passwordReq = ref(new ChangePasswordRequestDTO());
const confirmNewPassword = ref("");
const validationError = ref("");
const saving = ref(false);

function startEditProfile() {
  if (!profile.value) return;
  profileForm.value = new UpdateProfileRequestDTO({
    full_name: profile.value.full_name,
    email: profile.value.email,
    department: profile.value.department
  });
  editingProfile.value = true;
}

async function saveProfile() {
  savingProfile.value = true;
  try {
    const updated = await authService.updateProfile(profileForm.value);
    profile.value = updated;
    emit("auth-updated");
    editingProfile.value = false;
    toast.show("Identitas profil berhasil diperbarui.", "success");
  } catch (err) {
    toast.show(extractApiError(err, "Gagal memperbarui profil."), "error");
  } finally {
    savingProfile.value = false;
  }
}

async function loadProfile() {
  try {
    profile.value = await authService.fetchProfile();
  } catch {
    toast.show("Gagal memuat profil pengguna.", "error");
  }
}

async function changePassword() {
  validationError.value = "";
  saving.value = true;
  try {
    const res = await authService.changePassword(passwordReq.value, confirmNewPassword.value);
    passwordReq.value = new ChangePasswordRequestDTO();
    confirmNewPassword.value = "";
    if (res?.relogin_required) {
      toast.show("Kata sandi berhasil diperbarui. Silakan masuk kembali dengan kata sandi baru.", "success");
      router.push("/login");
      return;
    }
    toast.show("Kata sandi berhasil diperbarui.", "success");
  } catch (err) {
    validationError.value = extractApiError(err, "Gagal mengubah kata sandi.");
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadProfile();
});
</script>
