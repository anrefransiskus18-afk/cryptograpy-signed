import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { Lazy, UserProfileDTO } from "../dto";

/**
 * Auth Store: murni state management & sinkronisasi storage.
 * Seluruh komunikasi API & business logic autentikasi ditangani oleh AuthService.
 */
export const useAuthStore = defineStore("auth", () => {
  const token = ref(localStorage.getItem("jwt_token") || "");
  const user = ref((() => {
    try {
      const raw = localStorage.getItem("current_user");
      return raw ? Lazy.transform(JSON.parse(raw), UserProfileDTO) : null;
    } catch {
      return null;
    }
  })());
  const localPrivateKeyPem = ref(sessionStorage.getItem("local_pkcs8_private_key") || "");
  const localKeyFingerprint = ref(sessionStorage.getItem("local_key_fingerprint") || "");

  const isAuthenticated = computed(() => Boolean(token.value && user.value));
  const isAdmin = computed(() => {
    const role = user.value?.role || "";
    const clearance = user.value?.clearance_level || 0;
    return role === "SECURITY_ADMIN" || role === "ADMINISTRATOR" || clearance >= 4;
  });
  const hasLocalPrivateKey = computed(() => Boolean(localPrivateKeyPem.value));

  function syncFromStorage() {
    token.value = localStorage.getItem("jwt_token") || "";
    try {
      const raw = localStorage.getItem("current_user");
      user.value = raw ? Lazy.transform(JSON.parse(raw), UserProfileDTO) : null;
    } catch {
      user.value = null;
    }
    localPrivateKeyPem.value = sessionStorage.getItem("local_pkcs8_private_key") || "";
    localKeyFingerprint.value = sessionStorage.getItem("local_key_fingerprint") || "";
  }

  function setSession(accessToken, userProfile) {
    token.value = accessToken || "";
    user.value = userProfile ? Lazy.transform(userProfile, UserProfileDTO) : null;
    if (token.value) {
      localStorage.setItem("jwt_token", token.value);
    } else {
      localStorage.removeItem("jwt_token");
    }
    if (user.value) {
      localStorage.setItem("current_user", JSON.stringify(user.value));
    } else {
      localStorage.removeItem("current_user");
    }
  }

  function setUser(profileDto) {
    user.value = Lazy.transform({ ...(user.value || {}), ...profileDto }, UserProfileDTO);
    localStorage.setItem("current_user", JSON.stringify(user.value));
    return user.value;
  }

  function setLocalPrivateKey(pem, fingerprint = "") {
    localPrivateKeyPem.value = pem || "";
    if (pem) {
      sessionStorage.setItem("local_pkcs8_private_key", pem);
    } else {
      sessionStorage.removeItem("local_pkcs8_private_key");
    }
    if (fingerprint) {
      localKeyFingerprint.value = fingerprint;
      sessionStorage.setItem("local_key_fingerprint", fingerprint);
    }
  }

  function clearSession() {
    token.value = "";
    user.value = null;
    localPrivateKeyPem.value = "";
    localKeyFingerprint.value = "";
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("current_user");
    sessionStorage.removeItem("local_pkcs8_private_key");
    sessionStorage.removeItem("local_key_fingerprint");
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
