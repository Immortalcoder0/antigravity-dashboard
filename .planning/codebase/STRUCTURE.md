# Project Structure

**Analysis Date:** 2026-04-05

## Directory Tree

```
antigravity-dashboard/
├── package.json              # Root workspace manifest, scripts, dev deps
├── pnpm-workspace.yaml       # npm workspaces config (apps/*)
├── pnpm-lock.yaml            # Lockfile
├── .oxlintrc.json            # oxlint (Rust-based linter) config
├── .env                      # Environment variables (secrets - never commit)
├── .env.example              # OAuth credential template
├── .nvmrc                    # Node.js version pin
├── .npmrc                    # npm registry config
├── AGENTS.md                 # Project-level instructions for AI agents
├── CONTRIBUTING.md           # Contribution guidelines
├── MIGRATION.md              # Migration notes
├── SECURITY.md               # Security policy
├── quickstart.sh             # Quick setup script
├── README.md                 # Project documentation
│
├── apps/
│   ├── backend/              # @antigravity/backend - Express server
│   │   ├── package.json      # Backend deps (express, better-sqlite3, ws, etc.)
│   │   ├── tsconfig.json     # TypeScript config
│   │   └── src/
│   │       ├── index.ts      # Package exports + optional direct run
│   │       ├── server.ts     # ~2000+ lines: ALL routes, middleware, boot
│   │       ├── monitor.ts    # SQLite operations, burn rate, snapshots
│   │       ├── interceptor.ts# Plugin interceptor for API call monitoring
│   │       ├── types/
│   │       │   └── index.ts  # Shared TypeScript interfaces (422 lines)
│   │       ├── services/
│   │       │   ├── accountsFile.ts    # File watcher + CRUD + rotation
│   │       │   ├── quotaService.ts    # Google Cloud PA API polling
│   │       │   ├── websocket.ts       # WebSocket server manager
│   │       │   ├── tierDetection.ts   # FREE/PRO detection from reset patterns
│   │       │   ├── quotaStrategy.ts   # Model grouping from JSON config
│   │       │   ├── fileLogger.ts      # JSON file logging with rotation
│   │       │   ├── apiProxy/          # Claude/OpenAI → Antigravity proxy
│   │       │   │   ├── index.ts       # ApiProxyService main class
│   │       │   │   ├── client.ts      # AntigravityClient HTTP wrapper
│   │       │   │   ├── converter.ts   # Request/response format conversion
│   │       │   │   ├── streaming.ts   # SSE streaming utilities
│   │       │   │   └── types.ts       # Proxy request/response interfaces
│   │       │   └── languageServer/    # VS Code extension bridge
│   │       │       ├── index.ts       # Barrel exports
│   │       │       ├── languageServerService.ts  # Main LS service
│   │       │       ├── detect.ts      # Port discovery via /proc
│   │       │       ├── httpClient.ts  # gRPC-Web HTTP client
│   │       │       ├── types.ts       # LS data interfaces
│   │       │       └── platforms/
│   │       │           ├── index.ts   # Platform detection
│   │       │           └── linux.ts   # Linux /proc scanning strategy
│   │       ├── routes/
│   │       │   └── proxy.ts  # Proxy route handlers (159 lines)
│   │       ├── utils/
│   │       │   ├── index.ts  # Barrel: re-exports errorHelpers
│   │       │   ├── authMiddleware.ts  # Bearer token auth + WS auth
│   │       │   ├── configManager.ts   # Config file management
│   │       │   ├── appPaths.ts        # Platform-specific home dir resolution
│   │       │   ├── deepMerge.ts       # Deep object merge utility
│   │       │   ├── errorHelpers.ts    # Error handling utilities
│   │       │   ├── loginRateLimiter.ts# Login attempt rate limiting
│   │       │   ├── memoryManager.ts   # Memory management utilities
│   │       │   └── retryHelper.ts     # Retry logic helpers
│   │       └── config/
│   │           └── quotaStrategy.json# Model grouping configuration
│   │
│   └── web/                  # @antigravity/web - React dashboard
│       ├── package.json      # Frontend deps (react, zustand, tailwind, etc.)
│       ├── tsconfig.json     # TypeScript config
│       ├── vite.config.ts    # Vite build config
│       ├── tailwind.config.js# Tailwind CSS config + custom theme
│       ├── index.html        # HTML entry point
│       └── src/
│           ├── main.tsx      # React entry point (ReactDOM.createRoot)
│           ├── App.tsx       # Page router + header + navigation
│           ├── index.css     # Tailwind directives + CSS variables + custom styles
│           ├── vite-env.d.ts # Vite type declarations
│           ├── types/
│           │   └── index.ts  # Frontend TypeScript interfaces (419 lines)
│           ├── stores/
│           │   └── useDashboardStore.ts  # Zustand global state store
│           ├── hooks/
│           │   ├── useWebSocket.ts       # WS connection + message handling
│           │   ├── useQuota.ts           # Quota polling hook
│           │   ├── useBurnRate.ts        # Burn rate polling hook
│           │   ├── useAuth.ts            # Auth token management hook
│           │   ├── useLanguageServer.ts  # VS Code extension connection hook
│           │   ├── useQuotaWindow.ts     # 5-hour quota window hook
│           │   ├── useTimeline.ts        # Usage timeline data hook
│           │   └── useLogs.ts            # Log fetching hook
│           └── components/
│               ├── App.tsx               # (root component, rendered by main.tsx)
│               ├── DashboardPage.tsx     # Main dashboard view
│               ├── OverviewTab.tsx       # Account overview with sortable table
│               ├── AccountsPage.tsx      # Account management page
│               ├── LogsPage.tsx          # Log viewer page
│               ├── LogsDashboard.tsx     # Log dashboard component
│               ├── SettingsPage.tsx      # Settings/configuration page
│               ├── TimeWindowCard.tsx    # Timeline visualization card
│               ├── QuotaWindowCard.tsx   # 5-hour quota window card
│               ├── TimelineVisualization.tsx  # Per-account timeline chart
│               ├── CreditsCard.tsx       # AI credits display
│               ├── UserInfoCard.tsx      # User info from Language Server
│               ├── SubscriptionBadge.tsx # FREE/PRO/ULTRA badge
│               ├── QuotaPill.tsx         # Quota bar component
│               ├── Navigation.tsx        # Navigation component
│               ├── LastRefreshIndicator.tsx  # "Last refreshed X ago" indicator
│               └── AuthPrompt.tsx        # Login prompt when auth required
│
├── .planning/                # GSD planning artifacts
│   └── codebase/             # Codebase analysis documents (this directory)
│       ├── ARCHITECTURE.md   # System architecture
│       └── STRUCTURE.md      # This file
│
├── .opencode/                # OpenCode skills and configuration
│   └── skills/               # Specialized skill definitions
│
├── .beads/                   # Beads runtime data
├── .home/                    # Custom home directory (if used)
├── .ralph-tui/               # Ralph TUI configuration
├── tasks/                    # Task tracking files
└── tmp/                      # Temporary files
```

