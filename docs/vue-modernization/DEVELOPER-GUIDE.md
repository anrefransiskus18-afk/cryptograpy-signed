# Developer Guide — PT XYZ DocShield Frontend

## Quick Start
```bash
cd frontend
npm install
npm run dev      # Vite dev server on http://localhost:5173 (proxies /api -> :8000)
```

## Quality & Build Commands
```bash
npm run lint:arch        # Architecture & circular dependency check
npm test                 # Run all 32 unit & integration tests
npm run test:coverage    # Run tests with c8/node coverage report
npm run build            # Production build to dist/
npm run check            # Full gate: lint:arch && test && build
```

## Conventions
- **Never** import `axios`, `httpClient`, or `repositories/` inside `views/`, `components/`, `stores/`, `composables/`, or `i18n/`.
- **Always** use `src/utils/logger.js` instead of `console.*`.
- **Always** add new UI strings to both `src/i18n/locales/id.js` and `src/i18n/locales/en.js`.
- Use `jsconfig.json` + `src/types/domain.d.ts` for JSDoc/IDE type checking.
