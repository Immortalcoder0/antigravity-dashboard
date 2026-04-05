---
phase: 01-http-served-dashboard-express-origin
plan: "02"
subsystem: ui
tags: [react, electron, boneyard-js, tailwind, vite, preload, skeleton]

requires:
  - phase: 01-http-served-dashboard-express-origin
    provides: Electron loads dashboard from Express HTTP origin (plan 01-01)
provides:
  - Boneyard-driven dashboard shell skeleton with generated responsive bones
  - Opacity crossfade from skeleton to live chrome
  - Electron-only connectivity banner (Retry / Reload) driven by quota + accounts errors
  - Preload `antigravityShell` read-only bridge alongside existing `electronAPI`
affects:
  - Future Electron UX and error-handling phases
  - Regeneration of bones when `AppShell` layout changes

tech-stack:
  added: [boneyard-js]
  patterns:
    - "Skeleton `name` + `fixture` for CLI capture; `__BONEYARD_BUILD` bypasses auth gate"
    - "Connectivity banner only when `window.antigravityShell?.isElectron`"

key-files:
  created:
    - apps/web/src/bones/antigravity-dashboard-shell.bones.json
    - apps/web/src/bones/registry.js
    - apps/web/src/components/AppShell.tsx
    - apps/web/src/components/ElectronApiBanner.tsx
    - apps/web/src/hooks/useElectronApiBanner.ts
    - apps/web/src/types/global.d.ts
  modified:
    - apps/web/package.json
    - apps/web/src/main.tsx
    - apps/web/src/App.tsx
    - electron/preload.js
    - pnpm-lock.yaml

key-decisions:
  - "Auth prompt skipped when `window.__BONEYARD_BUILD` so `npx boneyard-js build` can snapshot the shell fixture"
  - "Banner uses `useQuota` `error` plus thrown `fetch` on `/api/accounts/local` (network) — not a global fetch monkey-patch"
  - "Retry runs full refresh plus `useWebSocket` `connect()` to nudge reconnection"

patterns-established:
  - "Regenerate bones from `apps/web`: `pnpm exec vite --port 5173` then `pnpm exec boneyard-js build http://localhost:5173`"

duration: 20min
completed: 2026-04-05
---

# Phase 1 Plan 02: Boneyard shell, crossfade, Electron API banner — Summary

**Boneyard snapshot skeleton for the dashboard chrome, 300ms opacity handoff to live UI, and preload `antigravityShell` with an Electron-only backend connectivity banner (Retry / Reload).**

## Performance

- **Duration:** ~20 min (estimated wall time including first Playwright Chromium download)
- **Tasks:** 2 automated tasks committed; **Task 3 is a blocking human-verify checkpoint** (plan `autonomous: false`)
- **Files touched:** 12 (see key-files above)

## Accomplishments

- Added **boneyard-js**, **configureBoneyard** defaults, and **captured** `antigravity-dashboard-shell` bones (6 Tailwind-derived breakpoints) under `apps/web/src/bones/`.
- **AppShell** extracts header, nav, and main region; **fixture** mirrors chrome for CLI capture without backend data.
- **Skeleton** gates on **`initialLoading`**; removed the old centered “Initializing…” copy in favor of skeleton-only loading.
- **Crossfade:** inner shell uses **`transition-opacity duration-300`** after `initialLoading` clears (double `requestAnimationFrame` before `opacity-100`).
- **preload** exposes **`antigravityShell: { isElectron: true, platform }`** without removing **01-01** `electronAPI` (retry packaged load, packaged flag, platform).
- **ElectronApiBanner** + **useElectronApiBanner**: visible in Electron when not loading and **`quotaError`** or **`accountsNetworkError`**; dismissible; **Retry** runs refresh + WebSocket **connect**; **Reload** uses **`location.reload()`**.

## Task commits

1. **Task 1: boneyard-js and skeleton shell** — `1d85edd` (feat)
2. **Task 2: preload bridge + Electron API banner** — `fdceb00` (feat)

**Plan metadata:** `docs(01-02): boneyard shell plan summary and state` (latest amend on `master`; see `git log -1 --oneline .planning`)

## Files created/modified

- `apps/web/package.json` / `pnpm-lock.yaml` — boneyard-js dependency
- `apps/web/src/main.tsx` — bones registry import + `configureBoneyard`
- `apps/web/src/App.tsx` — Skeleton, shell fade, boneyard build auth bypass, banner wiring
- `apps/web/src/components/AppShell.tsx` — shared chrome + placeholder main for fixture/fallback
- `apps/web/src/bones/*` — generated registry + JSON bones
- `electron/preload.js` — `antigravityShell` exposure
- `apps/web/src/hooks/useElectronApiBanner.ts`, `apps/web/src/components/ElectronApiBanner.tsx` — banner UX
- `apps/web/src/types/global.d.ts` — `window.antigravityShell` / `electronAPI` typing

## Decisions made

- **Boneyard auth bypass:** `__BONEYARD_BUILD` skips `AuthPrompt` so headless capture always sees the named `<Skeleton>` fixture.
- **Banner signals:** Quota hook network/API errors and accounts bootstrap **fetch throws** (offline / connection refused), not generic HTTP 4xx from quota polling.

## Deviations from plan

None — plan executed as written. (Optional: full-repo `tsc --noEmit` still reports **pre-existing** unused-import/NodeJS issues in other files; **`pnpm --filter @antigravity/web run build`** succeeds.)

## Issues encountered

- First **`boneyard-js build`** run downloaded Playwright Chromium (~300MB total) on this machine; subsequent runs reuse the browser cache.

## User setup required

None for code paths. To **regenerate bones** after layout changes:

1. From `apps/web`: start dev server, e.g. `pnpm exec vite --port 5173`
2. `pnpm exec boneyard-js build http://localhost:5173` (add `--wait` if the shell is slow to paint)
3. Commit updated `src/bones/*.bones.json` and `src/bones/registry.js`

## Human verification (checkpoint — blocking)

Plan **01-02** requires manual sign-off before treating the phase checkpoint as closed.

1. **Browser / Vite:** Run `pnpm dev` (or start backend + web as you usually do). Open the dashboard — confirm the **boneyard shell** appears first, then **fades** into the live UI; no import/console errors from boneyard.
2. **Electron healthy:** With the local backend up, open the packaged/dev Electron window — dashboard loads over **http** origin (01-01), data visible, **no banner** when API and WebSocket are healthy.
3. **Electron degraded:** Stop the backend; restart Electron (or wait after load). Confirm **01-01 error UX** where applicable **and/or**, once the SPA is up, the **connectivity banner** with **Retry connection** / **Reload dashboard**; starting the backend and using **Retry** should recover (or Reload).

**Resume signal:** Type **`approved`** or describe issues to fix.

## Next phase readiness

- Bones are checked in; **re-run boneyard** whenever `AppShell` geometry changes materially.
- After human **approved**, this plan is complete for roadmap criteria **1** and **3** as verified manually.

---
*Phase: 01-http-served-dashboard-express-origin*  
*Completed: 2026-04-05 (pending human verification approval)*
