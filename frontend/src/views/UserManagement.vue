<template>
  <div class="p-6 max-w-[1360px] mx-auto space-y-5">
    <!-- Header Halaman -->
    <PageHeader
      :title="t('users.title')"
      :subtitle="t('users.subtitle')"
    >
      <template #actions>
        <button
          type="button"
          :disabled="isLoading"
          @click="loadUsers"
          class="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
        >
          {{ isLoading ? t("common.loading") : t("common.reload") }}
        </button>
        <button
          v-if="authStore.isAdmin"
          type="button"
          @click="showCreateModal = true"
          class="h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white cursor-pointer"
        >
          {{ t("users.addUser") }}
        </button>
      </template>
    </PageHeader>

    <!-- Filter & Pencarian Pengguna -->
    <FilterToolbar
      v-model:search="filterReq.search"
      searchPlaceholder="Cari nama, username, atau email pengguna..."
      @update:search="debouncedLoadUsers"
    >
      <template #actions>
        <label
          v-if="authStore.isAdmin"
          class="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer"
        >
          <input
            type="checkbox"
            v-model="filterReq.include_deleted"
            @change="loadUsers"
            class="rounded border-slate-300"
          />
          <span>Tampilkan Akun yang Dicabut</span>
        </label>

        <BaseSelect
          v-model="filterReq.role"
          :options="ROLE_OPTIONS"
          placeholder="Semua Peran Pengguna"
          @update:modelValue="loadUsers"
          selectClass="font-medium text-slate-700"
        />
      </template>
    </FilterToolbar>

    <!-- Tabel Pengguna -->
    <DataTableCard
      :loading="isLoading"
      :empty="users.length === 0"
      loadingText="Sedang memuat daftar pengguna..."
      emptyText="Tidak ada data pengguna yang sesuai dengan pencarian."
    >
      <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold whitespace-nowrap">
              <th class="py-3 px-4">Nama Karyawan &amp; NIK</th>
              <th class="py-3 px-4">Unit / Departemen &amp; Email</th>
              <th class="py-3 px-4">Peran &amp; Tingkat Akses</th>
              <th class="py-3 px-4">ID Kunci Keamanan</th>
              <th class="py-3 px-4">Status Akun</th>
              <th v-if="authStore.isAdmin" class="py-3 px-4 text-right">Tindakan Admin</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="u in users" :key="u.id" class="hover:bg-slate-50">
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="font-semibold text-slate-900">{{ u.full_name }}</div>
                <div class="text-[11px] text-slate-400">@{{ u.username }} &bull; NIK: {{ u.nik }}</div>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="text-slate-800">{{ u.department }}</div>
                <div class="text-[11px] text-slate-400">{{ u.email }}</div>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                  {{ formatRole(u.role) }} (Level {{ u.clearance_level }})
                </span>
              </td>
              <td class="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                <div v-if="u.key_fingerprint" class="inline-flex items-center gap-1.5">
                  <span class="text-slate-600">{{ u.key_fingerprint.slice(0, 16) }}...</span>
                  <CopyButton :value="u.key_fingerprint" label="ID Kunci Keamanan" />
                </div>
                <span v-else class="text-amber-600">Belum Aktif</span>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <StatusBadge
                  v-if="u.deleted_at"
                  variant="neutral"
                  label="Dicabut"
                />
                <StatusBadge
                  v-else
                  :variant="u.is_active ? 'success' : 'danger'"
                  :label="u.is_active ? 'Aktif' : 'Nonaktif'"
                />
              </td>
              <td v-if="authStore.isAdmin" class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                <button
                  type="button"
                  @click="openEditModal(u)"
                  class="h-7 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer"
                >
                  Ubah Data
                </button>
                <button
                  v-if="u.id !== authStore.user?.id"
                  type="button"
                  @click="requestToggleActive(u)"
                  class="h-7 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer"
                >
                  {{ u.deleted_at ? "Pulihkan Akun" : (u.is_active ? "Nonaktifkan" : "Aktifkan") }}
                </button>
                <button
                  v-if="!u.deleted_at"
                  type="button"
                  @click="keyModalMode = 'rotate'; userToRotateKey = u"
                  class="h-7 px-2.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-medium cursor-pointer"
                >
                  Perbarui Kunci
                </button>
                <button
                  v-if="u.id !== authStore.user?.id && !u.deleted_at"
                  type="button"
                  @click="userToDelete = u"
                  class="h-7 px-2.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-medium cursor-pointer"
                >
                  Cabut Akses
                </button>
              </td>
            </tr>
          </tbody>
        </table>
    </DataTableCard>

    <!-- Modal Tambah Pengguna -->
    <UserCreateModal
      :open="showCreateModal"
      :model="newUserReq"
      :roleOptions="ROLE_OPTIONS"
      :submitting="isSubmitting"
      @close="showCreateModal = false"
      @submit="submitCreateUser"
    />

    <!-- Modal Ubah Data Pengguna -->
    <UserEditModal
      :user="editingUser"
      :model="editUserReq"
      :roleOptions="ROLE_OPTIONS"
      :submitting="isSubmitting"
      @close="editingUser = null"
      @submit="submitEditUser"
    />

    <!-- Modal Perbarui Kunci / Pulihkan Pengguna -->
    <BaseModal
      :open="Boolean(userToRotateKey)"
      :title="keyModalMode === 'restore' ? 'Pulihkan Akun & Buat Kunci Baru' : 'Perbarui Kunci Keamanan Pengguna'"
      maxWidth="max-w-md"
      @close="userToRotateKey = null"
    >
      <div v-if="userToRotateKey" class="space-y-4">
        <p class="text-xs text-slate-600 leading-relaxed">
          <template v-if="keyModalMode === 'restore'">
            Pulihkan akun <strong>{{ userToRotateKey.full_name }}</strong> dan buat pasangan kunci ECC NIST P-256 baru untuknya.
          </template>
          <template v-else>
            Buat pasangan kunci ECC NIST P-256 baru untuk <strong>{{ userToRotateKey.full_name }}</strong>. Kunci lama akan otomatis dinonaktifkan.
          </template>
        </p>

        <PasswordInput
          v-model="rotateKeyPassphrase"
          label="Kata Sandi Kunci Baru (Min. 8 Karakter)"
          placeholder="Minimal 8 karakter"
          required
        />
      </div>

      <template #footer>
        <button
          type="button"
          @click="userToRotateKey = null"
          class="h-8 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
        >
          Batal
        </button>
        <button
          type="button"
          :disabled="!rotateKeyPassphrase || rotateKeyPassphrase.length < 8"
          @click="executeRotateUserKey"
          class="h-8 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-xs font-semibold text-white cursor-pointer"
        >
          {{ keyModalMode === 'restore' ? 'Ya, Pulihkan Akun' : 'Ya, Perbarui Kunci' }}
        </button>
      </template>
    </BaseModal>

    <ConfirmModal
      :open="Boolean(userToDelete)"
      title="Cabut Akses & Nonaktifkan Permanen Pengguna"
      :message="`Apakah Anda yakin ingin mencabut akses pengguna '${userToDelete?.full_name}'? Akun akan dinonaktifkan dan seluruh kunci enkripsinya akan dicabut.`"
      confirmText="Ya, Cabut Akses"
      :danger="true"
      @cancel="userToDelete = null"
      @confirm="executeDeleteUser"
    />

    <ConfirmModal
      :open="Boolean(userToDeactivate)"
      title="Nonaktifkan Akun Pengguna"
      :message="`Nonaktifkan akun '${userToDeactivate?.full_name}'? Pengguna tidak akan bisa masuk dan tidak dapat menerima dokumen baru sampai diaktifkan kembali.`"
      confirmText="Ya, Nonaktifkan"
      :danger="true"
      @cancel="userToDeactivate = null"
      @confirm="confirmDeactivate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { userService } from "../services";