## Module Organization

### Backend (`apps/backend/`)

The backend is organized by **domain responsibility**:

```
src/
├── server.ts          # HTTP layer - all routes, middleware, boot sequence
├── monitor.ts         # Data layer - SQLite operations (sole DB access point)
├── interceptor.ts     # Plugin bridge - monitoring hooks for external plugin
├── services/          # Business logic layer
│   ├── quotaService.ts       # External API: Google Cloud PA
│   ├── accountsFile.ts       # File system: accounts.json watcher + CRUD
│   ├── websocket.ts          # Real-time: WebSocket server
│   ├── apiProxy/             # External API: Claude/OpenAI proxy
│   ├── languageServer/       # External API: VS Code extension bridge
│   ├── tierDetection.ts      # Domain logic: subscription tier inference
│   ├── quotaStrategy.ts      # Domain logic: model grouping
│   └── fileLogger.ts         # Cross-cutting: structured file logging
├── routes/            # Route handlers (proxy only - all others in server.ts)
│   └── proxy.ts       # Proxy-specific route management
├── utils/             # Shared utilities
│   ├── authMiddleware.ts  # Authentication (Bearer token)
│   └── ...                # Various helpers
├── types/             # TypeScript interfaces (backend canonical)
│   └── index.ts
└── config/            # Static configuration
    └── quotaStrategy.json  # Model grouping definitions
```

