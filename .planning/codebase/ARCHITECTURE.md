# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Monolithic Express backend with a React SPA, optional Electron shell, and domain services exposed as singletons.

**Key Characteristics:**
- Single Node process hosts HTTP API, WebSocket, static SPA, and Claude/OpenAI-compatible proxy routes.
- Business logic lives in `apps/backend/src/services/` and `apps/backend/src/monitor.ts`; HTTP wiring is concentrated in `apps/backend/src/server.ts`.
- Real-time UI updates use WebSocket (`/ws`) fed by service events (accounts file, quotas, proxy rate limits).
- External data: Google OAuth-backed quota APIs, local JSON accounts file, SQLite usage store, optional separate “manager” service for log sync.

## Layers

**Client (browser or Electron renderer):**
- Purpose: Dashboard UI, auth token handling, REST + WebSocket consumption.
- Contains: React components, Zustand store, data hooks.
- Location: `apps/web/src/`
- Depends on: Backend HTTP/WebSocket (same origin in production; Vite proxy in dev — see `apps/web/vite.config.ts`).
- Used by: End users; Electron loads dev URL or packaged `apps/web/dist/index.html` via `electron/main.js`.

**HTTP + transport (Express):**
- Purpose: CORS, Helmet, JSON body parsing, rate limiting, route registration, SPA fallback, HTTP server creation.
- Contains: All `/api/*` handlers, static file serving, global error middleware, `createServer` + WebSocket attach.
- Location: `apps/backend/src/server.ts`
- Depends on: Services (`getMonitor`, `getAccountsService`, `getWebSocketManager`, `getQuotaService`, etc.), `apps/backend/src/routes/proxy.ts`, `apps/backend/src/utils/authMiddleware.ts`.
- Used by: Browser/Electron, CLI clients using the proxy API.

**Proxy router module:**
- Purpose: Claude/OpenAI-shaped API (`/v1/*`) and dashboard-scoped proxy management (`/api/proxy/*`).
- Contains: `initializeProxyRoutes`, `proxyApiRouter`, `proxyManagementRouter`.
- Location: `apps/backend/src/routes/proxy.ts`
- Depends on: `apps/backend/src/services/apiProxy/` (`ApiProxyService`), monitor, auth middleware.
- Used by: Mounted from `server.ts` before static middleware so API traffic is not served as files.

**Domain services:**
- Purpose: Account file lifecycle, quota polling, WebSocket broadcasting, API proxy conversion, language server bridge, structured file logging, quota strategy config.
- Contains: EventEmitter-based and factory singletons (`getXxxService()`).
- Location: `apps/backend/src/services/` (see `apps/backend/src/services/AGENTS.md`), plus `apps/backend/src/monitor.ts` for SQLite.
- Depends on: Env vars (loaded in `server.ts`), filesystem paths from `apps/backend/src/utils/appPaths.ts`, Google APIs via `apps/backend/src/services/quotaService.ts`.
- Used by: `server.ts`, `routes/proxy.ts`, `interceptor.ts`.

**Persistence and observability:**
- Purpose: SQLite for API call history, burn rate, snapshots; JSON file for OAuth accounts; optional log sync from manager.
- Contains: `UsageMonitor` in `apps/backend/src/monitor.ts`; raw read of `antigravity-accounts.json` in `server.ts` for token-backed quota polling.
- Location: DB path under `~/.config/opencode/antigravity-dashboard/usage.db` (via `getAppHomeDir()` in `apps/backend/src/utils/appPaths.ts`); accounts path `~/.config/opencode/antigravity-accounts.json` used in `apps/backend/src/services/accountsFile.ts` and `server.ts`.

**Cross-cutting instrumentation:**
- Purpose: Optional WS broadcast for internal Antigravity traffic.
- Location: `apps/backend/src/interceptor.ts` (`setWsManager`, `AntigravityInterceptor`) — wired from `server.ts` with `setWsManager(wsManager)`.

## Data Flow

**REST (dashboard API):**

