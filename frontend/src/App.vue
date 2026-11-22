<template>
  <div class="h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 flex flex-col">
    <!-- Halaman Login -->
    <div v-if="isLoginPage" class="h-full w-full overflow-y-auto">
      <router-view @auth-updated="refreshUserState" />
    </div>

    <!-- Layout Aplikasi Utama -->
    <MainLayout v-else>
      <router-view @auth-updated="refreshUserState" />
    </MainLayout>

    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "./stores/auth";
import MainLayout from "./layouts/MainLayout.vue";
import ToastContainer from "./components/ToastContainer.vue";

const route = useRoute();
const authStore = useAuthStore();

const isLoginPage = computed(() => route.path === "/login" || !authStore.isAuthenticated);

function refreshUserState() {
  authStore.syncFromStorage();
}

onMounted(() => {
  refreshUserState();
});
</script>
