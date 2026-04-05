# Codebase Concerns

**Analysis Date:** 2026-04-05

## Tech Debt

**Monolithic HTTP surface in `server.ts`:**
- Issue: Nearly all Express routes, static SPA fallback, WebSocket wiring side effects, and startup banner live in one file (~2200+ lines).
- Why: Single-file growth without extraction.
- Impact: Harder reviews, higher merge conflict risk, and unclear boundaries for new endpoints.
- Fix approach: Split by domain (e.g. `routes/accounts.ts`, `routes/logs.ts`, `routes/analytics.ts`) and mount sub-routers from `apps/backend/src/server.ts`; keep shared middleware in one module.

**API proxy router never registers `/v1` handlers:**
- Issue: `initializeProxyRoutes` in `apps/backend/src/routes/proxy.ts` constructs `ApiProxyService` and returns `apiRouter`, but no `apiRouter.post('/v1/...')` (or equivalent) is defined. `validateApiKey` in `apps/backend/src/services/apiProxy/index.ts` is never called from routing code.
- Why: Incomplete wiring between `ApiProxyService` and Express.
- Impact: Startup banner in `apps/backend/src/server.ts` advertises `http://${bindHost}:${PORT}/v1/messages` and `/v1/chat/completions`, but those paths are not handled by the proxy layer; requests are likely to fall through to the SPA `app.get('*', ...)` handler and return `index.html` instead of API responses.
- Fix approach: Register routes on `apiRouter` (or `app`) that parse `x-api-key` / `Authorization`, call `proxyService.validateApiKey`, then `handleClaudeRequest` / `handleOpenAIRequest`; add integration tests for `/v1` responses.

**Unused configuration subsystem:**
- Issue: `getConfigManager` / `apps/backend/src/utils/configManager.ts` (defaults include `server.host: '0.0.0.0'` and broad `corsOrigins`) is not imported by `server.ts`; actual bind host comes from `getBindHost()` in `apps/backend/src/utils/authMiddleware.ts`.
- Why: Ported or planned feature not integrated.
- Impact: Misleading defaults if future code starts reading `configManager`; two sources of truth for “how the server listens.”
- Fix approach: Either wire `ConfigManager` into server startup (port, CORS, bind host) or remove/trim unused exports and document a single config path.

**Duplicated TypeScript types across apps:**
- Issue: Shared shapes are maintained in `apps/backend/src/types/` and `apps/web/src/types/` manually (per `AGENTS.md`).
- Why: No shared package or codegen.
- Impact: API contract drift between UI and backend.
- Fix approach: Add a small shared workspace package or generate types from a single schema; at minimum, add a checklist in PR review for paired edits.

## Known Bugs

**Language Server detection on Windows:**
- Symptoms: LS connection and credits polling may never succeed on `win32`; logs may show platform warnings or failed `ps`/`grep`/`lsof` execution.
- Trigger: Run backend on Windows with Antigravity/VS Code extension; observe `apps/backend/src/services/languageServer/detect.ts` and `getListeningPorts` (Unix-style `lsof`/`ss` pipeline with `2>/dev/null`).
- Workaround: Use Linux or macOS for full LS integration, or disable LS-related features via configuration expectations.
- Root cause: `apps/backend/src/services/languageServer/platforms/index.ts` maps `win32` to `LinuxStrategy` with a console warning; `isPlatformSupported()` returns `false` for `win32`. `getListeningPorts` in `detect.ts` assumes Unix shell semantics.
- Blocked by: A dedicated `WindowsStrategy` (WMI / PowerShell / netstat) and tests on Windows.

**Advertised `/v1` proxy URLs vs routing:**
- Symptoms: HTTP clients pointed at `/v1/messages` or `/v1/chat/completions` may receive HTML (SPA) or non-JSON responses.
- Trigger: `POST` to `http://localhost:3456/v1/messages` without a matching registered route (see Tech Debt above).
- Workaround: Not applicable until routes are registered.
- Root cause: Missing Express routes for the proxy (see `apps/backend/src/routes/proxy.ts`).

## Security Considerations