1. Client calls `fetch('/api/...')` (with optional `Authorization: Bearer` when `DASHBOARD_SECRET` auth is enabled — `apps/backend/src/utils/authMiddleware.ts`).
2. `express-rate-limit` applies to `/api` (`apps/backend/src/server.ts`).
3. `requireAuth` runs for `/api` when auth is configured.
4. Route handler reads/writes via `getAccountsService()`, `getMonitor()`, `getQuotaService()`, `getLanguageServerService()`, or proxies to `MANAGER_URL` for manager-specific routes.
5. JSON response; errors may hit the Express error middleware at the bottom of `server.ts`.

**WebSocket (live dashboard):**

1. HTTP `Server` from `createServer(app)` in `server.ts`; `WebSocketManager.initialize(server, '/ws')` (`apps/backend/src/services/websocket.ts`).
2. Clients connect to `/ws`; optional `verifyClient` uses `validateWebSocketAuth` when auth is enabled.
3. `accountsService` events (`accounts_loaded`, `accounts_changed`, `rate_limits_updated`, etc.) and `quotaService` (`quotas_updated`), `languageServerService`, and proxy rate-limit notifier call `wsManager.broadcastNow` / typed helpers.
4. React uses `useWebSocket` (`apps/web/src/hooks/useWebSocket.ts`) when authenticated.

**Development vs production (web):**

1. **Dev:** Vite (`apps/web/vite.config.ts`) proxies `/api` → `http://localhost:3456` and `/ws` → `ws://localhost:3456`; UI runs on port 5173.
2. **Prod / `pnpm start`:** Express serves `apps/web/dist` from `../../web/dist` relative to backend dist (`server.ts` `express.static` and `sendFile` for SPA fallback).

**Quota polling pipeline:**

1. `quotaService.startPolling(getRawAccountsForQuota)` (`server.ts`) uses refresh tokens from the accounts file.
2. `QuotaService` (`apps/backend/src/services/quotaService.ts`) calls Google Cloud Code / Antigravity endpoints; emits `quotas_updated`.
3. `server.ts` listeners record snapshots via `monitor.recordQuotaSnapshot`, broadcast over WebSocket, and trigger file logging.

**API proxy (Claude/OpenAI clients):**

1. Client sends requests to `/v1/messages` or `/v1/chat/completions` (mounted via `proxyApiRouter` from `routes/proxy.ts`).
2. `ApiProxyService` (`apps/backend/src/services/apiProxy/`) uses token provider callbacks registered in `initializeProxyRoutes` (access token from `quotaService`, account lists from file + rotation logic).
3. `proxyLogger` logs through `monitor.logApiCall`; `rateLimitNotifier` updates accounts + WebSocket on 429-style limits.

**Electron:**

1. `electron/main.js` spawns `node` with `apps/backend/dist/server.js` (dev) or `resources/backend/server.js` (packaged), sets `DOTENV_CONFIG_PATH` for `.env`.
2. Window loads `http://localhost:5173` in dev or `apps/web/dist/index.html` in production.

**State Management:**

- **Server:** In-memory singleton service state + SQLite + JSON file; no separate app-tier cache beyond `QuotaService` token cache.
- **Client:** Zustand in `apps/web/src/stores/useDashboardStore.ts`; server truth for accounts/quota refreshed via REST + WebSocket.

## Key Abstractions

**UsageMonitor (`getMonitor`):**
- Purpose: SQLite access for API calls, session events, quota snapshots, burn rate, exports.
- Examples: `apps/backend/src/monitor.ts`
- Pattern: Single instance constructed in `server.ts` and passed implicitly via `getMonitor()` imports.

**AccountsFileService (`getAccountsService`):**
- Purpose: Watch `antigravity-accounts.json`, normalize accounts, rotation, rate-limit bookkeeping, emit events.
- Examples: `apps/backend/src/services/accountsFile.ts`
- Pattern: `EventEmitter` + chokidar watcher; `start()` / `stop()` tied to server lifecycle.