import {
  UserFilterRequestDTO,
  CreateUserRequestDTO,
  UpdateUserRequestDTO,
  UserResponseDTO,
  extractApiError
} from "../dto";
import { useAuthStore } from "../stores/auth";
import { useFormatters } from "../composables/useFormatters";
import { useI18n } from "../i18n";
import { useToastStore } from "../stores/toast";
import ConfirmModal from "../components/ConfirmModal.vue";
import PageHeader from "../components/PageHeader.vue";
import DataTableCard from "../components/DataTableCard.vue";
import CopyButton from "../components/CopyButton.vue";
import StatusBadge from "../components/StatusBadge.vue";
import BaseModal from "../components/BaseModal.vue";
import PasswordInput from "../components/PasswordInput.vue";
import FilterToolbar from "../components/FilterToolbar.vue";
import BaseSelect from "../components/BaseSelect.vue";
import UserCreateModal from "../components/users/UserCreateModal.vue";
import UserEditModal from "../components/users/UserEditModal.vue";
import { isCanceledError } from "../utils/validators";
import { DEMO_KEY_PASSPHRASE } from "../config/demo";

const authStore = useAuthStore();
const { formatRole, debounce } = useFormatters();
const { t } = useI18n();
const toast = useToastStore();

const ROLE_OPTIONS = [
  { value: "STAFF", label: "Staf (Level 1)" },
  { value: "AUTHORIZED_RECIPIENT", label: "Penerima Berwenang (Level 2)" },
  { value: "MANAGER", label: "Manajer (Level 2)" },
  { value: "EXECUTIVE", label: "Direksi / Eksekutif (Level 3)" },
  { value: "SECURITY_ADMIN", label: "Admin Keamanan (Level 4)" },
  { value: "ADMINISTRATOR", label: "Administrator TI (Level 4)" }
];

