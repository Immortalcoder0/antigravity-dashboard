# Technical Concerns

**Analysis Date:** 2026-04-05

## Critical Risks

### Monolithic Server File (2224 lines)
- **File:** `apps/backend/src/server.ts` (2224 lines)
- **Impact:** All API routes, OAuth flow, WebSocket initialization, static file serving, and server bootstrap code live in a single file. This makes it extremely difficult to navigate, test, and modify safely. Adding a new endpoint requires editing an already massive file.
- **Fix approach:** Extract routes into separate router modules (e.g., `routes/accounts.ts`, `routes/analytics.ts`, `routes/languageServer.ts`, `routes/oauth.ts`).

### Type Duplication Between Frontend and Backend
- **Files:** `apps/backend/src/types/index.ts` (422 lines), `apps/web/src/types/index.ts` (419 lines)
- **Impact:** Types are manually duplicated across both workspaces. Many interfaces are identical (`LocalAccount`, `AccountStatus`, `RateLimitInfo`, `DashboardStats`, `WSMessage`, `ApiCall`, `SessionEvent`, `CombinedLogEntry`, `LogFilters`, `FamilyBurnRate`, `AccountBurnRate`, `TimelineSlice`, `UserPreferences`, `DEFAULT_PREFERENCES`, `Notification`, `AddAccountPayload`, `DashboardSummary`, `QuotaWindowInfo`, `QuotaWindowStatus`, `LogLevel`, `LogCategory`, `FileLogEntry`, `LogFileInfo`, `AccurateBurnRate`). Any change to a shared type must be manually synced — if forgotten, runtime errors occur when the frontend consumes mismatched data shapes.
- **Fix approach:** Create a shared `packages/types` workspace that both apps import from.

### No Test Coverage
- **Impact:** Zero test files detected anywhere in the codebase. No Jest, Vitest, or any testing framework is configured. All changes are unverified — any regression in quota calculation, OAuth flow, or proxy routing would only be caught manually.
- **Fix approach:** Add Vitest (matches Vite stack) with unit tests for services and integration tests for API routes.

## Code Quality Issues

### Large Files
| File | Lines | Concern |
|------|-------|---------|
| `apps/backend/src/server.ts` | 2224 | All routes, OAuth, WS, bootstrap |
| `apps/backend/src/services/accountsFile.ts` | 816 | Account CRUD + rotation strategies |
| `apps/backend/src/services/apiProxy/converter.ts` | 718 | Protocol conversion logic |
| `apps/backend/src/services/apiProxy/index.ts` | 680 | Proxy router initialization |
| `apps/backend/src/monitor.ts` | 761 | All SQLite operations |
| `apps/web/src/components/AccountsPage.tsx` | 774 | Complex UI with table/list views |
| `apps/web/src/components/DashboardPage.tsx` | 440 | Main dashboard page |
| `apps/web/src/components/LogsPage.tsx` | 437 | Log viewer with filtering |

### Hardcoded Model Definitions
- **File:** `apps/backend/src/server.ts`, lines 973-978
- **Issue:** Model groupings (gemini-3-pro, gemini-3-flash, gemini-3-image, claude) are hardcoded as string patterns inside the `/api/accounts/quota-windows` route. When new models are released, this must be manually updated.
- **Fix approach:** Move model definitions to `config/quotaStrategy.json` (already exists for `quotaStrategyManager`) and reuse that configuration.

### Repeated Error Handling Pattern
- **Files:** `apps/backend/src/server.ts` — every route handler
- **Pattern:** Every route repeats the same `try/catch` with `res.status(500).json({ success: false, error: error.message })`. This is verbose and error-prone.
- **Fix approach:** Use Express error-handling middleware (already exists at line 2056 but routes still use inline try/catch blocks).

### Inline HTML in OAuth Callback
- **File:** `apps/backend/src/server.ts`, lines 551, 556
- **Issue:** Success and error HTML pages are constructed as inline template strings with manual character escaping. This is fragile and hard to maintain.
- **Fix approach:** Extract to separate HTML template files or a minimal template helper.

### `any` Type Usage in Callback Handlers
- **File:** `apps/backend/src/server.ts`, line 137 (`acc: any`), line 223 (`error: any`), line 248 (`data.data;`), line 251 (`l: any`), line 257 (`l: any`), line 576 (`err: any`), line 584 (`error: any`), and many more route handlers
- **Issue:** While the project enforces strict mode, route handlers consistently use `error: any` in catch blocks. This defeats type safety for error handling.
- **Fix approach:** Use `error: unknown` with type guards (already done correctly at line 2050 for `/api/analytics/prediction`).

### `WSMessage.data` Uses `any`
- **Files:** `apps/backend/src/types/index.ts` line 82, `apps/web/src/types/index.ts` line 105
- **Issue:** `WSMessage.data` is typed as `any`, losing all type safety for WebSocket payloads.
- **Fix approach:** Use discriminated union types based on `WSMessage.type`.

## Maintenance Burden

