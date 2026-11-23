<template>
  <BaseModal
    :open="Boolean(user)"
    title="Ubah Data Pengguna"
    :subtitle="user ? `@${user.username}` : ''"
    maxWidth="max-w-lg"
    @close="$emit('close')"
  >
    <form @submit.prevent="$emit('submit')" class="space-y-3 text-xs">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BaseInput
          v-model="model.full_name"
          label="Nama Lengkap"
          required
        />
        <BaseInput
          v-model="model.nik"
          label="Nomor Induk Karyawan (NIK)"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BaseInput
          v-model="model.email"
          type="email"
          label="Email Kantor"
          required
        />
        <BaseInput
          v-model="model.department"
          label="Unit / Departemen"
          required
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BaseSelect
          v-model="model.role"
          label="Peran & Tingkat Akses"
          :options="roleOptions"
        />
        <PasswordInput
          v-model="model.password"
          label="Reset Sandi Login (Opsional)"
          placeholder="Kosongkan jika tidak diubah"
        />
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <BaseButton variant="secondary" @click="$emit('close')">
          Batal
        </BaseButton>
        <BaseButton type="submit" :loading="submitting">
          {{ submitting ? "Menyimpan..." : "Simpan Perubahan" }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import type { UpdateUserRequestDTO, UserResponseDTO } from "../../dto";
import BaseModal from "../BaseModal.vue";
import BaseInput from "../BaseInput.vue";
import BaseSelect, { type SelectOption } from "../BaseSelect.vue";
import BaseButton from "../BaseButton.vue";
import PasswordInput from "../PasswordInput.vue";

export interface UserEditModalProps {
  user: UserResponseDTO | null;
  model: UpdateUserRequestDTO;
  roleOptions: SelectOption[];
  submitting?: boolean;
}

withDefaults(defineProps<UserEditModalProps>(), {
  submitting: false
});

defineEmits<{
  (e: "close"): void;
  (e: "submit"): void;
}>();
</script>
