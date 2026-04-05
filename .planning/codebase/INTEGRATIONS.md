# External Integrations

**Analysis Date:** 2026-04-05

## External APIs

### Google Cloud — OAuth Token Refresh
- **Endpoint:** `https://oauth2.googleapis.com/token`
- **Purpose:** Refresh access tokens for Google accounts
- **Auth:** Uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from `.env`
- **Implementation:** `apps/backend/src/services/quotaService.ts` (line 143)
  - Caches tokens with expiry tracking (`TokenCache` map)
  - 60-second safety margin before expiry
  - Response: `access_token` + `expires_in`

### Google Cloud Code API — Quota Fetching
- **Endpoints:**
  - `https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels`
  - `https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:fetchAvailableModels`
- **Purpose:** Fetch model quota information (remaining fraction, reset time) per account
- **Auth:** Bearer token (from OAuth refresh) + custom headers
- **Headers:** `apps/backend/src/services/quotaService.ts` (lines 24-28):
  - `User-Agent: antigravity/1.11.5 windows/amd64`
  - `X-Goog-Api-Client: google-cloud-sdk vscode_cloudshelleditor/0.1`
  - `Client-Metadata: {"ideType":"IDE_UNSPECIFIED","platform":"PLATFORM_UNSPECIFIED","pluginType":"GEMINI"}`
- **Polling interval:** 120 seconds (`apps/backend/src/services/quotaService.ts`, line 85)
- **Retry:** Exponential backoff with jitter (max 3 retries, base 1s, max 60s)

### Antigravity API — Generation (via API Proxy)
- **Endpoints** (`apps/backend/src/services/apiProxy/types.ts`):
  - Stream: `https://cloudcode-pa.googleapis.com/v1beta/internal:streamGenerateContent`
  - Non-stream: `https://cloudcode-pa.googleapis.com/v1beta/internal:generateContent`
  - Models: `https://cloudcode-pa.googleapis.com/v1beta/internal:listModels`
- **Purpose:** Claude/OpenAI-compatible proxy → Google Cloud Code API
- **Auth:** Bearer token + protocol signatures (base64-encoded thought/tool markers)
- **Timeout:** 120 seconds per request
- **Retries:** Max 3, exponential backoff (base 1s, max 30s)
- **Account selection:** Passthrough mode — uses active account set by plugin
- **Implementation:** `apps/backend/src/services/apiProxy/client.ts`
  - `generateStream()` — SSE streaming with line buffering
  - `generateNoStream()` — Single response
  - `getAvailableModels()` — Model discovery

### Antigravity API — Supported Models
Default model list (`apps/backend/src/services/apiProxy/client.ts`, lines 366-378):
- `claude-opus-4-5`, `claude-opus-4-5-thinking`
- `claude-sonnet-4-5-thinking`, `claude-sonnet-4-5`
- `gemini-3-pro-high`, `gemini-2.5-flash-lite`, `gemini-3-pro-image`
- `gemini-2.5-flash-thinking`, `gemini-2.5-pro`, `gemini-2.5-flash`
- `gemini-3-pro-low`

### Protocol Signatures
Hardcoded base64 signatures in `apps/backend/src/services/apiProxy/converter.ts` (lines 28-31):
- `CLAUDE_THOUGHT_SIGNATURE` — Injected for Claude model thinking blocks
- `GEMINI_THOUGHT_SIGNATURE` — Injected for Gemini model thinking blocks
- `CLAUDE_TOOL_SIGNATURE` — Injected for Claude tool calls
- `GEMINI_TOOL_SIGNATURE` — Injected for Gemini tool calls

## Real-time Communication

### WebSocket Server
- **Library:** `ws` 8.16.0
- **Path:** `/ws`
- **Server:** `apps/backend/src/services/websocket.ts`
- **Features:**
  - Message batching: 100ms interval
  - Heartbeat: 30s ping/pong
  - Client timeout: 60s
  - Sequence numbering for message ordering
  - Message queue for disconnected clients
- **Message Types:** `initial`, `accounts_update`, `rate_limit_change`, `stats_update`, `heartbeat`
- **Auth:** Optional — when `DASHBOARD_SECRET` is set, validates via query param `?token=<secret>`
- **Client subscription:** Clients send `{ type: 'subscribe', events: [...] }` to filter messages

### Vite Dev Proxy
- **Config:** `apps/web/vite.config.ts` (lines 14-23)
  - `/api` → `http://localhost:3456` (HTTP proxy)
  - `/ws` → `ws://localhost:3456` (WebSocket proxy)
- Enables frontend dev server (5173) to communicate with backend (3456) without CORS issues

## Language Server Protocol

### VS Code Extension Bridge
- **Service:** `apps/backend/src/services/languageServer/languageServerService.ts`
- **Purpose:** Communicates with Antigravity VS Code extension for user credits and quota data
- **Protocol:** gRPC-Web over HTTP
- **Endpoint:** `/exa.language_server_pb.LanguageServerService/GetUserStatus`
- **Polling interval:** 90 seconds
- **Reconnect backoff:** 60 seconds after failed detection

### Port Discovery
- **Implementation:** `apps/backend/src/services/languageServer/detect.ts`
- **Method:** Platform-specific process scanning
  - Linux: `/proc` scanning for VS Code extension process args
  - Platform strategy: `apps/backend/src/services/languageServer/platforms/`
- **Extraction:** Parses cmdline to find gRPC-Web port and CSRF token
- **Retry:** 3 attempts with exponential backoff (base 1.5s)
- **Limitation:** Currently Linux-only (`/proc` required for port discovery)

### HTTP Client
- **File:** `apps/backend/src/services/languageServer/httpClient.ts`
- **Features:** gRPC-Web compatible HTTP requests with CSRF token handling

## File System

