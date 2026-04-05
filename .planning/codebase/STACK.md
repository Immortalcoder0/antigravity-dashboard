# Technology Stack

**Analysis Date:** 2026-04-05

## Monorepo

**Structure:**
- Package manager: `pnpm` with workspaces
- Lockfile: `pnpm-lock.yaml` (present)
- Workspace config: `pnpm-workspace.yaml` — `packages: ['apps/*']`
- Root `package.json` delegates to workspaces via `pnpm --filter=./apps/*`
- Native build dependencies: `better-sqlite3`, `esbuild` (listed in `onlyBuiltDependencies`)

**Workspaces:**
| Workspace | Package Name | Description |
|-----------|-------------|-------------|
| `apps/backend` | `@antigravity/backend` | Express API server, quota monitoring, API proxy |
| `apps/web` | `@antigravity/web` | React dashboard UI |

## Runtime

**Environment:**
- Node.js >= 18.0.0 (enforced via `engines` in root `package.json`)
- `.nvmrc` present for version pinning
- `.npmrc` present for package manager configuration

## Backend (@antigravity/backend)

**Framework:**
- Express 4.18.2 — HTTP server, all routes in `apps/backend/src/server.ts` (2000+ lines)
- TypeScript 5.3.3 — strict mode, CommonJS modules, ES2020 target
- Config: `apps/backend/tsconfig.json` — `strict: true`, `module: "commonjs"`, `declaration: true`

**Key Libraries:**
- `better-sqlite3` 12.5.0 — Synchronous SQLite database (types: `@types/better-sqlite3` 7.6.8)
- `ws` 8.16.0 — WebSocket server for real-time updates (types: `@types/ws` 8.5.10)
- `chokidar` 5.0.0 — File system watcher for accounts file monitoring
- `helmet` 8.1.0 — HTTP security headers
- `cors` 2.8.5 — CORS middleware
- `express-rate-limit` 8.2.1 — API rate limiting
- `dotenv` 16.3.1 — Environment variable loading (from `../../../.env` relative to `dist/`)
- `fast-json-patch` 3.1.1 — JSON Patch operations for account diffs

**Peer Dependencies:**
- `opencode-antigravity-auth` ^1.2.0 — OAuth token provider (external plugin)

**Entry Point:**
- `apps/backend/src/server.ts` — Express app, all routes, WebSocket init, static file serving
- `apps/backend/src/index.ts` — Package exports + optional direct run
- `apps/backend/src/monitor.ts` — SQLite operations, burn rate, snapshots

## Frontend (@antigravity/web)

