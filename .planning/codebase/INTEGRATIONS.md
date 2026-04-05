# External Integrations

**Analysis Date:** 2026-04-05

## APIs & External Services

**Google Cloud Code / Antigravity (quota + LLM proxy upstream):**
- Purpose: Fetch per-model quota (`fetchAvailableModels` / quota metadata), refresh OAuth access tokens, and stream/non-stream generation for the Claude/OpenAI-compatible proxy layer
- Base hosts (quota service tries in order): `https://cloudcode-pa.googleapis.com`, `https://daily-cloudcode-pa.sandbox.googleapis.com` — `apps/backend/src/services/quotaService.ts` (`ANTIGRAVITY_ENDPOINTS`)
- Proxy upstream (SSE and REST): `apps/backend/src/services/apiProxy/types.ts` — `ANTIGRAVITY_ENDPOINTS.stream`, `.noStream`, `.models` on `https://daily-cloudcode-pa.sandbox.googleapis.com` (`v1internal:streamGenerateContent`, `generateContent`, `fetchAvailableModels`)
- Integration method: HTTPS `fetch` with Antigravity-style headers (`User-Agent`, `X-Goog-Api-Client`, `Client-Metadata`) — `apps/backend/src/services/apiProxy/types.ts` (`ANTIGRAVITY_HEADERS`), `apps/backend/src/services/quotaService.ts` (`ANTIGRAVITY_HEADERS`)
- Auth: OAuth2 access tokens obtained via refresh token + `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — token refresh uses `https://oauth2.googleapis.com/token` (see `apps/backend/src/services/quotaService.ts`)

**Google OAuth (token refresh for account refresh tokens):**
- Credentials: Environment variables `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — `.env.example`, loaded in `apps/backend/src/server.ts` via dotenv
- Constraint: Refresh tokens are issued for a specific OAuth client; they must match the client used by the OpenCode/Antigravity auth flow. `.env.example` documents not swapping arbitrary Google OAuth credentials (tokens remain bound to the plugin client). Align with `opencode-antigravity-auth` peer dependency in `apps/backend/package.json`

**Claude / OpenAI compatible API (application proxy):**
- Purpose: Accept Anthropic- and OpenAI-shaped requests and translate to Antigravity payloads — `apps/backend/src/services/apiProxy/index.ts` (`ApiProxyService`: `handleClaudeRequest`, `handleOpenAIRequest`), `apps/backend/src/services/apiProxy/converter.ts`, `apps/backend/src/services/apiProxy/client.ts` (`AntigravityClient`)
- Client auth to dashboard proxy: `x-api-key` / Anthropic-style key validated against configured proxy API key (`PROXY_API_KEY` or generated) — `apps/backend/src/services/apiProxy/index.ts` (`validateApiKey`)
- Management endpoints (dashboard auth when enabled): `/api/proxy/status`, `/api/proxy/stats`, `/api/proxy/config`, `/api/proxy/api-key`, `/api/proxy/logs`, etc. — `apps/backend/src/routes/proxy.ts`
- Intended public URLs (documented in server banner): `/v1/messages` (Claude), `/v1/chat/completions` (OpenAI) — `apps/backend/src/server.ts` (startup log); implementation logic in `apps/backend/src/services/apiProxy/index.ts`

**Optional external manager:**
- Purpose: Some routes forward to `MANAGER_URL` (default `http://localhost:8080`) — `apps/backend/src/server.ts` (`proxyToManager`, `MANAGER_URL` env)

**VS Code / Language Server (Antigravity extension bridge):**
- Purpose: Supplementary quota/credits via gRPC-Web style HTTP to a locally discovered Language Server — `apps/backend/src/services/languageServer/languageServerService.ts` (default path `/exa.language_server_pb.LanguageServerService/GetUserStatus` on `127.0.0.1`)
- Discovery: Platform-specific (e.g. Linux `/proc` scanning) — `apps/backend/src/services/languageServer/detect.ts`, `apps/backend/src/services/languageServer/platforms/`
- Auth: CSRF token from extension process — `apps/backend/src/services/languageServer/httpClient.ts`

