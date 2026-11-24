import test from "node:test";
import assert from "node:assert/strict";
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "../src/stores/auth.ts";
import { useToastStore } from "../src/stores/toast.ts";
import { Lazy } from "../src/lib/lazy.ts";
import { UserProfileDTO } from "../src/dto/auth.dto.ts";

function withMockStorage(fn) {
  const origLocal = globalThis.localStorage;
  const origSession = globalThis.sessionStorage;
  const lMap = new Map();
  const sMap = new Map();
  globalThis.localStorage = {
    getItem: (k) => lMap.get(k) ?? null,
    setItem: (k, v) => lMap.set(k, String(v)),
    removeItem: (k) => lMap.delete(k)
  };
  globalThis.sessionStorage = {
    getItem: (k) => sMap.get(k) ?? null,
    setItem: (k, v) => sMap.set(k, String(v)),
    removeItem: (k) => sMap.delete(k)
  };
  return Promise.resolve()
    .then(() => fn({ lMap, sMap }))
    .finally(() => {
      globalThis.localStorage = origLocal;
      globalThis.sessionStorage = origSession;
    });
}

test("AuthStore manages session, admin getters, local private key, and storage sync", async () => {
  await withMockStorage(({ lMap, sMap }) => {
    setActivePinia(createPinia());
    const store = useAuthStore();
    assert.equal(store.isAuthenticated, false);
    assert.equal(store.isAdmin, false);

    store.setSession("jwt-abc", {
      id: 1,
      username: "admin.sec",
      role: "SECURITY_ADMIN",
      clearance_level: 4
    });
    assert.equal(store.isAuthenticated, true);
    assert.equal(store.isAdmin, true);
    assert.equal(lMap.has("jwt_token"), false);
    assert.equal(sMap.get("jwt_token"), "jwt-abc");

    store.setUser({ full_name: "Anre Updated" });
    assert.equal(store.user.full_name, "Anre Updated");

    store.setLocalPrivateKey("ENC_PEM_1", "fp-1");
    assert.equal(store.hasLocalPrivateKey, true);
    assert.equal(sMap.get("local_pkcs8_private_key"), "ENC_PEM_1");
    assert.equal(sMap.get("local_key_fingerprint"), "fp-1");

    store.clearSession();
    assert.equal(store.isAuthenticated, false);
    assert.equal(store.hasLocalPrivateKey, false);
    assert.equal(lMap.has("jwt_token"), false);
    assert.equal(sMap.has("local_pkcs8_private_key"), false);

    lMap.set("current_user", JSON.stringify({ id: 2, username: "staff", role: "STAFF", clearance_level: 1 }));
    store.syncFromStorage();
    assert.equal(store.isAuthenticated, true);
    assert.equal(store.isAdmin, false);
    assert.equal(lMap.has("jwt_token"), false);
  });
});

test("ToastStore pushes and dismisses notifications", () => {
  setActivePinia(createPinia());
  const toast = useToastStore();
  toast.show("Berhasil", "success", 0);
  toast.show("Gagal", "error", 0);
  assert.equal(toast.toasts.length, 2);
  const firstId = toast.toasts[0].id;
  toast.dismiss(firstId);
  assert.equal(toast.toasts.length, 1);
  assert.equal(toast.toasts[0].message, "Gagal");
});

test("Lazy.transform handles arrays, nullish values, query mode, and nested schemas", () => {
  assert.equal(Lazy.transform(null, UserProfileDTO), null);
  const arr = Lazy.transform([{ id: 1, username: "a" }, { id: 2, username: "b" }], [UserProfileDTO]);
  assert.equal(arr.length, 2);
  assert.equal(arr[0] instanceof UserProfileDTO, true);

  const query = Lazy.transform({ search: "abc", empty: "", undef: undefined }, "query");
  assert.deepEqual(query, { search: "abc" });
});
