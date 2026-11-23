<template>
  <BaseModal
    :open="Boolean(log)"
    :title="`Rincian Catatan & Bukti Keaslian (#${log?.id})`"
    :subtitle="log ? `${formatAction(log.action_type)} • ${formatTime(log.timestamp)}` : ''"
    maxWidth="max-w-xl"
    @close="$emit('close')"
  >
    <div v-if="log" class="space-y-2.5 text-xs">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div class="text-slate-400">Pelaku &amp; Alamat IP</div>
          <div class="font-semibold text-slate-900 mt-0.5">{{ log.actor_identity }} ({{ log.ip_address }})</div>
        </div>
        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div class="text-slate-400">Status Verifikasi ECDSA P-256</div>
          <div class="font-semibold mt-0.5" :class="log.signature_verified ? 'text-emerald-700' : 'text-rose-700'">
            {{ log.signature_verified ? "Valid & Tidak Dimanipulasi" : "Tidak Valid" }}
          </div>
        </div>
      </div>

      <MonoCopyBox
        label="Hash Rantai Sebelumnya (SHA-256 Hash Chain)"
        :value="log.prev_log_hash || ''"
        :copyable="false"
      />

      <MonoCopyBox
        label="Tanda Tangan Digital Server (ECDSA P-256)"
        :value="log.server_signature || ''"
        copyLabel="Tanda tangan ECDSA"
      />

      <div v-if="log.metadata && Object.keys(log.metadata).length" class="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
        <div class="text-slate-400">Rincian Tambahan (Metadata)</div>
        <pre class="font-mono text-[11px] text-slate-700 whitespace-pre-wrap break-all">{{ JSON.stringify(log.metadata, null, 2) }}</pre>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" size="sm" @click="$emit('close')">
        Tutup
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import type { AuditLogItemDTO } from "../../dto";
import { useFormatters } from "../../composables/useFormatters";
import BaseModal from "../BaseModal.vue";
import MonoCopyBox from "../MonoCopyBox.vue";
import BaseButton from "../BaseButton.vue";

export interface AuditDetailModalProps {
  log: AuditLogItemDTO | null;
}

defineProps<AuditDetailModalProps>();

defineEmits<{
  (e: "close"): void;
}>();

const { formatAction, formatTime } = useFormatters();
</script>