## Data Storage

**Databases:**
- SQLite (file) — Default path `~/.config/opencode/antigravity-dashboard/usage.db` (override via `DB_PATH` consumed by monitor config — see `apps/backend/src/monitor.ts`, `apps/backend/src/utils/configManager.ts`)
- Client: better-sqlite3 `^12.5.0` — `apps/backend/src/monitor.ts`
- Tables include: `api_calls`, `session_events`, `quota_snapshots`, `account_status` — schema in `apps/backend/src/monitor.ts` (`initDatabase`)

**File storage (local):**
- Accounts and rotation state: `~/.config/opencode/antigravity-accounts.json` — `apps/backend/src/services/accountsFile.ts` (`ACCOUNTS_FILE_PATH`)
- Optional OpenCode config: `~/.config/opencode/antigravity.json` — same file (`CONFIG_FILE_PATH`)
- Rotating JSON logs: `~/.config/opencode/antigravity-dashboard/logs/*.log` — `apps/backend/src/services/fileLogger.ts`

**Caching:**
- In-memory token and quota caches — `apps/backend/src/services/quotaService.ts` (`tokenCache`, `QuotaCache`)

## Authentication & Identity

**Dashboard / API:**
- Optional shared secret: `DASHBOARD_SECRET` — When set, enables bearer auth on `/api/*` and token query on `/ws` — `apps/backend/src/utils/authMiddleware.ts`, `.env.example`

**Google identity (accounts file):**
- Refresh tokens and account metadata originate from the Antigravity/OpenCode plugin workflow; dashboard reads them from the accounts JSON file — `apps/backend/src/services/accountsFile.ts`

**Proxy API key:**
- `PROXY_API_KEY` optional; otherwise generated at init — `apps/backend/src/routes/proxy.ts` (`initializeProxyRoutes`)

## Monitoring & Observability

**Error Tracking:**
- Not detected — No Sentry/Datadog SDK in `package.json` workspaces

**Logs:**
- Structured file logging (JSON lines) with retention — `apps/backend/src/services/fileLogger.ts`
- Console logging from Express/Electron/backend subprocess — `electron/main.js`, `apps/backend/src/server.ts`

## CI/CD & Deployment

**Hosting:**
- Local-first or self-hosted Node process; Electron wraps the same stack for desktop distribution (`package.json` `electron:build`)

**CI Pipeline:**
- Not detected — No `.github/workflows/*.yml` in repository snapshot

## Environment Configuration

**Required / critical env vars (names only):**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth client for refresh-token exchange (must match plugin-issued tokens)
- `DASHBOARD_PORT` — Default `3456` — `apps/backend/src/server.ts`
- Optional: `DASHBOARD_SECRET`, `CORS_ORIGINS`, `API_RATE_LIMIT`, `DB_PATH`, `DATA_RETENTION_DAYS`, `PROXY_API_KEY`, `PROXY_ENABLED`, `MANAGER_URL`, `DOTENV_CONFIG_PATH`, `ANTIGRAVITY_HOME` — `.env.example`, `apps/backend/src/utils/appPaths.ts`, `apps/backend/src/monitor.ts`

**Secrets location:**
- Development: root `.env` (gitignored; `.env.example` is a template)
- Electron packaged build: `.env` copied to `extraResources` per root `package.json` `build.extraResources`

## Webhooks & Callbacks

**Incoming:**
- None detected — No Stripe-style webhook routes in `apps/backend/src/` for external SaaS callbacks

**Outgoing:**
- Google OAuth token endpoint (`https://oauth2.googleapis.com/token`) — refresh on demand — `apps/backend/src/services/quotaService.ts`
- Google Cloud Code / Antigravity HTTPS endpoints — quota polling and proxy generation — `apps/backend/src/services/quotaService.ts`, `apps/backend/src/services/apiProxy/client.ts`

---

*Integration audit: 2026-04-05*
*Update when adding/removing external services*
