# Project state: Antigravity Dashboard — Electron Desktop

## Project reference

- **Core value:** Users install and run the full quota dashboard locally as a desktop app—with the same backend and UI behavior as the web app, reliable API/WebSocket/OAuth in packaged builds, and updates via GitHub Releases.  
- **Source of truth:** [PROJECT.md](./PROJECT.md) (scope, constraints, decisions).  
- **Requirements:** [REQUIREMENTS.md](./REQUIREMENTS.md).  
- **Roadmap:** [ROADMAP.md](./ROADMAP.md).

## Current position

| Field | Value |
|-------|--------|
| **Phase** | 1 — HTTP-served dashboard (Express origin) |
| **Focus** | Load the React SPA from the Express `http://` origin so relative `/api` and `/ws` work; eliminate `file://` loading for the dashboard in production Electron. |
| **Plan** | [01-01-PLAN.md](./phases/01-http-served-dashboard-express-origin/01-01-PLAN.md) (executed), [01-02-PLAN.md](./phases/01-http-served-dashboard-express-origin/01-02-PLAN.md) (next) |
| **Status** | Phase 1 in progress — plan 01-01 complete; execute 01-02 next |

**Progress:** `░░░░░░░░░░ 0/12 phases complete` (see [ROADMAP.md](./ROADMAP.md))

## Performance metrics

| Metric | Value |
|--------|--------|
| Last roadmap update | 2026-04-05 |
| Depth mode | comprehensive |

## Accumulated context

### Decisions (from PROJECT.md)

- Electron shell wraps existing pnpm monorepo; Express sidecar remains the HTTP server for API, static SPA, and OAuth callback on port 51121.
- Do not change OAuth client IDs or redirect URIs beyond existing registration.
- Tray / minimize-to-tray is out of scope for v1.

### Decisions (from 01-01 execution)

| Decision | Rationale |
|----------|-----------|
| `/api/stats` readiness accepts any HTTP status | `app.use('/api', requireAuth)` returns 401 when auth is enabled; connection success must not depend on Bearer tokens from Electron main. |
| No DevTools menu entry when packaged | Matches CONTEXT: shortcut-only access in production builds. |
| Local HTTP + HTTPS allowed in `setWindowOpenHandler` | Supports OAuth provider pages and local callback ports (e.g. 51121) without generic in-app browsing. |

### Open items

- Pin exact Electron major for native rebuild alignment during implementation.
- Validate CORS / load URL host alignment if proxy or origins differ between dev and packaged builds.

### Blockers

- None recorded.

## Session continuity

- **Last session:** 2026-04-05 — Completed [01-01-SUMMARY.md](./phases/01-http-served-dashboard-express-origin/01-01-SUMMARY.md) (Electron HTTP shell).
- **Stopped at:** Plan **01-02** (boneyard skeleton, web preload bridge, API banner) not started.
- **Resume file:** None
- **Research:** [research/SUMMARY.md](./research/SUMMARY.md) — stack and phase ordering validated.

---
*STATE initialized: 2026-04-05*
