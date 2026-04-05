# Project state: Antigravity Dashboard — Electron Desktop

## Project reference

- **Core value:** Users install and run the full quota dashboard locally as a desktop app—with the same backend and UI behavior as the web app, reliable API/WebSocket/OAuth in packaged builds, and updates via GitHub Releases.  
- **Source of truth:** [PROJECT.md](./PROJECT.md) (scope, constraints, decisions).  
- **Requirements:** [REQUIREMENTS.md](./REQUIREMENTS.md).  
- **Roadmap:** [ROADMAP.md](./ROADMAP.md).

## Current position

| Field | Value |
|-------|--------|
| **Phase** | 2 — Backend lifecycle |
| **Focus** | Express starts reliably with the window and exits fully on quit; no orphaned backend process under normal use. |
| **Plan** | See [ROADMAP.md](./ROADMAP.md) Phase 2 when plans exist. |
| **Status** | Phase 1 complete — static/code verification **passed** ([01-VERIFICATION.md](./phases/01-http-served-dashboard-express-origin/01-VERIFICATION.md)); optional manual runs listed there and in [01-02-SUMMARY.md](./phases/01-http-served-dashboard-express-origin/01-02-SUMMARY.md). |

**Progress:** `█░░░░░░░░░ 1/12 phases complete` (see [ROADMAP.md](./ROADMAP.md))

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

### Decisions (from 01-02 execution)

| Decision | Rationale |
|----------|-----------|
| Skip `AuthPrompt` when `window.__BONEYARD_BUILD` | Lets `boneyard-js build` capture the shell fixture without a running authenticated API. |
| Banner driven by `useQuota` error + accounts fetch throw | Central hooks already model API health; avoids patching `window.fetch` globally. |
| Keep `electronAPI` and add `antigravityShell` separately | Preserves 01-01 retry / packaged helpers while exposing a minimal read-only shell surface. |

### Open items

- Pin exact Electron major for native rebuild alignment during implementation.
- Validate CORS / load URL host alignment if proxy or origins differ between dev and packaged builds.

### Blockers

- None recorded.

## Session continuity

- **Last session:** 2026-04-05 — `/gsd-execute-phase 1`: plans **01-01** and **01-02** executed; **gsd-verifier** **passed** (8/8 must-haves); [01-VERIFICATION.md](./phases/01-http-served-dashboard-express-origin/01-VERIFICATION.md).
- **Next action:** Phase 2 — `/gsd-discuss-phase 2` or `/gsd-plan-phase 2`. If you use strict plan sign-off, run manual checks in 01-02-SUMMARY and reply **approved** in chat (optional; verifier already passed).
- **Resume file:** None
- **Research:** [research/SUMMARY.md](./research/SUMMARY.md) — stack and phase ordering validated.

---
*STATE initialized: 2026-04-05*
