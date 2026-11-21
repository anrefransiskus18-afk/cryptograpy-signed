import { computed } from "vue";
import { useAuthStore } from "../stores/auth";

export function usePermissions(storeProvider = useAuthStore) {
  const store = storeProvider();

  const isAdmin = computed(() => store.isAdmin);
  const canVerifyAuditChain = computed(
    () => store.isAdmin || store.user?.role === "EXECUTIVE"
  );
  const clearanceLevel = computed(() => store.user?.clearance_level || 0);

  function canDeleteDocument(doc) {
    if (!doc) return false;
    return Boolean(store.isAdmin || doc.sender_id === store.user?.id);
  }

  function hasClearance(requiredLevel = 1) {
    return clearanceLevel.value >= requiredLevel;
  }

  return {
    isAdmin,
    canVerifyAuditChain,
    clearanceLevel,
    canDeleteDocument,
    hasClearance
  };
}
