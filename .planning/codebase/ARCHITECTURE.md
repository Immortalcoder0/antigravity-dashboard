# Architecture

**Analysis Date:** 2026-04-05

## System Overview

The antigravity-dashboard is a **client-server monorepo** built with npm workspaces. It provides a real-time monitoring dashboard for multi-account Google Cloud API quotas, with an integrated Claude/OpenAI-compatible API proxy.

```
┌─────────────────────────────────────────────────────┐
│                    Browser (SPA)                     │
│  React 18 + Tailwind CSS + Zustand + WebSocket      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP REST + WS
┌──────────────────────▼──────────────────────────────┐
│              Express Server (port 3456)              │
│                                                      │
│  ┌────────────┐  ┌───────────┐  ┌────────────────┐  │
│  │ Dashboard  │  │ API Proxy │  │  SPA Static    │  │
│  │ REST API   │  │ /v1/*     │  │  /apps/web/dist│  │
│  └─────┬──────┘  └─────┬─────┘  └────────────────┘  │
│        │               │                              │
│  ┌─────▼───────────────▼──────────────────────────┐  │
│  │              Service Layer                      │  │
│  │  quotaService │ accountsFile │ apiProxy │ LS    │  │
│  └─────┬───────────────────────┬──────────────────┘  │
│        │                       │                      │
│  ┌─────▼──────┐          ┌─────▼──────┐              │
│  │  SQLite    │          │  Google    │              │
│  │  usage.db  │          │  Cloud PA  │              │
│  └────────────┘          └────────────┘              │
└─────────────────────────────────────────────────────┘
```

## Backend Architecture

### Express App Structure

**Entry:** `apps/backend/src/server.ts` (~2000+ lines, monolithic route file)

The Express app follows a layered architecture:

1. **Middleware chain** (lines 44-75):
   - `cors()` - configurable origins, defaults to localhost
   - `helmet()` - CSP headers with `'unsafe-inline'` for scripts/styles
   - `express.json({ limit: '50mb' })` - large payload support
   - `express-rate-limit` - 100 req/min on `/api` routes
   - `requireAuth` middleware - Bearer token auth (conditional on `DASHBOARD_SECRET`)
   - Static file serving from `apps/web/dist/`

2. **Service initialization** (lines 77-83):
   - All services use the `getXxxService()` singleton factory pattern
   - Services are instantiated at module load time in `server.ts`
   - `QuotaService` (120s polling), `LanguageServerService` (90s polling), `WebSocketManager`, `AccountsFileService`, `FileLogger` (7-day retention)

3. **Route organization** - All routes defined inline in `server.ts`:
   - `/api/accounts/*` - Account CRUD, quota, stats
   - `/api/auth/google/*` - OAuth PKCE flow with local callback server (port 51121)
   - `/api/logs/*` - Combined logs, file logs, import
   - `/api/proxy/*` - Proxy management (dashboard auth)
   - `/v1/messages` - Claude API proxy (proxy API key auth)
   - `/v1/chat/completions` - OpenAI API proxy (proxy API key auth)
   - `/ws` - WebSocket endpoint

### Service Layer Design

All services follow consistent patterns:

**Singleton Factory Pattern:**
```typescript
// Every service has this pattern
let instance: ServiceClass | null = null;
export function getServiceClass(param?): ServiceClass {
  if (!instance) {
    instance = new ServiceClass(param);
  }
  return instance;
}
```

**Core Services:**

| Service | File | Purpose |
|---------|------|---------|
| `UsageMonitor` | `apps/backend/src/monitor.ts` | SQLite operations (better-sqlite3), burn rate calculation, quota snapshots, combined log queries |
| `QuotaService` | `apps/backend/src/services/quotaService.ts` | Google Cloud Code API polling, token refresh, quota caching, exponential backoff retry |
| `AccountsFileService` | `apps/backend/src/services/accountsFile.ts` | File watcher (chokidar) on `~/.config/opencode/antigravity-accounts.json`, CRUD, rate limit tracking, rotation strategies |
| `WebSocketManager` | `apps/backend/src/services/websocket.ts` | WebSocket server with batching (100ms), heartbeat (30s), subscription filtering |
| `ApiProxyService` | `apps/backend/src/services/apiProxy/index.ts` | Claude/OpenAI → Antigravity protocol conversion, SSE streaming, account selection |
| `LanguageServerService` | `apps/backend/src/services/languageServer/languageServerService.ts` | VS Code extension bridge via gRPC-Web, /proc scanning (Linux-only) |
| `QuotaStrategyManager` | `apps/backend/src/services/quotaStrategy.ts` | Model grouping from `config/quotaStrategy.json`, display name resolution |
| `FileLogger` | `apps/backend/src/services/fileLogger.ts` | JSON file logging with daily rotation, 7-day retention |
| `TierDetection` | `apps/backend/src/services/tierDetection.ts` | FREE/PRO detection from reset time patterns (hourly=PRO, daily=FREE) |

### Database Layer

**File:** `apps/backend/src/monitor.ts`

Single `UsageMonitor` class encapsulates all SQLite access via `better-sqlite3`. Tables:

