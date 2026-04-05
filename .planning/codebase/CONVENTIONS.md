# Code Conventions

**Analysis Date:** 2026-04-05

## TypeScript

### Strict Mode
- **Backend** (`apps/backend/tsconfig.json`): `strict: true`, `target: ES2020`, `module: commonjs`, `moduleResolution: node`
- **Frontend** (`apps/web/tsconfig.json`): `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`, `jsx: react-jsx`, `module: ESNext`, `moduleResolution: bundler`
- Both workspaces use TypeScript ^5.3.3

### Type Patterns
- **Barrel exports**: All types exported from `index.ts` barrel files:
  - `apps/backend/src/types/index.ts` (422 lines) — backend types
  - `apps/web/src/types/index.ts` (419 lines) — frontend types
- **Types are manually duplicated** between backend and frontend. There is no shared package. Key duplicated types: `AccountStatus`, `RateLimitInfo`, `SubscriptionTier`, `ModelQuotaDisplay`, `LocalAccount`, `DashboardStats`, `WSMessage`, `UserPreferences`, `Notification`, `ApiCall`, `SessionEvent`, `CombinedLogEntry`, `LogFilters`, `FamilyBurnRate`, `AccountBurnRate`, `TimelineSlice`, `QuotaWindowInfo`, `QuotaWindowStatus`, `LogLevel`, `LogCategory`, `FileLogEntry`, `LogFileInfo`, `AccurateBurnRate`, `AddAccountPayload`, `DashboardSummary`
- **`any` usage**: oxlint warns on `no-explicit-any` but does not error. `any` is used in several places:
  - `server.ts` — `error: any` in catch blocks (lines 223, 287, 305, etc.), `any` for API response data (line 248)
  - `monitor.ts` — `params: any[]` for dynamic SQL query params (line 305, 445), `details?: any` (line 130), `calls: any[]` (line 352)
  - `useDashboardStore.ts` — `any[]` for `usageAccounts`, `models`, `hourlyStats`, `recentCalls`, `managerData`
  - `websocket.ts` — `message: any` for client message handler (line 90)
- **`import()` type syntax**: Used for cross-module type references, e.g., `import('./types').QuotaWindowInfo` in `server.ts`

### Generics
- `ApiResponse<T>` defined in `apps/web/src/types/index.ts` (line 350) but usage is inconsistent — most endpoints return `{ success: boolean; data: any; error?: string }` directly instead of wrapping in `ApiResponse<T>`

## Naming

### File Naming
- **Backend**: `camelCase.ts` — `accountsFile.ts`, `quotaService.ts`, `authMiddleware.ts`, `retryHelper.ts`
- **Frontend**: `PascalCase.tsx` for components, `camelCase.ts` for hooks — `DashboardPage.tsx`, `useQuota.ts`, `useDashboardStore.ts`
- **No enforced filename case** in oxlint (`unicorn/filename-case: off`)

### Component Naming
- **Page components**: `{Name}Page.tsx` — `DashboardPage.tsx`, `AccountsPage.tsx`, `LogsPage.tsx`, `SettingsPage.tsx`
- **UI components**: Descriptive PascalCase — `QuotaPill.tsx`, `SubscriptionBadge.tsx`, `CreditsCard.tsx`, `UserInfoCard.tsx`, `QuotaWindowCard.tsx`, `TimeWindowCard.tsx`, `LastRefreshIndicator.tsx`, `TimelineVisualization.tsx`, `AuthPrompt.tsx`, `Navigation.tsx`, `OverviewTab.tsx`

### Hook Naming
- `use{Feature}.ts` — `useAuth.ts`, `useQuota.ts`, `useBurnRate.ts`, `useWebSocket.ts`, `useLogs.ts`, `useTimeline.ts`, `useQuotaWindow.ts`, `useLanguageServer.ts`

### Function Naming
- **Backend services**: `camelCase` — `getMonitor()`, `getAccountsService()`, `getWebSocketManager()`, `getQuotaService()`
- **Route handlers**: inline arrow functions in `server.ts`
- **Utility functions**: `camelCase` — `timingSafeCompare()`, `extractTokenFromHeader()`, `validateToken()`

