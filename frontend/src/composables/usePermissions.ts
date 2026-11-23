import { computed } from "vue";
import { useAuthStore } from "../stores/auth";

export interface PermissionStoreLike {
  isAdmin: boolean;
  user: {
    id?: number;
    role?: string;
    clearance_level?: number;
  } | null;
}

export function usePermissions(storeProvider: () => PermissionStoreLike = useAuthStore) {
  const store = storeProvider();

  const isAdmin = computed(() => store.isAdmin);
  const canVerifyAuditChain = computed(
    () => store.isAdmin || store.user?.role === "EXECUTIVE"
  );
  const clearanceLevel = computed(() => store.user?.clearance_level || 0);

  function canDeleteDocument(doc: { sender_id?: number | null } | null | undefined): boolean {
    if (!doc) return false;
    return Boolean(store.isAdmin || doc.sender_id === store.user?.id);
  }

  function hasClearance(requiredLevel = 1): boolean {
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
