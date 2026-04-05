# Codebase Structure

**Analysis Date:** 2026-04-05

## Directory Layout

```
antigravity-dashboard/
├── apps/
│   ├── backend/              # @antigravity/backend — Express API, services, SQLite
│   └── web/                  # @antigravity/web — Vite + React dashboard
├── electron/                 # Electron main + preload (desktop shell)
├── release/                  # electron-builder output (generated, often gitignored)
├── .env / .env.example       # OAuth and server secrets (root; backend resolves path)
├── package.json              # workspaces, electron scripts, electron-builder config
├── pnpm-lock.yaml
├── AGENTS.md                 # Repo-wide agent notes
└── .planning/                # Planning docs (this folder)
```

## Directory Purposes

**`apps/backend/`:**
- Purpose: Node/TypeScript server for REST, WebSocket, static SPA, and proxy routes.
- Contains: `src/` TypeScript, `dist/` build output, `package.json`, `tsconfig.json`.
- Key files: `apps/backend/src/server.ts`, `apps/backend/src/monitor.ts`, `apps/backend/src/index.ts`
- Subdirectories: `src/services/`, `src/routes/`, `src/utils/`, `src/types/`, `src/config/`

**`apps/web/`:**
- Purpose: React 18 UI (Tailwind), Zustand, hooks for API/WebSocket.
- Contains: `src/` sources, `dist/` Vite output, `vite.config.ts`, `tailwind.config.js`, `index.html`.
- Key files: `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/stores/useDashboardStore.ts`
- Subdirectories: `src/components/`, `src/hooks/`, `src/types/`

**`electron/`:**
- Purpose: Desktop wrapper — spawns backend, loads web UI.
- Contains: `electron/main.js`, `electron/preload.js`
- Subdirectories: None

**`.planning/codebase/`:**
- Purpose: Architecture and structure reference for planning tools.
- Contains: `ARCHITECTURE.md`, `STRUCTURE.md`, optional future docs.
- Committed: Yes (source of truth for GSD workflows).

## Key File Locations

**Entry Points:**
- `apps/backend/src/server.ts` — HTTP server, routes, WebSocket init, graceful shutdown (primary runtime).
- `apps/backend/src/index.ts` — Package exports; optional direct execution loads `server`.
- `apps/web/src/main.tsx` — React DOM root.
- `apps/web/src/App.tsx` — Tab navigation, auth, websocket and data hooks.
- `electron/main.js` — Electron `app.whenReady`, backend subprocess, `BrowserWindow`.

**Configuration:**
- `package.json` (root) — workspaces `apps/*`, scripts `build`, `dev`, `start`, `electron:*`, `electron-builder` `build.files`.
- `apps/backend/package.json` — `"start": "node dist/server.js"`, backend dependencies.
- `apps/web/package.json` — Vite scripts; `apps/web/vite.config.ts` — dev server port 5173, proxy `/api` and `/ws` to backend.
- `apps/backend/tsconfig.json` — TypeScript compile to `dist/`.
- `.env` (repo root) — loaded by `server.ts` via `resolve(__dirname, '../../..', '.env')` or `DOTENV_CONFIG_PATH` (Electron).

**Core Logic:**
- `apps/backend/src/server.ts` — All Express routes and service wiring (monolithic).
- `apps/backend/src/monitor.ts` — SQLite (`UsageMonitor`), schema, migrations.
- `apps/backend/src/routes/proxy.ts` — Claude/OpenAI proxy routers and management.
- `apps/backend/src/services/quotaService.ts` — Quota polling and token cache.
- `apps/backend/src/services/accountsFile.ts` — Accounts JSON watcher and account logic.
- `apps/backend/src/services/websocket.ts` — WebSocket server and broadcasts.
- `apps/backend/src/services/apiProxy/` — Request conversion, streaming, client.
- `apps/backend/src/services/languageServer/` — Extension port detection and HTTP client.
- `apps/backend/src/interceptor.ts` — Optional WS broadcast for intercepted requests.
- `apps/backend/src/utils/appPaths.ts` — Home/config paths for DB and accounts.
- `apps/backend/src/utils/authMiddleware.ts` — Bearer auth for `/api` and `/ws`.
- `apps/backend/src/utils/configManager.ts` — Config merge/helpers.
- `apps/web/src/hooks/*.ts` — `useWebSocket`, `useQuota`, `useAuth`, etc.

**Testing:**
- Not a dedicated `tests/` tree in-repo; add colocated `*.test.ts` if introducing Vitest/Jest (not detected in current layout).

**Documentation:**
- `AGENTS.md` — Root project map.
- `apps/backend/src/AGENTS.md`, `apps/web/src/AGENTS.md`, `apps/backend/src/services/AGENTS.md` — Scoped hints.

## Naming Conventions

**Files:**
- `camelCase.ts` — Most backend modules (`quotaService.ts`, `accountsFile.ts`).
- `PascalCase.tsx` — React components (`DashboardPage.tsx`, `AccountsPage.tsx`).
- `useXxx.ts` — Hooks in `apps/web/src/hooks/`.
- Lowercase route modules: `proxy.ts` under `routes/`.

**Directories:**
- Plural feature folders: `services/`, `components/`, `hooks/`, `types/`.
- `apps/*` — pnpm workspace packages.

**Special Patterns:**
- `getXxx()` / `getXxxService()` — Singleton accessors for backend services (`getMonitor`, `getAccountsService`, `getWebSocketManager`).

## Where to Add New Code

**New REST endpoint:**
- Primary: `apps/backend/src/server.ts` (register near related `/api` routes; respect `apiLimiter` and `requireAuth` ordering).
- If proxy-specific sub-API: extend `apps/backend/src/routes/proxy.ts` or `apps/backend/src/services/apiProxy/`.

**New WebSocket message type:**
- Server: `apps/backend/src/services/websocket.ts` and `apps/backend/src/types/` (WS message unions).
- Client: `apps/web/src/hooks/useWebSocket.ts`, `apps/web/src/stores/useDashboardStore.ts` as needed.

**New dashboard page:**
- Component: `apps/web/src/components/<Name>Page.tsx` (follow existing pages).
- Wire route/tab: `apps/web/src/App.tsx`.

**New backend service:**
- Implementation: `apps/backend/src/services/<name>.ts`
- Export from `apps/backend/src/index.ts` if part of public package API; wire in `server.ts`.

**New shared types:**
- Backend: `apps/backend/src/types/`
- Frontend: `apps/web/src/types/` — keep manually in sync per `AGENTS.md`.

**Utilities:**
- Backend: `apps/backend/src/utils/`
- Frontend: small helpers colocated or under `apps/web/src/` if introduced.

## Special Directories

**`apps/backend/dist/` / `apps/web/dist/`:**
- Purpose: TypeScript and Vite build outputs.
- Source: `tsc` / `vite build`
- Committed: No (build artifacts; served by Express from `apps/web/dist` in production).

**`release/`:**
- Purpose: Electron builder artifacts (e.g. portable `.exe`).
- Source: `pnpm electron:build`
- Committed: Typically no (verify `.gitignore`).

**`node_modules/`:**
- Purpose: Dependencies (pnpm).
- Committed: No.

---

*Structure analysis: 2026-04-05*
*Update when directory structure changes*