### Variable Naming
- `camelCase` throughout
- Constants: `UPPER_SNAKE_CASE` — `OAUTH_REDIRECT_URI`, `OAUTH_SCOPES`, `AUTH_SESSION_TTL_MS`, `FIVE_HOURS_MS`
- Environment variables: `UPPER_SNAKE_CASE` — `DASHBOARD_PORT`, `DASHBOARD_SECRET`, `CORS_ORIGINS`, `GOOGLE_CLIENT_ID`

## Code Organization

### Import Ordering (Backend)
Observed pattern in `server.ts`:
1. **dotenv** first (side-effect import for env loading)
2. **Node built-ins** (`path`, `fs`, `http`, `crypto`, `url`)
3. **Third-party packages** (`express`, `cors`, `helmet`, `express-rate-limit`)
4. **Local services** (`./monitor`, `./services/*`)
5. **Local types** (`./types`)
6. **Local routes** (`./routes/proxy`)
7. **Local utils** (`./utils/authMiddleware`, `./utils/appPaths`)

### Import Ordering (Frontend)
Observed pattern in `App.tsx`:
1. **React** (`react`)
2. **Zustand store** (`./stores/useDashboardStore`)
3. **Custom hooks** (`./hooks/*`)
4. **Third-party UI** (`lucide-react`)
5. **Local components** (`./components/*`)
6. **Local types** (`./types`)

### Path Aliases
- **Frontend only**: `@/*` → `./src/*` (defined in `tsconfig.json` and `vite.config.ts`)
- **Backend**: No path aliases, uses relative imports

### Module Boundaries
- **Backend**: All routes defined in `server.ts` (2000+ lines). No separate route files except `routes/proxy.ts`
- **Frontend**: Components organized by page in `components/`, data fetching in `hooks/`, state in `stores/`
- **Services**: Each domain has its own file in `services/` — `quotaService.ts`, `accountsFile.ts`, `websocket.ts`, `fileLogger.ts`, `tierDetection.ts`, `quotaStrategy.ts`

### Singleton Pattern
All backend services use the `getXxxService()` factory pattern:
```typescript
// apps/backend/src/monitor.ts (line 754-761)
let monitorInstance: UsageMonitor | null = null;
export function getMonitor(): UsageMonitor {
  if (!monitorInstance) {
    monitorInstance = new UsageMonitor();
  }
  return monitorInstance;
}
```
Same pattern used in: `websocket.ts`, `accountsFile.ts`, `quotaService.ts`, `languageServerService.ts`, `fileLogger.ts`, `quotaStrategy.ts`

## Error Handling