### No Testing Framework
- **Impact:** No test runner, no assertions, no CI test step. The only quality gate is `oxlint`.
- **Files:** No `*.test.ts` or `*.spec.ts` files exist anywhere.
- **Risk:** Refactoring the 2224-line server file or any service is high-risk without tests.

### Dependency Version Drift
- **File:** `apps/backend/package.json` — `typescript: ^5.3.3`
- **File:** `apps/web/package.json` — `typescript: ^5.3.3`
- **Issue:** Both apps pin TypeScript at `^5.3.3` (released Nov 2023). Current TypeScript is 5.8+. Missing out on improvements and potential security patches.
- **File:** `apps/web/package.json` — `react: ^18.2.0`
- **Issue:** React 18 is stable but React 19 is available. Not urgent but worth monitoring.

### Peer Dependency on `opencode-antigravity-auth`
- **File:** `apps/backend/package.json`, line 45
- **Issue:** `opencode-antigravity-auth: ^1.2.0` is a peer dependency. If this package is unavailable or changes API, the auth middleware breaks silently.
- **Risk:** External dependency outside project control.

### Build Process Complexity
- **Issue:** Backend builds with `tsc` to `dist/`, frontend builds with Vite to `apps/web/dist/`. The backend then serves the frontend's static files from `../../web/dist`. This creates a fragile build ordering dependency — if the frontend isn't built first, the backend serves stale or missing assets.
- **Files:** `apps/backend/src/server.ts` line 206 (`express.static(path.join(__dirname, '../../web/dist'))`)

### No CI/CD Pipeline
- **Issue:** No `.github/workflows/`, no CI configuration. Quality checks depend on local `pnpm run lint` only.

## Security Concerns

### WebSocket Auth via Query Parameter
- **File:** `apps/backend/src/utils/authMiddleware.ts`, lines 70-86
- **Issue:** WebSocket authentication passes the token as a URL query parameter (`?token=...`). Query parameters are logged in server access logs, browser history, and proxy logs. This is less secure than using a subprotocol header or upgrade header.
- **Recommendation:** Use WebSocket subprotocol or custom header for auth token.

### OAuth Callback Server Lifecycle
- **File:** `apps/backend/src/server.ts`, lines 468-580
- **Issue:** The OAuth callback server is created/destroyed dynamically on port 51121. If the close timeout fails or the server doesn't shut down cleanly, the port may remain bound, blocking subsequent OAuth flows.
- **File:** `apps/backend/src/server.ts`, line 576 — callback server error handler attempts to close but swallows errors.

### Refresh Token Storage
- **Files:** `apps/backend/src/services/accountsFile.ts` line 25, `~/.config/opencode/antigravity-accounts.json`
- **Issue:** Refresh tokens are stored in a JSON file on the local filesystem. While the export endpoint strips them (line 839), the raw file is readable by any process with user-level access.
- **Mitigation:** File permissions should be restricted to owner-only (not currently enforced programmatically).

### OAuth Client Secret in Memory
- **File:** `apps/backend/src/server.ts`, lines 492-501
- **Issue:** `GOOGLE_CLIENT_SECRET` is read from environment and used directly in the token exchange. It's held in memory for the lifetime of the process.
- **Mitigation:** Acceptable for a local dashboard, but worth noting for any future multi-tenant deployment.

### CSV Export Without Proper Escaping Edge Cases
- **File:** `apps/backend/src/server.ts`, lines 1534-1540
- **Issue:** The `escapeCSVCell` function wraps all values in double quotes, which is correct, but the CSV export at line 1494-1518 doesn't handle the case where `account_email` or `error_message` could contain injection payloads. Current escaping is adequate but not using a battle-tested CSV library.

## Performance Bottlenecks

### Full Table Scan for Pagination Count
- **File:** `apps/backend/src/server.ts`, line 1284
- **Issue:** To get total log count for pagination, the code fetches up to 10,000 rows and counts them in memory (`monitor.getCombinedLogs({ ...countFilters, limit: 10000, offset: 0 })`) instead of using `SELECT COUNT(*)`. This wastes memory and CPU.
- **Fix approach:** Add a `getCombinedLogsCount()` method that uses `COUNT(*)`.

### N+1 Query Pattern in Enriched Accounts
- **File:** `apps/backend/src/server.ts`, lines 788-828
- **Issue:** For each account, the code does `.find()` on quotas array and stats array. With many accounts, this becomes O(n²). Not critical at current scale but degrades with account count.

### In-Memory Quota Cache with No Eviction
- **File:** `apps/backend/src/services/quotaService.ts`
- **Issue:** Quota cache grows unbounded. Token cache also has no size limit. Over time with many accounts, this could consume significant memory.

### SQLite Write Contention
- **File:** `apps/backend/src/monitor.ts`
- **Issue:** `better-sqlite3` is synchronous. Every API call logged blocks the event loop briefly. Under high proxy load (many concurrent requests), this could cause request queuing.
- **Mitigation:** Consider batching writes or using WAL mode with write-ahead journaling.

### Recharts Rendering for Large Datasets
- **File:** `apps/web/src/components/TimelineVisualization.tsx`
- **Issue:** Recharts renders all data points in the DOM. With 168+ hours of data (7 days of hourly stats), this creates hundreds of SVG elements and can cause UI lag.

