import { ref, onUnmounted, type Ref } from "vue";
import { normalizeApiError, type AppError } from "../utils/errors";

export interface UseAsyncOptions {
  immediate?: boolean;
}

export function useAsync<T = unknown, A extends any[] = any[]>(
  asyncFn: (...args: [...A, AbortSignal | undefined]) => Promise<T>,
  { immediate = false }: UseAsyncOptions = {}
) {
  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<AppError | null>(null);
  let activeController: AbortController | null = null;

  function cancel(): void {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  }

  async function execute(...args: A): Promise<T> {
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

  function reset(): void {
    cancel();
    data.value = null;
    loading.value = false;
    error.value = null;
  }

  if (immediate) {
    (execute as () => Promise<T>)().catch(() => {});
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