### Backend Error Pattern
Every route in `server.ts` follows the same try/catch pattern:
```typescript
app.get('/api/endpoint', (req, res) => {
  try {
    // ... logic
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Response Format
- **Success**: `{ success: true, data: T }`
- **Error**: `{ success: false, error: string }`
- **400 errors**: Used for validation failures (missing fields, invalid input)
- **500 errors**: Used for unexpected errors (catch blocks)
- **401/403**: Authentication failures in `authMiddleware.ts`

### Frontend Error Pattern
Hooks use `useState<string | null>` for error state:
```typescript
// apps/web/src/hooks/useQuota.ts (line 16)
const [error, setError] = useState<string | null>(null);
// ...
setError(err instanceof Error ? err.message : 'Network error');
```

### SQL Error Handling
- No try/catch around raw SQL queries in `monitor.ts` — errors propagate to route handlers
- Parameterized queries used throughout (no string interpolation)

## Logging

### Backend Logging
- **Primary**: `console.log()` and `console.error()` with bracket-prefixed tags
  - `[Server]`, `[OAuth]`, `[Proxy]`, `[WebSocketManager]`, `[LS Detect]`
- **File logging**: `apps/backend/src/services/fileLogger.ts` — structured JSON logs with 7-day retention
  - Log levels: `DEBUG`, `INFO`, `WARN`, `ERROR`
  - Categories: `quota`, `api`, `auth`, `system`, `websocket`, `accounts`
  - Format: `{ ts: number; level: LogLevel; cat: LogCategory; msg: string; data?: Record<string, any> }`
  - Files named: `YYYY-MM-DD.log`
- **oxlint config**: `no-console: off` — console usage is permitted

### Frontend Logging
- `console.error()` for fetch failures (e.g., `App.tsx` line 70)
- No structured logging framework on frontend

## Component Patterns

### React Components
- **Functional components only** — no class components
- **Named function exports** for pages: `export function DashboardPage()`
- **Default exports** for main App: `export default App`
- **Props**: Typed inline or via interface, destructured in function signature
- **No CSS modules or styled-components** — Tailwind CSS exclusively

### State Management
- **Zustand** with `persist` middleware for localStorage persistence
- Single store: `apps/web/src/stores/useDashboardStore.ts`
- Persisted keys: `preferences`, `currentPage`, `accountFilter`, `notifications` (unread only, max 10)
- Selectors defined as methods on the store (`getActiveAccount()`, `getFilteredAccounts()`)

### Custom Hooks Pattern
```typescript
// apps/web/src/hooks/useQuota.ts
export function useQuota(pollingMs: number = 120000): UseQuotaResult {
  const [quotas, setQuotas] = useState<AccountQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ... fetch logic with useCallback
  // ... polling with useEffect + setInterval
  return { quotas, loading, error, cacheAge, lastRefresh, refresh };
}
```
- All data fetching through hooks, never direct `fetch` in components
- Hooks return typed result objects
- Polling intervals configurable via parameters

## API Conventions

### Route Naming
- **RESTful pattern**: `/api/accounts`, `/api/accounts/:email`, `/api/stats`, `/api/models`
- **Action suffixes**: `/api/accounts/quota/refresh`, `/api/accounts/quota/clear-cache`, `/api/accounts/switch/:email`
- **Query parameters**: `?format=table`, `?email=`, `?hours=24`, `?limit=100`, `?offset=0`

### Route Organization
- All routes defined inline in `server.ts` (2000+ lines)
- Proxy routes extracted to `apps/backend/src/routes/proxy.ts`
- Rate limiting applied globally to `/api` prefix
- Auth middleware applied to `/api` prefix

### WebSocket
- Path: `/ws`
- Message format: `{ type: WSMessageType; data: any; timestamp: number; seq?: number }`
- Message types: `initial`, `accounts_update`, `rate_limit_change`, `stats_update`, `new_call`, `heartbeat`, `config_update`

## Environment & Config

### Environment Variables
- Loaded from project root `.env` via `dotenv.config({ path: resolve(__dirname, '../../..', '.env') })` in `server.ts`
- **Critical vars**: `DASHBOARD_PORT`, `DASHBOARD_SECRET`, `CORS_ORIGINS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MANAGER_URL`, `PROXY_API_KEY`, `PROXY_ENABLED`, `API_RATE_LIMIT`, `NODE_ENV`, `DEV_MODE`
- **`.env.example`** exists with placeholder credentials (do not modify — tokens are bound to client ID)

### Config Files
- **Backend**: `tsconfig.json` (ES2020, commonjs, strict)
- **Frontend**: `tsconfig.json` (ES2020, ESNext, strict), `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`
- **Linting**: `.oxlintrc.json` (oxlint v1.39.0)
- **Root**: `package.json` with npm workspaces

## Anti-Patterns

| Pattern | Why Forbidden |
|---------|---------------|
| Change OAuth credentials | Tokens cryptographically bound to plugin's client ID |
| Export refresh tokens | Security — `/api/accounts/export` strips them |
| `as any` / `@ts-ignore` | Strict mode enforced (oxlint warns) |
| CSS modules | Tailwind only |
| Direct fetch in components | Use hooks (`useQuota`, `useBurnRate`, etc.) |
| Add routes outside `server.ts` | All routes centralized |
| Direct SQLite access outside `monitor.ts` | Database layer isolated |
| Import `.env` in service files | `server.ts` handles env loading |
| Modify types without syncing to backend | Types duplicated between workspaces |

## Linting (oxlint)

- **Tool**: oxlint v1.39.0 (Rust-based, fast)
- **Config**: `.oxlintrc.json`
- **Plugins**: `typescript`, `import`, `unicorn`, `promise`
- **Categories**: `correctness: error`, `suspicious: warn`, `perf: warn`, others off
- **Key rules**:
  - `no-debugger: error`
  - `no-empty: warn`
  - `no-unused-vars: warn`
  - `typescript/no-explicit-any: warn`
  - `no-console: off` (console allowed)
  - `unicorn/filename-case: off` (no filename case enforcement)
- **Commands**: `pnpm run lint`, `pnpm run lint:fix`
- **Ignored**: `dist`, `node_modules`, `*.min.js`, `coverage`, `tasks`

---

*Convention analysis: 2026-04-05*