### Frontend (`apps/web/`)

The frontend is organized by **React concern**:

```
src/
├── main.tsx           # Boot: ReactDOM.createRoot
├── App.tsx            # Shell: header, nav, page router
├── index.css          # Styles: Tailwind + CSS vars + custom
├── types/             # TypeScript interfaces (manually synced with backend)
│   └── index.ts
├── stores/            # Global state
│   └── useDashboardStore.ts  # Zustand store
├── hooks/             # Data fetching hooks (one per data domain)
│   └── use*.ts
└── components/        # UI components (page-level + reusable)
    └── *.tsx
```

### Dependency Rules

**Backend:**
- `server.ts` imports from all services, utils, types
- Services import from `types/`, `utils/`, and external packages
- Services do NOT import from each other directly (communicate via events or through `server.ts`)
- `monitor.ts` is the ONLY file that imports `better-sqlite3`
- `routes/proxy.ts` imports from `services/apiProxy/` and `utils/authMiddleware`

**Frontend:**
- Components import from `stores/`, `hooks/`, `types/`
- Hooks import from `types/` and make `fetch` calls
- Store imports from `types/`
- No component imports another component directly (except page composites)
- No direct `fetch` in components - always through hooks

## Entry Points

### Backend Entry

**Primary:** `apps/backend/src/server.ts`

Boot sequence:
1. `dotenv.config()` loads `.env` from project root (line 5: `resolve(__dirname, '../../..', '.env')`)
2. Express app created with middleware chain (cors, helmet, json parser)
3. All singleton services instantiated (lines 77-83)
4. Proxy routes initialized with dependency injection (lines 147-203)
5. All REST routes defined inline
6. Static files served from `apps/web/dist/`
7. HTTP server created, WebSocket manager attached
8. Server listens on `DASHBOARD_PORT` (default 3456) or `process.env.DASHBOARD_PORT`

**Package entry:** `apps/backend/src/index.ts`
- Re-exports: `UsageMonitor`, `AntigravityInterceptor`, `app`, `server`, `monitor`, `accountsService`, `wsManager`
- Re-exports types: `ApiCall`, `AccountStats`, `ModelStats`, `RequestMetadata`
- If run directly (`require.main === module`), starts the server

### Frontend Entry

