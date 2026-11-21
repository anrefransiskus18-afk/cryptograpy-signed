import { ref, onUnmounted } from "vue";
import { normalizeApiError } from "../utils/errors";

/**
 * Composable standar untuk orkestrasi operasi async dengan proteksi duplikasi,
 * AbortController cleanup saat unmount, dan normalisasi error.
 */
export function useAsync(asyncFn, { immediate = false } = {}) {
  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);
  let activeController = null;

  function cancel() {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  }

  async function execute(...args) {
    cancel();
    activeController = typeof AbortController !== "undefined" ? new AbortController() : null;
    loading.value = true;
    error.value = null;
    try {
      const result = await asyncFn(...args, activeController?.signal);
      data.value = result;
      return result;
    } catch (err) {
      const normalized = normalizeApiError(err);
      error.value = normalized;
      throw normalized;
    } finally {
      loading.value = false;
      activeController = null;
    }
  }

  function reset() {
    cancel();
    data.value = null;
    loading.value = false;
    error.value = null;
  }

  if (immediate) {
    execute().catch(() => {});
  }

  onUnmounted(() => {
    cancel();
  });

  return {
    data,
    loading,
    error,
    execute,
    cancel,
    reset
  };
}