**Framework:**
- React 18.2.0 — Functional components only
- TypeScript 5.3.3 — strict mode, ESNext modules, JSX: `react-jsx`
- Config: `apps/web/tsconfig.json` — `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, path alias `@/*` → `./src/*`

**Build Tool:**
- Vite 7.3.1 — Dev server and bundler
- `@vitejs/plugin-react` 5.1.2 — React Fast Refresh
- Config: `apps/web/vite.config.ts`
  - Dev server port: 5173
  - Proxy: `/api` → `http://localhost:3456`, `/ws` → `ws://localhost:3456`
  - Output: `dist/` with `emptyOutDir: true`

**UI Libraries:**
- `lucide-react` 0.294.0 — Icon library
- `recharts` 2.10.3 — Charts and data visualization
- `date-fns` 3.0.0 — Date formatting and manipulation
- `use-debounce` 10.0.6 — Debounce hook for search/filter inputs

## State Management

**Approach:**
- Zustand 5.0.9 — Global state management
- Store: `apps/web/src/stores/useDashboardStore.ts`
  - Single monolithic store with `persist` middleware
  - Manages: accounts, stats, WebSocket state, notifications, preferences, navigation, selection, filters
  - Uses `persist` middleware from `zustand/middleware` for localStorage persistence

**Data Fetching:**
- Custom hooks in `apps/web/src/hooks/` — all API calls via hooks, never direct `fetch` in components
- WebSocket connection managed via hooks, not Zustand

## Database

**Type:** SQLite (embedded, file-based)
**Client:** `better-sqlite3` (synchronous API)
**Location:** `~/.config/opencode/antigravity-dashboard/usage.db`
**Schema** (defined in `apps/backend/src/monitor.ts`, lines 24-75):
- `api_calls` — Proxy request logs (timestamp, email, model, tokens, duration, status)
  - Indexes: `idx_timestamp`, `idx_account_email`, `idx_model`, `idx_status`
- `account_status` — Rate limit state per account
- `session_events` — Session lifecycle events
- `quota_snapshots` — Quota percentage over time for burn rate calculation
  - Indexes: `idx_qs_family_time`, `idx_qs_email`

**Runtime:** Created on first run, schema auto-migrated via `migrateSchema()`

## Styling

**Approach:** Tailwind CSS 3.3.6 — utility-first, no CSS modules or styled-components
**PostCSS:** `apps/web/postcss.config.js` — `tailwindcss` + `autoprefixer`
**Theme Config:** `apps/web/tailwind.config.js`
- CSS variable-based theming:
  - `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-card`
  - `--border-subtle`, `--border-hover`
  - `--text-primary`, `--text-secondary`, `--text-muted`, `--text-accent`
- Custom color palette: `status.green`, `status.yellow`, `status.red`, `status.blue`, `status.purple`, `status.gold`
- Fonts: Plus Jakarta Sans (sans), Outfit (display), DM Sans (body), Inter (mono)
- Custom shadows: `shadow-premium`, `shadow-premium-hover`, `shadow-card`
- Animations: `animate-fade-in`, `animate-slide-up`
- Global CSS: `apps/web/src/index.css` — CSS variables + Tailwind directives

## Build & Tooling

**Bundler:**
- Backend: `tsc` (TypeScript compiler) — `apps/backend/tsconfig.json`
  - `build`: `tsc`, `dev`: `tsc -w`, output to `dist/`
- Frontend: Vite — `apps/web/vite.config.ts`
  - `build`: `vite build`, `dev`: `vite`, `preview`: `vite preview`

**Linting:**
- oxlint 1.39.0 — Rust-based linter (fast)
- Config: `.oxlintrc.json`
  - Plugins: `typescript`, `import`, `unicorn`, `promise`
  - Categories: `correctness: error`, `suspicious: warn`, `perf: warn`
  - Notable rules: `no-debugger: error`, `no-unused-vars: warn`, `typescript/no-explicit-any: warn`
  - Ignores: `dist`, `node_modules`, `*.min.js`, `coverage`, `tasks`
- Root scripts: `pnpm run lint`, `pnpm run lint:fix`

**Type Checking:**
- Backend: `tsc --noEmit` (via `typecheck` script)
- Frontend: `noEmit: true` in tsconfig, Vite handles type checking via `tsc` references

**Dev Tooling:**
- `concurrently` 9.2.1 — Run multiple dev servers (root level)
- Root `dev` script: `pnpm --filter=./apps/* run dev` — runs both workspaces in parallel

## Key Technical Decisions

1. **Monorepo over single app**: Separation of concerns — backend handles API/proxy/DB, frontend is pure UI. Shared types are duplicated (`apps/backend/src/types/` vs `apps/web/src/types/`) and manually synced.

2. **Express serves the SPA**: Production build serves `apps/web/dist/` as static files from Express. No separate web server needed.

3. **Synchronous SQLite**: `better-sqlite3` chosen over async alternatives for simplicity — quota monitoring is single-threaded and latency-sensitive.

4. **WebSocket over SSE**: Real-time updates use `ws` library with message batching (100ms interval), heartbeat (30s), and client timeout (60s).

5. **Singleton service pattern**: All backend services use `getXxxService()` factory pattern and extend `EventEmitter` for state change notifications.

6. **No test framework**: No testing libraries detected in either workspace. Quality assurance relies on linting (oxlint) and TypeScript strict mode.

7. **Protocol signatures**: Base64-encoded thought/tool signatures (`CLAUDE_THOUGHT_SIGNATURE`, `GEMINI_THOUGHT_SIGNATURE`, etc.) are hardcoded in `apps/backend/src/services/apiProxy/converter.ts` for Antigravity API compatibility.

---

*Stack analysis: 2026-04-05*
