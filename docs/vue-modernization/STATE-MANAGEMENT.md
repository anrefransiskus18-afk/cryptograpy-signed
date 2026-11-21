# State Management — PT XYZ DocShield

## Pinia Stores (`src/stores/`)
1. **`useAuthStore` (`src/stores/auth.js`):**
   - Holds `token`, `user` (transformed via `UserProfileDTO`), `localPrivateKeyPem`, and `localKeyFingerprint`.
   - Derived getters: `isAuthenticated`, `isAdmin`, `hasLocalPrivateKey`.
   - Actions: `syncFromStorage()`, `setSession()`, `setUser()`, `setLocalPrivateKey()`, `clearSession()`.
   - **Security Rule:** Never stores plaintext passwords, key passphrases, or decrypted document plaintexts. Encrypted PKCS#8 PEM is scoped to `sessionStorage`.
2. **`useToastStore` (`src/stores/toast.js`):**
   - Ephemeral UI notification queue (`push` / `show` / `dismiss`) with auto-dismiss timers.
