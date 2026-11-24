# TypeScript Guidelines

## 1. Compiler Configuration (`tsconfig.json`)
The project enforces strict TypeScript compilation via `vue-tsc --noEmit`:
- `"strict": true` (enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `useUnknownInCatchVariables`)
- `"noImplicitOverride": true`
- `"noUncheckedIndexedAccess": true`
- `"verbatimModuleSyntax": true`
- `"noUnusedLocals": true` & `"noUnusedParameters": true`
- `"noFallthroughCasesInSwitch": true`
- `"isolatedModules": true`

## 2. Untrusted Boundary Rules
1. **No `Record<string, any>` in DTOs**: External API responses enter DTO constructors as `Record<string, unknown> = {}` (or `Record<string, unknown> | unknown[]`).
2. **Runtime Narrowing via `src/utils/validators.ts`**: DTO constructors extract fields using `asString`, `asNullableString`, `asNumber`, `asNullableNumber`, `asBoolean`, `asRecord`, `asRecordArray`, `asStringArray`, `isPlainRecord`, `assertNonEmptyString`, `assertFiniteNumber`, and `assertArrayOf`.
3. **Structured Interfaces for Nested Rows**: Typed interfaces such as `KeyHistoryItem` (`src/dto/key.dto.ts`) and `BenchmarkPerformanceRow` (`src/dto/audit.dto.ts`) replace untyped object arrays so Vue templates enjoy full compile-time property checking.
4. **Error Catching**: Always use `catch (err: unknown)` and narrow with `isCanceledError(err)`, `err instanceof AppError`, or `extractApiError(err, fallback)`.
5. **Type-Only Imports**: With `verbatimModuleSyntax: true`, always use `import type { ... }` for types and interfaces.