## Scalability Limits

### File-Based Account Storage
- **File:** `apps/backend/src/services/accountsFile.ts`, line 25
- **Issue:** Accounts are stored in a single JSON file (`antigravity-accounts.json`). The entire file is read, parsed, and rewritten on every change. This doesn't scale beyond dozens of accounts and has no concurrency protection beyond the file watcher.
- **Limit:** Practical limit is ~50-100 accounts before file I/O becomes noticeable.

### Single-Process Architecture
- **Issue:** The entire application runs as a single Node.js process. No horizontal scaling is possible. The SQLite database is single-writer, so even clustering would require significant re-architecture.
- **Impact:** Acceptable for a personal/local dashboard, but not deployable as a multi-user service.

### WebSocket Broadcast to All Clients
- **File:** `apps/backend/src/services/websocket.ts` (221 lines)
- **Issue:** `broadcastNow()` sends to all connected clients without filtering. If different users need different data views, this leaks information.
- **Current state:** Acceptable for single-user local dashboard.

### No Rate Limiting on OAuth Endpoints
- **File:** `apps/backend/src/server.ts`, lines 437-587
- **Issue:** The `/api/auth/google/url` endpoint and OAuth callback server have no rate limiting. While the global API limiter (line 67-73, 100 req/min) applies to `/api/*`, the OAuth callback server on port 51121 is a separate Express server with no rate limiting.

## Technical Debt

### Model Definitions Duplicated in Multiple Places
- **Files:** 
  - `apps/backend/src/server.ts` lines 973-978 (quota-windows route)
  - `apps/backend/src/config/quotaStrategy.json` (quota strategy config)
  - `apps/backend/src/services/tierDetection.ts` (tier detection)
- **Issue:** Model IDs, display names, and family assignments are defined in at least 3 places. Adding a new model requires changes in all locations.

### Commented-Out/Dead Code Potential
- **File:** `apps/backend/src/server.ts`, lines 1999-2000 (blank lines between route groups suggest incomplete refactoring)
- **File:** `apps/backend/src/server.ts`, line 1100 — comment says "will be enhanced in Phase 4" suggesting incomplete implementation

### Magic Numbers
- **File:** `apps/backend/src/server.ts`, line 36 — `MANAGER_URL` defaults to `http://localhost:8080`
- **File:** `apps/backend/src/server.ts`, line 398 — `OAUTH_CALLBACK_PORT = 51121` (hardcoded port)
- **File:** `apps/backend/src/server.ts`, line 68 — rate limit window of 60 seconds, max 100 requests
- **File:** `apps/backend/src/server.ts`, line 75 — JSON body limit of 50mb
- **File:** `apps/backend/src/monitor.ts`, line 271 — default 30 days for data cleanup
- **File:** `apps/backend/src/services/fileLogger.ts` — 7 days retention (line 83 in server.ts)
- **Fix approach:** Extract to a configuration file or constants module.

### Inconsistent Error Response Formats
- **Files:** `apps/backend/src/server.ts` — throughout
- **Issue:** Most endpoints return `{ success: false, error: string }`, but some include additional fields like `message`. The proxy routes may have different error formats. Clients must handle multiple error shapes.

### No Input Validation Library
- **Files:** `apps/backend/src/server.ts` — all POST/DELETE handlers
- **Issue:** Request body validation is done manually with inline checks (e.g., lines 596-599, 640-643). No schema validation library (Zod, Joi, etc.) is used. This is error-prone and inconsistent.
- **Example:** `app.delete('/api/accounts/:email')` at line 617 decodes the email but doesn't validate format.

### Stale Comment References
- **File:** `apps/backend/src/server.ts`, line 1100 — "will be enhanced in Phase 4" — unclear if this is still relevant or completed.

## Recommendations

### High Priority
1. **Extract routes from `server.ts`** into separate router modules (`routes/accounts.ts`, `routes/analytics.ts`, `routes/oauth.ts`, `routes/logs.ts`, `routes/languageServer.ts`). This is the single biggest improvement for maintainability.
2. **Create a shared types package** (`packages/types/`) to eliminate type duplication between frontend and backend.
3. **Add a test framework** (Vitest) with at least unit tests for core services (`accountsFile.ts`, `quotaService.ts`, `tierDetection.ts`).

### Medium Priority
4. **Add input validation** with Zod for all POST/DELETE endpoints.
5. **Fix pagination count query** to use `SELECT COUNT(*)` instead of fetching 10,000 rows.
6. **Consolidate model definitions** into a single source of truth (extend `config/quotaStrategy.json`).
7. **Add CI pipeline** with lint, typecheck, and test steps.

### Lower Priority
8. **Upgrade TypeScript** from 5.3.3 to latest 5.x.
9. **Add WebSocket auth via header** instead of query parameter.
10. **Extract OAuth HTML templates** to separate files.
11. **Add file permission enforcement** for the accounts JSON file (chmod 600).
12. **Consider SQLite WAL mode** for better concurrent write handling.

---

*Concerns audit: 2026-04-05*