- `api_calls` - Logged API requests with tokens, duration, status, source (internal/proxy/manager)
- `session_events` - Account rotations, session recoveries, quota warnings
- `account_status` - Rate limit state per account
- `quota_snapshots` - Time-series quota percentages for accurate burn rate calculation

**Key pattern:** No other file accesses SQLite directly. All queries go through `UsageMonitor` methods.

### Authentication

**File:** `apps/backend/src/utils/authMiddleware.ts`

- **Token-based auth:** `DASHBOARD_SECRET` env var enables Bearer token authentication
- **Timing-safe comparison:** Uses `crypto.timingSafeEqual` to prevent timing attacks
- **WebSocket auth:** Token passed as query parameter (`/ws?token=...`)
- **Conditional:** When `DASHBOARD_SECRET` is not set, auth is disabled and server binds to `127.0.0.1`
- **Proxy API key auth:** Separate `PROXY_API_KEY` for `/v1/*` routes (Anthropic-style key format)

## Frontend Architecture

### Component Hierarchy

**Entry:** `apps/web/src/main.tsx` → `apps/web/src/App.tsx`

```
App.tsx
├── Header (sticky, with nav)
│   ├── Brand (Antigravity logo)
│   ├── LastRefreshIndicator (quota + usage)
│   ├── WS connection status
│   ├── Theme toggle
│   └── Refresh button
├── Navigation (Dashboard, Accounts, Logs, Settings)
└── Page Router (conditional render)
    ├── DashboardPage
    │   ├── StatsCard (fleet stats grid)
    │   ├── IDE Account Card (from Language Server)
    │   ├── TimeWindowCard (timeline visualization)
    │   ├── QuotaWindowCard (5-hour window)
    │   ├── CurrentAccountCard
    │   └── BestAccountsCard
    ├── AccountsPage
    │   ├── OverviewTab
    │   │   ├── UserInfoCard
    │   │   ├── CreditsCard
    │   │   ├── StatsCard grid
    │   │   └── AccountRow (expandable)
    │   │       └── TimelineVisualization
    │   └── SettingsPage
    ├── LogsPage
    │   └── LogsDashboard
    └── SettingsPage
```

### Data Fetching Patterns

**Custom hooks** (`apps/web/src/hooks/`) encapsulate all API communication:

| Hook | File | Purpose | Polling Interval |
|------|------|---------|-----------------|
| `useWebSocket` | `hooks/useWebSocket.ts` | WS connection, message handling, reconnection with exponential backoff | N/A (event-driven) |
| `useQuota` | `hooks/useQuota.ts` | Quota fetching from `/api/accounts/quota` | 120s |
| `useBurnRate` | `hooks/useBurnRate.ts` | Burn rate from `/api/accounts/burn-rate-accurate` | 60s |
| `useAuth` | `hooks/useAuth.ts` | Bearer token management, sessionStorage persistence | N/A |
| `useLanguageServer` | `hooks/useLanguageServer.ts` | VS Code extension connection status, credits | 30s |
| `useQuotaWindow` | `hooks/useQuotaWindow.ts` | 5-hour quota window status | 30s |
| `useTimeline` | `hooks/useTimeline.ts` | Hourly usage timeline data | N/A |
| `useLogs` | `hooks/useLogs.ts` | Combined log fetching with pagination | N/A |

**Pattern:** Hooks manage their own `useState` + `useEffect` polling loops. Components call hooks and consume results. No React Query or SWR - plain `fetch` with `setInterval`.

### State Management

**File:** `apps/web/src/stores/useDashboardStore.ts`

**Zustand store** with `persist` middleware (localStorage):

- **Persisted keys:** `preferences`, `currentPage`, `accountFilter`, unread `notifications`
- **Non-persisted:** `localAccounts`, `usageAccounts`, `models`, `hourlyStats`, `recentCalls`
- **Computed selectors:** `getFilteredAccounts()` applies filter + search to `localAccounts`
- **Account selection:** `selectedAccounts[]` for bulk actions
- **Filter/Search:** `accountFilter` (all/available/low_quota/PRO/ULTRA/FREE) + `accountSearch`

**Store update flow:**
1. WebSocket messages trigger store setters (`setLocalAccounts`, `setAccountsStats`)
2. Hook polling results update store state
3. Components read from store via `useDashboardStore()` selector

## Real-time Architecture

### WebSocket Server

**File:** `apps/backend/src/services/websocket.ts`

**Connection lifecycle:**
1. Client connects to `/ws` (with optional `?token=` auth)
2. Server creates `ClientInfo` with default subscriptions: `initial`, `accounts_update`, `rate_limit_change`, `stats_update`, `heartbeat`
3. Client can `subscribe`/`unsubscribe` to specific event types
4. Heartbeat every 30s with ping/pong liveness check (60s timeout)

**Message batching:**
- Messages queued with 100ms flush interval
- Single message → immediate broadcast
- Multiple messages → batched into `stats_update` with `seq` number

