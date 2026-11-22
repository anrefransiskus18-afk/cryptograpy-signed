import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { Lazy, UserProfileDTO } from "../dto";
import {
  clearAllSessionStorage,
  getStoredKeyFingerprint,
  getStoredPrivateKey,
  getStoredRawUser,
  getStoredToken,
  setStoredKeyFingerprint,
  setStoredPrivateKey,
  setStoredToken,
  setStoredUser
} from "../utils/sessionStorage";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string>(getStoredToken());
  const user = ref<UserProfileDTO | null>((() => {
    try {
      const raw = getStoredRawUser();
      return raw ? Lazy.transform<UserProfileDTO>(JSON.parse(raw), UserProfileDTO) : null;
    } catch {
      return null;
    }
  })());
  const localPrivateKeyPem = ref<string>(getStoredPrivateKey());
  const localKeyFingerprint = ref<string>(getStoredKeyFingerprint());

  const isAuthenticated = computed(() => Boolean(token.value && user.value));
  const isAdmin = computed(() => {
    const role = user.value?.role || "";
    const clearance = user.value?.clearance_level || 0;
    return role === "SECURITY_ADMIN" || role === "ADMINISTRATOR" || clearance >= 4;
  });
  const hasLocalPrivateKey = computed(() => Boolean(localPrivateKeyPem.value));

  function syncFromStorage(): void {
    token.value = getStoredToken();
    try {
      const raw = getStoredRawUser();
      user.value = raw ? Lazy.transform<UserProfileDTO>(JSON.parse(raw), UserProfileDTO) : null;
    } catch {
      user.value = null;
    }
    localPrivateKeyPem.value = getStoredPrivateKey();
    localKeyFingerprint.value = getStoredKeyFingerprint();
  }

  function setSession(accessToken: string, userProfile: Record<string, unknown> | UserProfileDTO | null): void {
    token.value = accessToken || "";
    user.value = userProfile ? Lazy.transform<UserProfileDTO>(userProfile, UserProfileDTO) : null;
    setStoredToken(token.value);
    setStoredUser(user.value);
  }

  function setUser(profileDto: Record<string, unknown> | UserProfileDTO): UserProfileDTO {
    user.value = Lazy.transform<UserProfileDTO>({ ...(user.value || {}), ...profileDto }, UserProfileDTO);
    setStoredUser(user.value);
    return user.value;
  }

  function setLocalPrivateKey(pem: string, fingerprint = ""): void {
    localPrivateKeyPem.value = pem || "";
    setStoredPrivateKey(localPrivateKeyPem.value);
    if (fingerprint) {
      localKeyFingerprint.value = fingerprint;
      setStoredKeyFingerprint(fingerprint);
    }
  }

  function clearSession(): void {
    token.value = "";
    user.value = null;
    localPrivateKeyPem.value = "";
    localKeyFingerprint.value = "";
    clearAllSessionStorage();
  }

  return {
    token,
    user,
    localPrivateKeyPem,
    localKeyFingerprint,
    isAuthenticated,
    isAdmin,
    hasLocalPrivateKey,
    syncFromStorage,
    setSession,
    setUser,
    setLocalPrivateKey,
    clearSession
  };
});