### Accounts File
- **Location:** `~/.config/opencode/antigravity-accounts.json`
- **Service:** `apps/backend/src/services/accountsFile.ts`
- **Watcher:** `chokidar` 5.0.0 with `awaitWriteFinish` (100ms stability threshold)
- **Operations:** CRUD for accounts, rate limit tracking, account rotation
- **Rotation strategies:** `round_robin`, `least_recently_used`, `highest_quota`, `random`, `weighted`, `sticky`
- **Events emitted:** Account changes, rate limit updates, diff notifications

### Config File
- **Location:** `~/.config/opencode/antigravity.json`
- **Purpose:** Dashboard configuration (rotation settings, preferences)

### Database File
- **Location:** `~/.config/opencode/antigravity-dashboard/usage.db`
- **Service:** `apps/backend/src/monitor.ts`
- **Auto-created:** Directory and file created on first run if missing

### File Logger
- **Service:** `apps/backend/src/services/fileLogger.ts`
- **Format:** JSON lines
- **Retention:** 7 days (configurable)

## Authentication

### OAuth (Google)
- **Provider:** Google OAuth 2.0
- **Credentials:** Bound to `opencode-antigravity-auth` plugin's OAuth client
  - Client ID: `107100600591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com`
  - **WARNING:** Do NOT change — refresh tokens are cryptographically bound to this client ID
- **Flow:** Refresh token → access token (cached with expiry)
- **Source:** `apps/backend/src/services/quotaService.ts`

### Dashboard Auth (Optional)
- **Middleware:** `apps/backend/src/utils/authMiddleware.ts`
- **Trigger:** `DASHBOARD_SECRET` env var presence
- **When set:**
  - Server binds to `0.0.0.0` (all interfaces)
  - All `/api/*` endpoints require `Authorization: Bearer <token>`
  - WebSocket requires `?token=<secret>` query param
  - Timing-safe comparison via `crypto.timingSafeEqual`
- **When not set:**
  - Server binds to `127.0.0.1` (localhost only)
  - No authentication required

### API Proxy Auth
- **API Key:** Generated as Anthropic-style key (`sk-ant-api03-<random>`) or from `PROXY_API_KEY` env var
- **Validation:** Simple string comparison
- **Separate routers:**
  - `apiRouter` — `/v1/*` routes (Claude/OpenAI compatible) — uses proxy API key
  - `managementRouter` — `/api/proxy/*` routes — uses dashboard auth

### CORS
- **Default origins:** `http://localhost:3456`, `http://localhost:5173`
- **Configurable:** `CORS_ORIGINS` env var (comma-separated)
- **Credentials:** `true` (cookies/auth headers allowed)

## Data Flow

### Quota Monitoring Pipeline
```
1. QuotaService (120s polling)
   → OAuth refresh (Google) → access token
   → Google Cloud Code API → quota data per account
   → EventEmitter → WebSocketManager → Frontend

2. LanguageServerService (90s polling)
   → Port discovery (/proc scan)
   → gRPC-Web HTTP call → user credits/quota
   → EventEmitter → WebSocketManager → Frontend

3. AccountsFileService (file watcher)
   → chokidar watches accounts file
   → On change: reload, update rate limits, rotate accounts
   → EventEmitter → WebSocketManager → Frontend
```

### API Proxy Pipeline
```
Client (Claude SDK / OpenAI SDK)
  → POST /v1/messages or /v1/chat/completions
  → ApiProxyService (apps/backend/src/services/apiProxy/)
    → Model mapping (Claude/OpenAI → Antigravity format)
    → Protocol signature injection
    → Account selection (passthrough mode)
    → AntigravityClient → Google Cloud Code API
    → Response conversion (Antigravity → Claude/OpenAI format)
    → SSE streaming or JSON response
  → UsageMonitor (apps/backend/src/monitor.ts)
    → SQLite logging (api_calls table)
```

### Frontend Data Flow
```
WebSocket (/ws)
  → Zustand store (apps/web/src/stores/useDashboardStore.ts)
  → React components (apps/web/src/components/)
  → Recharts visualizations

Custom hooks (apps/web/src/hooks/)
  → REST API (/api/*)
  → Data fetching for accounts, stats, logs
```

## Environment Configuration

### Required Environment Variables
| Variable | Purpose | Default |
|----------|---------|---------|
| `GOOGLE_CLIENT_ID` | OAuth client ID | From `.env.example` (do not change) |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | From `.env.example` (do not change) |

### Optional Environment Variables
| Variable | Purpose | Default |
|----------|---------|---------|
| `DASHBOARD_PORT` | Server port | `3456` |
| `MANAGER_URL` | Manager service URL | `http://localhost:8080` |
| `DASHBOARD_SECRET` | Dashboard auth secret | Not set (localhost only) |
| `CORS_ORIGINS` | Allowed CORS origins | `localhost:3456,localhost:5173` |
| `PROXY_API_KEY` | API proxy key | Auto-generated |
| `DB_PATH` | Custom database path | `~/.config/opencode/antigravity-dashboard/usage.db` |
| `DATA_RETENTION_DAYS` | Log retention | `30` |
| `LOG_LEVEL` | Logging level | `info` |
| `WS_HEARTBEAT_INTERVAL` | WS heartbeat ms | `30000` |
| `WS_MAX_CONNECTIONS` | Max WS clients | `100` |
| `API_RATE_LIMIT` | Requests per minute | `100` |
| `DEV_MODE` | Development mode | `false` |

### Secrets Location
- `.env` file at project root (gitignored)
- `.env.example` committed with safe defaults
- OAuth credentials bound to external plugin — do not modify

## Webhooks & Callbacks

**Incoming:** None detected
**Outgoing:** None detected

---

*Integration audit: 2026-04-05*