**Event types:**
- `initial` - Full state on connect (accounts + stats)
- `accounts_update` - Account diffs (add/update/remove)
- `rate_limit_change` - Rate limit status changes
- `stats_update` - Dashboard statistics updates
- `heartbeat` - Keepalive
- `new_call` - New API call logged (from interceptor)
- `config_update` - Configuration changes

### WebSocket Client

**File:** `apps/web/src/hooks/useWebSocket.ts`

- Auto-connects on mount with `isAuthenticated` guard
- Reconnection with exponential backoff: `3s * 1.5^attempts`, max 30s, 10 attempts
- Debounced account diff handling (50ms) to batch rapid updates
- Token passed as query parameter for auth

## API Proxy Architecture

### Request Transformation Pipeline

**Files:** `apps/backend/src/services/apiProxy/`

```
Client Request (Claude/OpenAI format)
         │
         ▼
┌─────────────────────┐
│  proxy.ts routes    │  ← API key validation
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  ApiProxyService    │  ← Account selection, token context
│  (index.ts)         │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  converter.ts       │  ← Format conversion + protocol signatures
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  AntigravityClient  │  ← HTTP call to Google Cloud PA
│  (client.ts)        │     with retry logic
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  streaming.ts       │  ← SSE formatting back to client
└─────────────────────┘
```

**Key conversion steps:**
1. **Model mapping:** `mapModel()` converts client model names to Google Cloud PA model IDs
2. **Protocol signatures:** Base64 `thought` signatures injected for Antigravity API compatibility
3. **Tool name mapping:** `getOriginalToolName()` / `sanitizeToolName()` for tool call translation
4. **Account selection:** Uses active account set by VS Code extension (passthrough mode)
5. **SSE streaming:** Converts Google Cloud PA streaming events to Claude SSE or OpenAI SSE format
6. **Heartbeat:** 30s keepalive during long streaming responses

**Two routers:**
- `proxyApiRouter` (`/v1/*`) - Protected by proxy API key
- `proxyManagementRouter` (`/api/proxy/*`) - Protected by dashboard auth

## Data Flow

### Quota Fetching Flow

```
1. QuotaService.startPolling() (every 120s)
   └─→ getAccounts() → for each account:
       └─→ refreshAccessToken(refreshToken) → Google OAuth
       └─→ fetchAvailableModels(accessToken) → Google Cloud PA API
       └─→ parseQuotaResponse() → AccountQuota
       └─→ cache.accounts.set(email, result)
       └─→ emit('quotas_updated', results)

2. Frontend: useQuota() polls /api/accounts/quota
   └─→ quotaService.getCachedQuotas() → return cached data
   └─→ If cache stale → force refresh

3. WebSocket: quota changes → broadcast to clients
```

### Account Change Flow

```
1. AccountsFileService watches antigravity-accounts.json (chokidar)
   └─→ File changes → loadAccountsFile()
   └─→ processAccounts() → LocalAccount[]
   └─→ calculateDiffs() → AccountDiff[]
   └─→ emit('accounts_changed', diffs)

2. server.ts listens to events → wsManager.broadcast()
   └─→ WebSocketManager queues message (100ms batch)
   └─→ flushQueue() → broadcast to all connected clients

3. Frontend: useWebSocket() receives message
   └─→ handleAccountsUpdate(diff) (debounced 50ms)
   └─→ setLocalAccounts(updatedAccounts) → Zustand store
   └─→ Components re-render
```

### API Proxy Call Flow

```
1. Client POST /v1/messages (Claude format)
   └─→ validateApiKey() → proxy API key check
   └─→ getTokenContext() → select account + refresh token
   └─→ generateClaudeRequestBody() → convert to Antigravity format
   └─→ AntigravityClient.generateStream() → Google Cloud PA
   └─→ StreamCallback → formatClaudeSSE() → client
   └─→ logProxyRequest() → monitor.logApiCall() → SQLite
   └─→ wsManager.broadcastNow({ type: 'new_call' }) → frontend
```

## Design Patterns

### Singleton Services
Every backend service uses a module-level singleton with lazy initialization via `getXxxService()`. This ensures single instances across the Express app without dependency injection.

### EventEmitter Pattern
Services extend Node.js `EventEmitter` or implement their own event system:
- `QuotaService` → `emit('quotas_updated')`
- `AccountsFileService` → `emit('accounts_changed')`, `emit('rate_limit_cleared')`, `emit('rotation')`
- `WebSocketManager` → broadcasts to clients (not EventEmitter, but pub/sub)

### Repository Pattern
`UsageMonitor` in `monitor.ts` is the sole gateway to SQLite. No other file constructs SQL queries.

### Strategy Pattern
Account rotation in `AccountsFileService` supports 6 strategies: `round_robin`, `least_recently_used`, `highest_quota`, `random`, `weighted`, `sticky`. Each is a private method selected via `applyStrategy()`.

### Adapter Pattern
`ApiProxyService` adapts between Claude API format, OpenAI API format, and Google Cloud PA (Antigravity) format. The `converter.ts` module handles request/response transformation.

### Observer Pattern
File watcher (chokidar) on `antigravity-accounts.json` triggers reload and diff calculation, which broadcasts via WebSocket to all connected clients.

---

*Architecture analysis: 2026-04-05*
