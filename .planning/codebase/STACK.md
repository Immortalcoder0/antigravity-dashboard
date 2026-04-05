# Technology Stack

**Analysis Date:** 2026-04-05

## Languages

**Primary:**
- TypeScript `^5.3.3` — Application code: `apps/backend/src/` (CommonJS emit, `strict`), `apps/web/src/` (ES modules, Vite)

**Secondary:**
- JavaScript — `electron/main.js`, `electron/preload.js` (Electron main/preload; no TypeScript compile step in-repo)

## Runtime

**Environment:**
- Node.js `>=18.0.0` — Declared in `package.json` (`engines.node`)
- Electron `^41.1.1` — Desktop shell (`electron/main.js`); dev script `electron:dev` in root `package.json`

**Package Manager:**
- pnpm — Workspaces monorepo (`workspaces`: `apps/*` in root `package.json`)
- Lockfile: `pnpm-lock.yaml` (lockfileVersion `9.0`)

## Frameworks

**Core:**
- Express `^4.18.2` — HTTP API, static SPA, WebSocket upgrade (`apps/backend/src/server.ts`)
- React `^18.2.0` + React DOM `^18.2.0` — Dashboard UI (`apps/web/`)
- ws `^8.16.0` — WebSocket server (`apps/backend/src/services/websocket.ts`)

**Testing:**
- Not detected — No `vitest`/`jest` config or `*.test.*` / `*.spec.*` files under `apps/` in this workspace snapshot

**Build/Dev:**
- Vite `^7.3.1` — Frontend bundler (`apps/web/vite.config.ts`)
- `@vitejs/plugin-react` `^5.1.2` — React refresh
- TypeScript `^5.3.3` — `tsc` for backend (`apps/backend` scripts: `build`, `typecheck`)
- Tailwind CSS `^3.3.6` + PostCSS `^8.4.32` + Autoprefixer `^10.4.16` — Web styling (`apps/web/`)
- electron-builder `^26.8.1` — Windows portable/zip packaging (`package.json` `build` block, output `release/`)
- concurrently `^9.2.1`, wait-on `^9.0.4`, cross-env `^10.1.0` — Electron dev orchestration (root `devDependencies`)

## Key Dependencies

**Critical:**
- better-sqlite3 `^12.5.0` — Local SQLite for usage/analytics (`apps/backend/src/monitor.ts`)
- express + cors `^2.8.5` + helmet `^8.1.0` + express-rate-limit `^8.2.1` — HTTP stack and API hardening (`apps/backend/src/server.ts`, `apps/backend/src/utils/authMiddleware.ts`)
- dotenv `^16.3.1` — Loads root `.env` (path resolved in `apps/backend/src/server.ts`)
- zustand `^5.0.9` — Client state (`apps/web/`)
- recharts `^2.10.3`, lucide-react `^0.294.0`, date-fns `^3.0.0` — Charts, icons, dates in UI

**Infrastructure:**
- chokidar `^5.0.0` — Watch `antigravity-accounts.json` (`apps/backend/src/services/accountsFile.ts`)
- fast-json-patch `^3.1.1` — JSON patch utilities for account/config updates

**Peer (optional install):**
- opencode-antigravity-auth `^1.2.0` — Declared as `peerDependencies` in `apps/backend/package.json` (OAuth/plugin alignment; not a runtime import in backend source reviewed)

## Configuration

**Environment:**
- Root `.env` — Loaded by backend (`resolve(__dirname, '../../..', '.env')` unless `DOTENV_CONFIG_PATH` is set, e.g. Electron: `electron/main.js`)
- Documented variables: `.env.example` (server port, DB retention, CORS, rate limits, optional `DASHBOARD_SECRET`, Google OAuth client IDs)
- Override user home for paths: `ANTIGRAVITY_HOME` — `apps/backend/src/utils/appPaths.ts` (`getAppHomeDir()`)

**Build:**
- `apps/backend/tsconfig.json` — `target`/`lib` ES2020, `module` commonjs, `outDir` `dist/`
- `apps/web/vite.config.ts` — Dev server port `5173`, proxy `/api` and `/ws` to `http://localhost:3456`
- `.oxlintrc.json` — oxlint `^1.39.0` (root `lint` script)

## Platform Requirements

**Development:**
- Windows/macOS/Linux with Node `>=18` and pnpm
- Backend dev: `pnpm --filter=@antigravity/backend run dev` (tsc + `node dist/server.js`)
- Web dev: Vite on port `5173` with API proxy to backend `3456`
- Electron dev: `electron:dev` runs backend + web + Electron (`package.json` scripts)

**Production:**
- Single-process deployment: Express serves built SPA from `apps/web/dist` (`apps/backend/src/server.ts`)
- Default bind: `127.0.0.1` without `DASHBOARD_SECRET`; `0.0.0.0` when dashboard auth enabled (`apps/backend/src/utils/authMiddleware.ts`)
- Electron: Packaged backend under `resources/backend`, `.env` in `extraResources` (`package.json` `build`); portable + zip for Windows x64

---

*Stack analysis: 2026-04-05*
*Update after major dependency changes*