**Optional dashboard authentication and bind address:**
- Risk: With `DASHBOARD_SECRET` unset, `requireAuth` in `apps/backend/src/utils/authMiddleware.ts` allows all `/api` requests; `getBindHost()` binds `127.0.0.1` only, limiting exposure to local machine. With `DASHBOARD_SECRET` set, bind switches to `0.0.0.0` and Bearer auth is enforced for `/api` routes.
- Current mitigation: Documented behavior; timing-safe compare for tokens; WebSocket `verifyClient` uses `validateWebSocketAuth` in `apps/backend/src/services/websocket.ts` when auth is enabled.
- Recommendations: Treat production deployments as requiring `DASHBOARD_SECRET` and TLS termination if exposed beyond localhost; document threat model for Electron packaged apps loading `.env` from `process.resourcesPath` (`electron/main.js`, `package.json` `extraResources`).

**Local HTTPS to Language Server (`rejectUnauthorized: false`):**
- Risk: If `hostname` were ever not loopback, TLS verification would be disabled.
- Current mitigation: Code paths target `127.0.0.1`; comments in `apps/backend/src/services/languageServer/httpClient.ts` and `detect.ts` state localhost-only intent.
- Recommendations: Keep host pinned to loopback; add assertions or runtime checks that `hostname === '127.0.0.1'` / `localhost` before setting `rejectUnauthorized: false`.

**Large JSON body limit:**
- Risk: `express.json({ limit: '50mb' })` in `apps/backend/src/server.ts` allows very large request bodies on authenticated or local routes, increasing memory pressure.
- Current mitigation: Rate limiter on `/api` (`apiLimiter`); local-only default when auth is off.
- Recommendations: Lower default for general JSON routes; reserve large limits only for specific upload routes if needed.

**Proxy management endpoints expose API key when auth is off:**
- Risk: `managementRouter` in `apps/backend/src/routes/proxy.ts` uses `requireAuth`; when auth is disabled, `requireAuth` passes through, so `GET /api/proxy/api-key` returns the key to any local caller.
- Current mitigation: Default bind `127.0.0.1` without `DASHBOARD_SECRET` limits access to localhost.
- Recommendations: When exposing the server on the network, always set `DASHBOARD_SECRET` and review CORS (`corsOrigins` in `server.ts`).

**Accounts file and refresh tokens on disk:**
- Risk: `apps/backend/src/services/accountsFile.ts` reads `antigravity-accounts.json` under `getAppHomeDir()`; compromise of that file exposes OAuth refresh material.
- Current mitigation: Export path strips secrets (`/api/accounts/export` in `server.ts`); file permissions are OS-dependent.
- Recommendations: Document OS file permissions; avoid logging full paths in shared logs in untrusted environments.

## Performance Bottlenecks

**Quota polling and Google API calls:**
- Problem: `getQuotaService(120000)` in `server.ts` triggers periodic work across accounts; `apps/backend/src/services/quotaService.ts` coordinates fetches.
- Measurement: Not detected (no APM traces in repo).
- Cause: Network round-trips to Google Cloud Code API per polling cycle and account count.
- Improvement path: Batch requests where the API allows; backoff on errors; surface metrics in logs or a debug endpoint.

**SQLite write path for API logging:**
- Problem: `apps/backend/src/monitor.ts` persists calls and events via `better-sqlite3`; heavy proxy traffic increases write volume.
- Measurement: Not detected.
- Cause: Single-process SQLite suitable for moderate throughput; synchronous writes under load.
- Improvement path: Batch inserts, WAL tuning, or archival of `api_calls` for long-running deployments.

**Language Server detection subprocesses:**
- Problem: `detect.ts` runs `exec` with `ps`/`grep` and per-PID `lsof`/`ss` (see `getListeningPorts`), repeated on retries.
- Measurement: Not detected.
- Cause: Process scanning and port discovery are inherently spiky.
- Improvement path: Cache successful detection; increase backoff (service already uses backoff in `languageServerService`).

## Fragile Areas

**Express middleware order vs SPA fallback:**
- Why fragile: `app.get('*', ...)` in `apps/backend/src/server.ts` serves `index.html` for unknown GET routes; any new API route must be registered before this handler.
- Common failures: New `GET` API path accidentally returns the SPA; API clients receive HTML.
- Safe modification: Register API routes above the catch-all; add a smoke test list of API paths.
- Test coverage: No automated route tests detected.

**Language Server stack (`detect.ts` + `platforms/linux.ts` + `httpClient.ts`):**
- Why fragile: Tightly coupled to process command-line shapes, dynamic ports, and CSRF tokens from the Antigravity extension; OS-specific commands.
- Common failures: Extension changes argument names; grep patterns in `linux.ts` miss processes; TLS/port mismatch.
- Safe modification: Extend `PlatformStrategy` with new parsers rather than patching strings inline; prefer structured logs over silent catches when diagnosing.
- Test coverage: No unit tests in `apps/backend` for LS detection.