**WebSocketManager (`getWebSocketManager`):**
- Purpose: Fan-out batched messages, heartbeat, subscription filtering.
- Examples: `apps/backend/src/services/websocket.ts`
- Pattern: Class initialized with shared `http.Server`; exported singleton accessor.

**QuotaService (`getQuotaService`):**
- Purpose: Poll Google/Antigravity quota APIs, cache, token refresh.
- Examples: `apps/backend/src/services/quotaService.ts`
- Pattern: `EventEmitter`; polling interval configured from `server.ts` (e.g. 120000 ms).

**ApiProxyService:**
- Purpose: Translate OpenAI/Claude requests to Antigravity backend calls.
- Examples: `apps/backend/src/services/apiProxy/index.ts`, wired in `apps/backend/src/routes/proxy.ts`
- Pattern: Injected `TokenProvider` + optional loggers/notifiers from `initializeProxyRoutes`.

**LanguageServerService:**
- Purpose: Discover and talk to VS Code extension / language server for credits and snapshots.
- Examples: `apps/backend/src/services/languageServer/`
- Pattern: Async connect + polling; events forwarded to WebSocket from `server.ts`.

## Entry Points

**Backend process (primary):**
- Location: `apps/backend/src/server.ts` (compiled to `apps/backend/dist/server.js`; `package.json` `"start": "node dist/server.js"`).
- Triggers: `pnpm start`, `apps/backend` dev script, Electron `spawn` in `electron/main.js`.
- Responsibilities: Load `.env`, build Express app, mount routers and static files, attach WebSocket, start services (polling, watchers, manager log sync), listen on `DASHBOARD_PORT` (default 3456).

**Backend package export / optional CLI run:**
- Location: `apps/backend/src/index.ts`
- Triggers: Import from other packages; or `node` with `index` as main when executed directly.
- Responsibilities: Re-export `app`, `server`, `monitor`, services; delegates to `./server` when run as main.

**Web SPA:**
- Location: `apps/web/src/main.tsx` → `apps/web/src/App.tsx`
- Triggers: Browser or Electron `loadURL` / `loadFile`.
- Responsibilities: Theme, auth gate, `useWebSocket`, page routing between dashboard tabs, `fetch` to `/api/accounts/local` and related hooks.

**Electron shell:**
- Location: `electron/main.js`, preload `electron/preload.js`
- Triggers: `pnpm electron:dev` / `electron:preview` / packaged app (`package.json` `main`: `electron/main.js`).
- Responsibilities: Start backend child process, open `BrowserWindow`, load Vite dev or built `apps/web/dist`.

## Error Handling

**Strategy:** Try/catch inside route handlers returning `{ success: false, error }`; global Express error middleware for thrown errors; `process.on('uncaughtException' / 'unhandledRejection')` log via `fileLogger`.

**Patterns:**
- Most `/api` routes use `try/catch` and `res.status(500).json(...)`.
- `app.use((err, req, res, _next) => ...)` at end of `server.ts` for unhandled errors.
- WebSocket parse errors logged in `websocket.ts`; connection failures use `verifyClient` callback.

## Cross-Cutting Concerns

**Logging:**
- `apps/backend/src/services/fileLogger.ts` for structured logs; `console` for server lifecycle; proxy logs integrated into monitor via `proxyLogger` object in `server.ts`.

**Validation:**
- Request bodies parsed as JSON (`express.json`); individual routes validate shape inline; no shared Zod layer in backend.

**Authentication:**
- Optional dashboard auth: `apps/backend/src/utils/authMiddleware.ts` (`requireAuth`, `isAuthEnabled`, `validateWebSocketAuth`); proxy API uses separate API key from `ApiProxyService` config (`routes/proxy.ts`).

**CORS / security:**
- `cors` with configurable `CORS_ORIGINS`; `helmet` CSP in `server.ts`; rate limit on `/api`.

---

*Architecture analysis: 2026-04-05*
*Update when major patterns change*
