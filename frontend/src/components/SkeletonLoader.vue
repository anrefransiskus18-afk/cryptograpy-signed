<template>
  <div class="animate-pulse space-y-3" role="status" aria-busy="true">
    <div
      v-for="row in rows"
      :key="row"
      class="h-4 rounded bg-slate-200 dark:bg-slate-700"
      :style="{ width: row === rows ? '65%' : '100%' }"
    ></div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  rows: {
    type: Number,
    default: 4
  }
});
</script>
