<template>
  <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
    <router-link to="/" class="hover:text-indigo-600 font-medium truncate">
      {{ t("nav.dashboard") }}
    </router-link>
    <template v-if="currentLabel && route.path !== '/'">
      <span class="text-slate-400">/</span>
      <span class="font-semibold text-slate-800 truncate">{{ currentLabel }}</span>
    </template>
  </nav>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "../i18n";

const route = useRoute();
const { t } = useI18n();

const currentLabel = computed(() => {
  if (route.meta?.titleKey) {
    return t(route.meta.titleKey);
  }
  return route.meta?.title || "";
});
</script>
