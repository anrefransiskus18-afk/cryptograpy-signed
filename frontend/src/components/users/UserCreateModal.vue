<template>
  <BaseModal
    :open="open"
    title="Tambah Karyawan / Pengguna Baru"
    maxWidth="max-w-lg"
    @close="$emit('close')"
  >
    <form @submit.prevent="$emit('submit')" class="space-y-3 text-xs">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BaseInput
          v-model="model.username"
          label="Username Login"
          placeholder="staf.keuangan"
          required
        />
        <BaseInput
          v-model="model.nik"
          label="Nomor Induk Karyawan (NIK)"
          placeholder="Contoh: XYZ-OPS-005"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BaseInput
          v-model="model.full_name"
          label="Nama Lengkap"
          placeholder="Nama lengkap karyawan"
          required
        />
        <BaseInput
          v-model="model.email"
          type="email"
          label="Email Kantor"
          placeholder="nama@pt-xyz.co.id"
          required
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BaseInput
          v-model="model.department"
          label="Unit / Departemen"
          required
        />
        <BaseSelect
          v-model="model.role"
          label="Peran & Tingkat Akses"
          :options="roleOptions"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PasswordInput
          v-model="model.password"
          label="Kata Sandi Login"
          placeholder="Minimal 8 karakter"
          required
        />
        <PasswordInput
          v-model="model.key_passphrase"
          label="Kata Sandi Kunci Keamanan"
          placeholder="Minimal 8 karakter"
          required
        />
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <BaseButton variant="secondary" @click="$emit('close')">
          Batal
        </BaseButton>
        <BaseButton type="submit" :loading="submitting">
          {{ submitting ? "Menyimpan..." : "Simpan Pengguna" }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import type { CreateUserRequestDTO } from "../../dto";
import BaseModal from "../BaseModal.vue";
import BaseInput from "../BaseInput.vue";
import BaseSelect, { type SelectOption } from "../BaseSelect.vue";
import BaseButton from "../BaseButton.vue";
import PasswordInput from "../PasswordInput.vue";

export interface UserCreateModalProps {
  open: boolean;
  model: CreateUserRequestDTO;
  roleOptions: SelectOption[];
  submitting?: boolean;
}

withDefaults(defineProps<UserCreateModalProps>(), {
  submitting: false
});

defineEmits<{
  (e: "close"): void;
  (e: "submit"): void;
}>();
</script>