**`proxyManagementRouter` nested under `requireAuth`:**
- Why fragile: `managementRouter.use(requireAuth)` in `routes/proxy.ts` duplicates the global `/api` auth applied later in `server.ts` when `DASHBOARD_SECRET` is set—behavior is correct but non-obvious.
- Common failures: Developers may assume only one auth layer or forget management routes when changing auth.
- Safe modification: Document in `routes/proxy.ts` header; consider consolidating auth middleware registration.
- Test coverage: None detected.

## Scaling Limits

**SQLite database (`usage.db`):**
- Current capacity: Single-file DB under `~/.config/opencode/antigravity-dashboard/usage.db` (see `apps/backend/src/monitor.ts`); single writer.
- Limit: Write contention and file size growth under very high API call logging volume.
- Symptoms at limit: Slow inserts, lock errors, large disk use.
- Scaling path: Periodic pruning (`cleanup` routes exist in `server.ts`), migration to client/server DB for multi-instance deployments.

**WebSocket fan-out:**
- Current capacity: In-memory client map in `apps/backend/src/services/websocket.ts`; `configManager` defaults mention `maxConnections: 100` but that value is not wired to `WebSocketManager`.
- Limit: Memory and event-loop cost with many connected dashboards.
- Symptoms at limit: High memory, delayed broadcasts.
- Scaling path: Wire max connection limits; horizontal scaling would require a shared pub/sub layer (not present).

**Single Node process:**
- Current capacity: One Express process per deployment.
- Limit: CPU-bound JSON and proxy work share one core cluster unless clustered.
- Scaling path: Process manager with multiple workers (state externalized), or split read-only dashboard from write-heavy proxy.

## Dependencies at Risk

**`better-sqlite3` native binding:**
- Risk: Native module must rebuild per Node/Electron ABI; `package.json` lists it under `pnpm.onlyBuiltDependencies`.
- Impact: Install or Electron packaging fails if build tools or ABI mismatch.
- Migration plan: Pin Node/Electron versions; document rebuild steps for contributors.

**`opencode-antigravity-auth` peer dependency (`apps/backend/package.json`):**
- Risk: Peer mismatch warnings if versions diverge from the Antigravity plugin ecosystem.
- Impact: OAuth/token flows may break if plugin API changes.
- Migration plan: Align peer version with published plugin; test OAuth callback paths in `server.ts`.

## Missing Critical Features

**Windows-native Language Server discovery:**
- Problem: No `WindowsStrategy` implementation; `platforms/index.ts` falls back to Linux-oriented commands.
- Current workaround: None on Windows for reliable LS bridge.
- Blocks: Parity for Windows-only developers using the dashboard against the extension.
- Implementation complexity: Medium (new process enumeration + port discovery + tests on Windows).

**Automated test suite for backend and web:**
- Problem: No `vitest`/`jest` scripts in workspace `package.json`; no `*.test.ts` files under `apps/` in source tree.
- Current workaround: Manual and lint-only (`oxlint`) verification.
- Blocks: Safe refactoring of `server.ts`, proxy, and LS code.
- Implementation complexity: Medium (add runner, CI job, first critical-path tests).

## Test Coverage Gaps

**API proxy (`services/apiProxy/`):**
- What's not tested: `handleClaudeRequest`, streaming, `validateApiKey`, and converter edge cases.
- Risk: Regressions in Claude/OpenAI compatibility and token accounting.
- Priority: High (once `/v1` routes are wired).
- Difficulty to test: Requires mocking `AntigravityClient` and streaming responses.

**Language Server detection (`services/languageServer/detect.ts`, `platforms/linux.ts`):**
- What's not tested: Parsing of `ps` output, port extraction, and failure modes.
- Risk: Silent failure to connect after extension updates.
- Priority: Medium.
- Difficulty to test: Fixture strings for stdout and dependency injection for `exec`.

**End-to-end dashboard flows:**
- What's not tested: OAuth callback, WebSocket auth with `token` query param, account file watcher behavior.
- Risk: Broken flows after dependency or Express changes.
- Priority: Medium.
- Difficulty to test: Requires headless browser or scripted HTTP/WebSocket harness.

---

*Concerns audit: 2026-04-05*
*Update as issues are fixed or new ones discovered*
