<template>
  <div class="h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 flex flex-col">
    <!-- Halaman Login -->
    <div v-if="isLoginPage" class="h-full w-full overflow-y-auto">
      <router-view @auth-updated="refreshUserState" />
    </div>

    <!-- Layout Aplikasi Utama -->
    <div v-else class="flex h-full w-full overflow-hidden relative">
      <!-- Backdrop Mobile Drawer -->
      <div
        v-if="mobileMenuOpen"
        @click="mobileMenuOpen = false"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden"
      ></div>

      <!-- Sidebar Navigasi (Responsif Mobile Drawer & Desktop Toggle) -->
      <aside
        class="h-full bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none transition-all duration-200 z-40 fixed lg:static inset-y-0 left-0"
        :class="[
          mobileMenuOpen ? 'translate-x-0 w-60' : '-translate-x-full lg:translate-x-0',
          sidebarExpanded ? 'lg:w-60' : 'lg:w-0 lg:overflow-hidden lg:border-r-0'
        ]"
      >
        <!-- Brand -->
        <div class="h-14 px-5 border-b border-slate-800 flex items-center justify-between gap-2.5 shrink-0">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <span class="text-sm font-bold text-white tracking-tight truncate">PT XYZ DocShield</span>
          </div>

          <button
            type="button"
            @click="mobileMenuOpen = false"
            class="lg:hidden text-slate-400 hover:text-white p-1 cursor-pointer"
            aria-label="Tutup menu"
          >
            &times;
          </button>
        </div>

        <!-- Menu Navigasi -->
        <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="h-9 px-3 rounded-lg flex items-center gap-3 text-xs font-medium transition-colors"
            :class="$route.path === item.to
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.iconPath" />
            </svg>
            <span class="truncate">{{ item.label }}</span>
          </router-link>
        </nav>

        <!-- Profil & Tombol Keluar -->
        <div class="p-3 border-t border-slate-800 space-y-2 shrink-0">
          <router-link
            v-if="currentUser"
            to="/profile"
            class="px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
          >
            <div class="h-7 w-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {{ userInitials }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-semibold text-white truncate">{{ currentUser.full_name }}</div>
              <div class="text-[11px] text-slate-400 truncate">{{ formatRole(currentUser.role) }}</div>
            </div>
          </router-link>

          <button
            type="button"
            @click="handleLogout"
            class="h-9 w-full px-3 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <span>{{ t("app.logout") }}</span>
          </button>
        </div>
      </aside>

      <!-- Area Konten Utama -->
      <div class="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <!-- Header Bar Sederhana -->
        <header class="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <button
              type="button"
              @click="toggleSidebar"
              class="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
              title="Buka / Sembunyikan Menu Samping"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div class="min-w-0">
              <h1 class="text-sm font-bold text-slate-900 truncate">{{ currentPageTitle }}</h1>
              <AppBreadcrumbs />
            </div>
          </div>

          <div v-if="currentUser" class="flex items-center gap-3 text-xs text-slate-600 shrink-0">
            <button
              type="button"
              @click="toggleTheme"
              class="h-7 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
              :title="isDark ? 'Light Mode' : 'Dark Mode'"
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
            <span class="hidden sm:inline">{{ currentUser.department }}</span>
            <span class="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
              {{ formatRole(currentUser.role) }}
            </span>
          </div>
        </header>

        <!-- Konten Halaman -->
        <main class="flex-1 overflow-y-auto">
          <router-view @auth-updated="refreshUserState" />
        </main>
      </div>
    </div>

    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { authService } from "./services";
import { useFormatters } from "./composables/useFormatters";
import { useI18n } from "./i18n";
import { useTheme } from "./composables/useTheme";
import AppBreadcrumbs from "./components/AppBreadcrumbs.vue";
import ToastContainer from "./components/ToastContainer.vue";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { formatRole } = useFormatters();
const { locale, setLocale, t } = useI18n();
const { isDark, toggleTheme } = useTheme();

const currentUser = computed(() => authStore.user);
const sidebarExpanded = ref(true);
const mobileMenuOpen = ref(false);

const isLoginPage = computed(() => route.path === "/login" || !authStore.isAuthenticated);

const userInitials = computed(() => {
  const name = currentUser.value?.full_name || currentUser.value?.username || "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
});

const navItems = computed(() => [
  {
    to: "/",
    label: t("nav.dashboard"),
    iconPath: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
  },
  {
    to: "/documents",
    label: t("nav.documents"),
    iconPath: "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
  },
  {
    to: "/encrypt",
    label: t("nav.encrypt"),
    iconPath: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
  },
  {
    to: "/decrypt",
    label: t("nav.decrypt"),
    iconPath: "M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
  },
  {
    to: "/keys",
    label: t("nav.keys"),
    iconPath: "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
  },
  {
    to: "/users",
    label: authStore.isAdmin ? t("nav.usersAdmin") : t("nav.usersDirectory"),
    iconPath: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
  },
  {
    to: "/audit-logs",
    label: t("nav.auditLogs"),
    iconPath: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
  },
  {
    to: "/settings",
    label: t("nav.settings"),
    iconPath: "M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
  },
  {
    to: "/profile",
    label: t("nav.profile"),
    iconPath: "M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
  }
]);

const currentPageTitle = computed(() => {
  const found = navItems.value.find((item) => item.to === route.path);
  return found ? found.label : t("nav.dashboard");
});

function toggleSidebar() {
  if (window.innerWidth < 1024) {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  } else {
    sidebarExpanded.value = !sidebarExpanded.value;
  }
}

function refreshUserState() {
  authStore.syncFromStorage();
}

async function handleLogout() {
  await authService.logout();
  refreshUserState();
  router.push("/login");
}

watch(() => route.path, () => {
  mobileMenuOpen.value = false;
  refreshUserState();
});

onMounted(() => {
  refreshUserState();
});
</script>
