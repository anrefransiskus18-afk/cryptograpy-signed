# End-to-End Test Scenarios (Specification)

> **Status**: Specification ready for `@playwright/test` execution against live Docker/staging stack (not executed in offline sandbox).

1. **E2E-01: Authentication & Route Guard**: Unauthenticated visit to `/documents` redirects to `/login`; valid login lands on `/` (`Dashboard.vue`); logout clears session and redirects to `/login`.
2. **E2E-02: Key Generation & Rotation**: User generates/rotates ECC P-256 keypair in `KeyManagement.vue` with `>= 8` char passphrase, receives new fingerprint, and downloads `.pem`.
3. **E2E-03: Document Encryption & Clearance Check**: User selects sample/valid file, recipient, and classification in `Encrypt.vue`; clearance mismatch disables submission; valid submission downloads `.enc`.
4. **E2E-04: Tamper Detection & Decryption**: User selects `.enc` in `Decrypt.vue`, activates 1-bit tamper simulation $\rightarrow$ backend returns `422 TAMPER_DETECTED` $\rightarrow$ UI displays tamper alert. Clean `.enc` + valid `.pem` + passphrase downloads original file.
5. **E2E-05: Audit Chain Verification & CSV Export**: Admin verifies ECDSA P-256 audit chain in `AuditLogs.vue` and exports sanitized CSV.
6. **E2E-06: 404 & Error Boundary**: Unknown route renders `NotFound.vue` with navigation back to `/`.
