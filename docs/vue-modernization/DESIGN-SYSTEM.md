# Design System — PT XYZ DocShield

## 1. Design Tokens (`src/styles/tokens.css`)
- **Surface & Background:** `--bg-app`, `--bg-surface`, `--bg-surface-muted`
- **Typography & Ink:** `--text-primary`, `--text-secondary`, `--text-muted` (`Inter` UI font, `JetBrains Mono` for fingerprints/hashes/HEX)
- **Borders & Elevation:** `--border-subtle`, `--border-strong`
- **Brand Accent:** `--accent-primary` (`#4f46e5` Light / `#6366f1` Dark), `--accent-primary-hover`
- **Radii:** `--radius-card` (`0.75rem`), `--radius-control` (`0.5rem`)

## 2. Light & Dark Mode
- Configured in `tailwind.config.js` with `darkMode: "class"`.
- Managed by `src/composables/useTheme.js` (`theme`, `isDark`, `setTheme`, `toggleTheme`), persisted in `localStorage` (`app_theme`) with `prefers-color-scheme` fallback.
- Toggle buttons available in both `Login.vue` and the `App.vue` top header bar.
