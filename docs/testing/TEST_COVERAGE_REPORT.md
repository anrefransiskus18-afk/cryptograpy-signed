# Test Coverage Report — Frontend

**Date**: 2026-11-23  
**Command**: `npm run test:coverage` (`node --experimental-test-coverage --test-coverage-exclude='tests/**' tests/*.test.js`)

---

## 1. Overall Coverage Summary

| Metric | Percentage |
| :--- | :--- |
| **Line Coverage** | **77.91%** |
| **Branch Coverage** | **70.63%** |
| **Function Coverage** | **90.88%** |

---

## 2. Key Module Coverage (Observed)

| Module | Line % | Branch % | Function % |
| :--- | :--- | :--- | :--- |
| `constants/endpoints.ts` | 100.00% | 100.00% | 100.00% |
| `utils/crypto/tamperSimulator.ts` | 100.00% | 66.67% | 100.00% |
| `stores/auth.ts` | 93.55% | 69.23% | 100.00% |
| `dto/audit.dto.ts` | 92.47% | 57.14% | 100.00% |
| `dto/key.dto.ts` | 92.24% | 58.33% | 100.00% |
| `utils/file.ts` | 91.80% | 86.67% | 87.50% |
| `services/EncryptionService.ts` | 87.72% | 68.00% | 87.50% |
| `utils/validators.ts` | 86.84% | 100.00% | 100.00% |
| `services/DecryptionService.ts` | 86.14% | 80.77% | 80.00% |
| `utils/logger.ts` | 85.42% | 83.33% | 66.67% |
| `utils/errors.ts` | 84.95% | 78.72% | 91.67% |
| `repositories/BaseRepository.ts` | 79.14% | 92.50% | 100.00% |

## 3. Remaining Coverage Gaps
- `.vue` SFC templates/scripts are type-checked by `vue-tsc --noEmit` and bundled by `vite build`, but are not DOM-mounted in `node --test` (requires `@vue/test-utils` + `vitest` in CI/online environment).
- `utils/crypto/hashWorker.ts` (`39.76%` lines) executes the WebCrypto fallback path in Node (`Worker` branch is browser-only).