const users = ref<UserResponseDTO[]>([]);
const isLoading = ref(false);
const filterReq = ref(new UserFilterRequestDTO());
const showCreateModal = ref(false);
const newUserReq = ref(new CreateUserRequestDTO());
const editingUser = ref<UserResponseDTO | null>(null);
const editUserReq = ref(new UpdateUserRequestDTO());
const userToRotateKey = ref<UserResponseDTO | null>(null);
const keyModalMode = ref<"rotate" | "restore">("rotate");
const rotateKeyPassphrase = ref(DEMO_KEY_PASSPHRASE);
const userToDelete = ref<UserResponseDTO | null>(null);
const userToDeactivate = ref<UserResponseDTO | null>(null);
const isSubmitting = ref(false);

let listAbortController: AbortController | null = null;

async function loadUsers() {
  listAbortController?.abort();
  listAbortController = typeof AbortController !== "undefined" ? new AbortController() : null;
  const controller = listAbortController;
  isLoading.value = true;
  try {
    users.value = await userService.list(filterReq.value, {
      signal: controller?.signal
    });
  } catch (err: unknown) {
    if (isCanceledError(err)) return;
    toast.show("Gagal memuat daftar pengguna.", "error");
  } finally {
    if (listAbortController === controller) {
      isLoading.value = false;
    }
  }
}

const debouncedLoadUsers = debounce(() => {
  loadUsers();
}, 300);

function openEditModal(user: UserResponseDTO) {
  editingUser.value = user;
  editUserReq.value = new UpdateUserRequestDTO({
    full_name: user.full_name,
    email: user.email,
    department: user.department,
    nik: user.nik,
    role: user.role,
    password: ""
  });
}

async function submitEditUser() {
  if (!editingUser.value || isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const payload = new UpdateUserRequestDTO({
      full_name: editUserReq.value.full_name,
      email: editUserReq.value.email,
      department: editUserReq.value.department,
      nik: editUserReq.value.nik,
      role: editUserReq.value.role,
      password: editUserReq.value.password || undefined
    });
    const res = await userService.update(editingUser.value.id, payload);
    toast.show(res.message || "Data pengguna berhasil diperbarui.", "success");
    editingUser.value = null;
    await loadUsers();
  } catch (err) {
    toast.show(extractApiError(err, "Gagal memperbarui data pengguna."), "error");
  } finally {
    isSubmitting.value = false;
  }
}

async function submitCreateUser() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const res = await userService.create(newUserReq.value);
    toast.show(res.message || `Pengguna ${newUserReq.value.username} berhasil dibuat.`, "success");
    showCreateModal.value = false;
    newUserReq.value = new CreateUserRequestDTO();
    await loadUsers();
  } catch (err) {
    toast.show(extractApiError(err, "Gagal menambahkan pengguna."), "error");
  } finally {
    isSubmitting.value = false;
  }
}

function requestToggleActive(user: UserResponseDTO) {
  // Menonaktifkan akun aktif butuh konfirmasi; memulihkan akun terhapus butuh passphrase kunci baru
  if (user.is_active && !user.deleted_at) {
    userToDeactivate.value = user;
  } else if (user.deleted_at) {
    keyModalMode.value = "restore";
    userToRotateKey.value = user;
  } else {
    toggleActive(user);
  }
}

async function confirmDeactivate() {
  const target = userToDeactivate.value;
  userToDeactivate.value = null;
  if (target) await toggleActive(target);
}

async function toggleActive(user: UserResponseDTO) {
  try {
    await userService.toggleActive(user);
    toast.show(`Status akun ${user.username} diperbarui.`, "success");
    await loadUsers();
  } catch (err) {
    toast.show(extractApiError(err, "Gagal memperbarui status."), "error");
  }
}

async function executeRotateUserKey() {
  if (!userToRotateKey.value) return;
  const targetUser = userToRotateKey.value;
  const passphraseToUse = rotateKeyPassphrase.value;
  const mode = keyModalMode.value;
  userToRotateKey.value = null;
  keyModalMode.value = "rotate";
  try {
    await userService.rotateOrRestoreKey(targetUser.id, passphraseToUse, mode);
    toast.show(
      mode === "restore"
        ? `Akun ${targetUser.username} berhasil dipulihkan.`
        : `Kunci keamanan ${targetUser.username} berhasil diperbarui.`,
      "success"
    );
    await loadUsers();
  } catch (err) {
    toast.show(
      extractApiError(err, mode === "restore" ? "Gagal memulihkan akun." : "Gagal memperbarui kunci."),
      "error"
    );
  }
}

async function executeDeleteUser() {
  if (!userToDelete.value) return;
  const targetUser = userToDelete.value;
  userToDelete.value = null;
  try {
    const res = await userService.remove(targetUser.id);
    toast.show(res?.message || `Akses pengguna ${targetUser.username} berhasil dicabut.`, "success");
    await loadUsers();
  } catch (err) {
    toast.show(extractApiError(err, "Gagal mencabut akses pengguna."), "error");
  }
}

onMounted(() => {
  loadUsers();
});

onUnmounted(() => {
  listAbortController?.abort();
  debouncedLoadUsers.cancel?.();
});
</script>
