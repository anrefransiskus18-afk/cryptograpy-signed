<template>
  <div class="min-h-screen bg-slate-100 flex items-center justify-center p-4">
    <BaseCard padding="lg" class="max-w-md w-full">
      <div class="space-y-6">
      <!-- Brand & Judul -->
      <div class="flex items-center justify-between gap-2">
        <button
          type="button"
          @click="toggleTheme"
          class="h-7 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
        >
          {{ isDark ? "☀ Light" : "🌙 Dark" }}
        </button>
        <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            @click="setLocale('id')"
            class="px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            :class="locale === 'id' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'"
          >
            ID
          </button>
          <button
            type="button"
            @click="setLocale('en')"
            class="px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            :class="locale === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'"
          >
            EN
          </button>
        </div>
      </div>

      <div class="text-center space-y-1.5">
        <div class="h-10 w-10 rounded-xl bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-sm">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 class="text-lg font-bold text-slate-900">{{ t("app.brand") }}</h1>
        <p class="text-xs text-slate-500">
          {{ t("app.portalSubtitle") }}
        </p>
      </div>

      <!-- Form Login -->
      <form @submit.prevent="submitLogin" class="space-y-4">
        <BaseInput
          v-model="loginForm.username"
          :label="t('login.usernameLabel')"
          :placeholder="t('login.usernamePlaceholder')"
          inputClass="h-10 bg-slate-50 focus:bg-white px-3.5"
          required
        />

        <PasswordInput
          v-model="loginForm.password"
          :label="t('login.passwordLabel')"
          :placeholder="t('login.passwordPlaceholder')"
          inputClass="h-10 bg-slate-50 focus:bg-white"
          required
        />

        <AlertBanner v-if="errorMsg" variant="error" :message="errorMsg" />

        <BaseButton type="submit" :loading="loading" block class="h-10">
          {{ loading ? t("login.submitting") : t("login.submit") }}
        </BaseButton>
      </form>

      <!-- Akun Demo (dapat dimatikan lewat VITE_SHOW_DEMO_ACCOUNTS=false) -->
      <div v-if="showDemoAccounts" class="pt-4 border-t border-slate-200 space-y-2.5">
        <div class="flex items-center justify-between text-xs text-slate-500">
          <span>{{ t("login.demoTitle") }}</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="acc in demoAccounts"
            :key="acc.username"
            type="button"
            @click="fillAccount(acc.username)"
            class="text-left p-2.5 rounded-lg border text-xs transition-colors cursor-pointer"
            :class="loginForm.username === acc.username
              ? 'bg-indigo-50 border-indigo-400 text-indigo-900'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'"
          >
            <div class="font-semibold truncate">{{ acc.label }}</div>
            <div class="text-[11px] text-slate-500 truncate">@{{ acc.username }}</div>
          </button>
        </div>
      </div>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { authService } from "../services";
import { useToastStore } from "../stores/toast";
import { LoginRequestDTO, extractApiError } from "../dto";
import { DEMO_MODE, DEMO_PASSWORD } from "../config/demo";
import { useI18n } from "../i18n";
import { useTheme } from "../composables/useTheme";
import PasswordInput from "../components/PasswordInput.vue";
import AlertBanner from "../components/AlertBanner.vue";
import BaseCard from "../components/BaseCard.vue";
import BaseInput from "../components/BaseInput.vue";
import BaseButton from "../components/BaseButton.vue";

const emit = defineEmits<{
  (e: "auth-updated"): void;
}>();
const router = useRouter();
const toast = useToastStore();
const { locale, setLocale, t } = useI18n();
const { isDark, toggleTheme } = useTheme();

// Untuk produksi: set VITE_SHOW_DEMO_ACCOUNTS=false agar kredensial demo tidak terisi/ditampilkan
const showDemoAccounts = DEMO_MODE;

const loginForm = ref(
  new LoginRequestDTO({
    username: showDemoAccounts ? "admin.security" : "",
    password: showDemoAccounts ? DEMO_PASSWORD : ""
  })
);
const loading = ref(false);
const errorMsg = ref("");

const demoAccounts = [
  { username: "admin.security", label: "Admin Keamanan" },
  { username: "direktur.keuangan", label: "Direktur Keuangan" },
  { username: "manajer.riset", label: "Manajer Riset" },
  { username: "staf.operasional", label: "Staf Operasional" },
  { username: "penerima.sah", label: "Penerima Berwenang" }
];

function fillAccount(user: string) {
  loginForm.value = new LoginRequestDTO({
    username: user,
    password: DEMO_PASSWORD
  });
  errorMsg.value = "";
}

async function submitLogin() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const resDto = await authService.login(loginForm.value.username, loginForm.value.password);
    toast.show(t("login.welcomeToast", { name: resDto.user.full_name }), "success");
    emit("auth-updated");
    router.push("/");
  } catch (err) {
    errorMsg.value = extractApiError(err, t("login.loginError"));
  } finally {
    loading.value = false;
  }
}
</script>
