---
phase: 01-http-served-dashboard-express-origin
plan: 01-01
subsystem: desktop
tags: electron, electron-store, express, ipc, oauth

requires: []
provides:
  - Packaged Electron loads the React SPA from `http://127.0.0.1:<port>/` after `/api/stats` readiness
  - In-window connection error UI with Retry (IPC)
  - Application menus (Edit, View with reload/zoom/fullscreen; no DevTools menu when packaged)
  - Window bounds persistence and titled chrome (`Antigravity Dashboard — Local`)
  - `setWindowOpenHandler` for OAuth-related popups (HTTPS and local HTTP)
affects:
  - 01-02 (web preload bridge and boneyard can assume HTTP origin in production)
  - Phase 2+ backend lifecycle and packaging

tech-stack:
  added: electron ^34, electron-store ^8, cross-env ^7
  patterns:
    - Readiness probe via `fetch` to `/api/stats` (any HTTP status implies server is listening, including 401 when dashboard auth is on)
    - `data:` URL error shell with preload-exposed `retryDashboardLoad`
    - Namespaced IPC channels `electron:*`

key-files:
  created: []
  modified:
    - electron/main.js
    - electron/preload.js
    - package.json

key-decisions:
  - "Treat any response from GET /api/stats as ready so DASHBOARD_SECRET auth does not block the probe."
  - "Omit `toggleDevTools` from the View menu when `app.isPackaged`; rely on default shortcuts for power users."
  - "Allow `window.open` for https and for http to 127.0.0.1/localhost (OAuth and local callback ports); other http(s) opens in the system browser."

patterns-established:
  - "Production navigation: wait → `loadURL(dashboardOrigin + '/')` — no `loadFile` for the dashboard."
  - "IPC surface exposed through `contextBridge` with `electron:` channel prefix in main."

duration: ~25min
completed: 2026-04-05
---

# Phase 1 Plan 01-01: Electron HTTP shell summary

**Packaged Electron now loads the dashboard from the Express HTTP origin on 127.0.0.1, with a `/api/stats` readiness wait, blocking error + Retry, OAuth-friendly popups, standard Edit/View menus (no DevTools menu item when packaged), and electron-store window bounds.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-05 (execution window)
- **Completed:** 2026-04-05
- **Tasks:** 2 (dependencies / implementation)
- **Files modified:** 4 (`package.json`, `pnpm-lock.yaml`, `electron/main.js`, `electron/preload.js`)

## Accomplishments

- Replaced production `loadFile` paths with `loadURL` to `http://127.0.0.1:<DASHBOARD_PORT||3456>/` after polling `/api/stats`.
- Added a `data:` URL error page with a Retry button wired through `preload` → `ipcMain` → `loadDashboardProduction()`.
- Registered `setWindowOpenHandler` for HTTPS and local HTTP popups; other navigations delegate to `shell.openExternal`.
- Built File / Edit / View menus; DevTools appears in View only in non-packaged builds.
- Persisted `BrowserWindow` bounds with `electron-store` and set the window title to **Antigravity Dashboard — Local**.

## Task commits

1. **Task 1: Dependencies and Electron entry** — `chore(01-01): add Electron, electron-store, and electron scripts`
2. **Task 2: HTTP shell, menus, IPC, persistence** — `feat(01-01): load packaged dashboard over HTTP with readiness and shell UX`

**Plan metadata:** separate `docs(01-01)` commit for this summary and `STATE.md`.

## Files created/modified

- `package.json` — `main`, `electron` / `electron:dev` scripts, `electron` and `electron-store` (and `cross-env`) dependencies.
- `pnpm-lock.yaml` — lockfile updated for new packages.
- `electron/main.js` — backend spawn unchanged in spirit; production load path, readiness, error page, menus, store, window-open handler.
- `electron/preload.js` — `electron:is-packaged` and `electron:dashboard-retry` bridge; renamed misleading `isPackaged` Promise exposure to `getIsPackaged()`.

## Decisions made

- Readiness uses `/api/stats` and accepts any HTTP status so `requireAuth` on `/api` does not block startup when `DASHBOARD_SECRET` is set.
- Packaged OAuth popups use `sandbox: true` and no `preload` (dashboard preload not required on provider pages); dev popups reuse the dashboard preload for Vite flows.

## Deviations from plan

None — plan executed as written. CONTEXT items such as boneyard skeleton and API failure banners are scoped to plan **01-02**, not 01-01.

## Issues encountered

- None blocking. Repository had a pre-existing deleted `.oxlintrc.json` (unchanged by this work).

## User setup required

None — uses existing `DASHBOARD_PORT` / default `3456` from the environment passed to the spawned backend.

## Next phase readiness

- **01-02** can add web-side preload usage (`getIsPackaged`, retry/reload affordances) and boneyard without changing the HTTP load contract.
- Validate packaged build on CI/installer pipelines when Phase 4 wiring exists; local `pnpm run electron:dev` still targets Vite without the readiness gate.

---
*Phase: 01-http-served-dashboard-express-origin*  
*Completed: 2026-04-05*