**Primary:** `apps/web/src/main.tsx`
```tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**App shell:** `apps/web/src/App.tsx`
- Sets up Zustand store, WebSocket, quota/burn-rate hooks
- Renders header with navigation
- Conditionally renders one of four pages: `DashboardPage`, `AccountsPage`, `LogsPage`, `SettingsPage`
- Handles auth flow (shows `AuthPrompt` if `DASHBOARD_SECRET` is set)

## Type System

### Dual Type Definitions

Types are **manually duplicated** between backend and frontend:

| Backend | Frontend | Notes |
|---------|----------|-------|
| `apps/backend/src/types/index.ts` (422 lines) | `apps/web/src/types/index.ts` (419 lines) | Manually synced |

**Shared types** (exist in both):
- `LocalAccount`, `AccountStatus`, `RateLimitInfo`
- `SubscriptionTier`, `ModelQuotaDisplay`
- `DashboardStats`, `AccountDiff`
- `WSMessageType`, `WSMessage`
- `UserPreferences`, `Notification`
- `ApiCall`, `SessionEvent`, `CombinedLogEntry`, `LogFilters`
- `FamilyBurnRate`, `AccountBurnRate`, `TimelineSlice`
- `QuotaWindowInfo`, `QuotaWindowStatus`
- `LogLevel`, `LogCategory`, `FileLogEntry`, `LogFileInfo`
- `AccurateBurnRate`, `AddAccountPayload`, `DashboardSummary`

**Backend-only types:**
- `RawAccountData`, `RawAccountsFile` (accounts file structure)
- `AccountStats`, `ModelStats` (database query results)
- `RotationStrategy`, `RotationConfig`, `RotationResult`, `RotationStats`
- `BestAccountRecommendation`
- `QuotaSnapshot`

**Frontend-only types:**
- `PageType` ('dashboard' | 'accounts' | 'logs' | 'settings')
- `AccountFilterType` ('all' | 'available' | 'low_quota' | 'PRO' | 'ULTRA' | 'FREE')
- `ModelQuotaInfo`, `AccountQuota` (quota service response shape)
- `PromptCreditsInfo`, `FlowCreditsInfo`, `TokenUsageInfo`, `UserInfo`
- `LanguageServerStatus`, `LSModelQuotaInfo`
- `RunwayPrediction`
- `ApiResponse<T>` (generic wrapper)

### Type Syncing Strategy

Types are manually kept in sync. When a type changes in `apps/backend/src/types/index.ts`, the corresponding type in `apps/web/src/types/index.ts` must be updated manually. There is no automated type sharing or monorepo type package.

## Cross-Cutting Concerns

### Error Handling

**Backend:**
- All route handlers use `try/catch` blocks
- Errors returned as `{ success: false, error: message }` JSON
- HTTP status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error), 503 (service unavailable)
- `errorHelpers.ts` provides shared error utilities
- `ApiError` class in `apiProxy/client.ts` for proxy-specific errors with status codes

**Frontend:**
- Hooks manage `error` state (`string | null`)
- Components display errors inline
- No global error boundary - errors caught at hook level

### Logging

**Three-tier logging:**

1. **Console logging** - `console.log`, `console.error`, `console.warn` throughout backend services
2. **File logging** - `FileLogger` class (`services/fileLogger.ts`) writes JSON lines to `~/.config/opencode/antigravity-dashboard/logs/YYYY-MM-DD.log`
   - Daily rotation
   - 7-day retention (configurable)
   - Categories: `quota`, `api`, `auth`, `system`, `websocket`, `accounts`
   - Levels: `DEBUG`, `INFO`, `WARN`, `ERROR`
3. **Database logging** - `UsageMonitor` stores API calls and session events in SQLite

### Authentication

**Two auth systems:**

1. **Dashboard auth** (`utils/authMiddleware.ts`):
   - `DASHBOARD_SECRET` env var enables Bearer token auth
   - Applied to `/api/*` routes via `requireAuth` middleware
   - WebSocket auth via `?token=` query parameter
   - Timing-safe token comparison

2. **Proxy API key auth** (`routes/proxy.ts`):
   - `PROXY_API_KEY` env var (or auto-generated Anthropic-style key)
   - Applied to `/v1/*` routes
   - Separate from dashboard auth

### Configuration

**Environment variables** (loaded from root `.env`):
- `DASHBOARD_PORT` - Server port (default: 3456)
- `DASHBOARD_SECRET` - Auth token (optional)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `PROXY_API_KEY` / `PROXY_ENABLED` - Proxy configuration
- `CORS_ORIGINS` - Comma-separated allowed origins
- `API_RATE_LIMIT` - Requests per minute (default: 100)
- `MANAGER_URL` - External manager service URL (default: localhost:8080)

**Static config:**
- `apps/backend/src/config/quotaStrategy.json` - Model group definitions

### Data Persistence

| Data | Storage | Location |
|------|---------|----------|
| API call logs | SQLite | `~/.config/opencode/antigravity-dashboard/usage.db` |
| Session events | SQLite | Same DB |
| Quota snapshots | SQLite | Same DB |
| Account status | SQLite | Same DB |
| Account data | JSON file | `~/.config/opencode/antigravity-accounts.json` |
| File logs | JSON files | `~/.config/opencode/antigravity-dashboard/logs/` |
| User preferences | localStorage | Browser (via Zustand persist) |
| Auth token | sessionStorage | Browser |

## Key Files

### Most Important Backend Files

| File | Lines | Role |
|------|-------|------|
| `apps/backend/src/server.ts` | ~2000+ | All HTTP routes, middleware, boot sequence, OAuth flow |
| `apps/backend/src/monitor.ts` | 761 | All SQLite operations, burn rate, quota snapshots |
| `apps/backend/src/services/accountsFile.ts` | 816 | File watcher, account CRUD, rotation strategies |
| `apps/backend/src/services/quotaService.ts` | 542 | Google Cloud PA API polling, token refresh, retry logic |
| `apps/backend/src/services/apiProxy/index.ts` | 745 | Claude/OpenAI → Antigravity proxy, streaming |
| `apps/backend/src/services/websocket.ts` | 255 | WebSocket server with batching and heartbeat |
| `apps/backend/src/services/fileLogger.ts` | 252 | Structured file logging with rotation |
| `apps/backend/src/services/tierDetection.ts` | 218 | FREE/PRO tier detection from reset patterns |
| `apps/backend/src/services/quotaStrategy.ts` | 215 | Model grouping from JSON config |
| `apps/backend/src/routes/proxy.ts` | 159 | Proxy route handlers and management endpoints |
| `apps/backend/src/types/index.ts` | 422 | Canonical TypeScript interfaces |
| `apps/backend/src/utils/authMiddleware.ts` | 86 | Bearer token authentication |

### Most Important Frontend Files

| File | Lines | Role |
|------|-------|------|
| `apps/web/src/App.tsx` | 196 | App shell, page routing, header, navigation |
| `apps/web/src/stores/useDashboardStore.ts` | 275 | Zustand global state store |
| `apps/web/src/components/DashboardPage.tsx` | 473 | Main dashboard view with stats cards |
| `apps/web/src/components/OverviewTab.tsx` | 377 | Sortable account table with expandable rows |
| `apps/web/src/hooks/useWebSocket.ts` | 190 | WebSocket connection with reconnection logic |
| `apps/web/src/types/index.ts` | 419 | Frontend TypeScript interfaces |
| `apps/web/src/hooks/useQuota.ts` | 97 | Quota data fetching hook |
| `apps/web/src/hooks/useAuth.ts` | 77 | Authentication hook |

## Where to Add New Code

### New API Endpoint
- **Location:** `apps/backend/src/server.ts` (add route inline with existing patterns)
- **Pattern:** `app.get('/api/...', (req, res) => { try { ... } catch (error: any) { res.status(500).json(...) } })`
- **If proxy-related:** Add to `apps/backend/src/routes/proxy.ts`

### New Service
- **Location:** `apps/backend/src/services/` + export from `apps/backend/src/index.ts`
- **Pattern:** Class with singleton `getXxxService()` factory, extend `EventEmitter` for state changes

### New UI Page
- **Location:** `apps/web/src/components/NewPage.tsx`
- **Registration:** Add to `navItems` array and page router in `apps/web/src/App.tsx`
- **Type:** Add to `PageType` union in `apps/web/src/types/index.ts`

### New Data Hook
- **Location:** `apps/web/src/hooks/useNewData.ts`
- **Pattern:** `useState` + `useEffect` with `setInterval` for polling, returns `{ data, loading, error, refresh }`

### New Reusable Component
- **Location:** `apps/web/src/components/ComponentName.tsx`
- **Pattern:** Functional component with props interface, Tailwind classes only

### New Type
- **Location:** Both `apps/backend/src/types/index.ts` AND `apps/web/src/types/index.ts` (manually sync)

### New Utility
- **Location:** `apps/backend/src/utils/utilityName.ts` + export from `apps/backend/src/utils/index.ts`

## Special Directories

**`.opencode/skills/`** - OpenCode skill definitions for AI agent workflows (not part of the application)

**`.beads/`** - Beads runtime data (not part of the application)

**`.ralph-tui/`** - Ralph TUI configuration (not part of the application)

**`tasks/`** - Task tracking files for GSD workflow

**`tmp/`** - Temporary files, not committed

**`node_modules/`** - Installed dependencies (pnpm workspaces, hoisted to root)

---

*Structure analysis: 2026-04-05*
