# Project state: Antigravity Dashboard — Electron Desktop

## Project reference

- **Core value:** Users install and run the full quota dashboard locally as a desktop app—with the same backend and UI behavior as the web app, reliable API/WebSocket/OAuth in packaged builds, and updates via GitHub Releases.  
- **Source of truth:** [PROJECT.md](./PROJECT.md) (scope, constraints, decisions).  
- **Requirements:** [REQUIREMENTS.md](./REQUIREMENTS.md).  
- **Roadmap:** [ROADMAP.md](./ROADMAP.md).

## Current position

| Field | Value |
|-------|--------|
| **Phase** | 3 — Live WebSocket updates |
| **Focus** | `/ws` parity in packaged app, same-origin to dashboard server. |
| **Plan** | [ROADMAP.md](./ROADMAP.md) Phase 3. |
| **Status** | Phase 2 complete — verification **passed** (structural + documented human checks): [02-VERIFICATION.md](./phases/02-backend-lifecycle/02-VERIFICATION.md). |

**Progress:** `██░░░░░░░░ 2/12 phases complete` (see [ROADMAP.md](./ROADMAP.md))

## Performance metrics

| Metric | Value |
|--------|--------|
| Last roadmap update | 2026-04-06 |
| Depth mode | comprehensive |

## Accumulated context

### Decisions (from PROJECT.md)

- Electron shell wraps existing pnpm monorepo; Express sidecar remains the HTTP server for API, static SPA, and OAuth callback on port 51121.
- Do not change OAuth client IDs or redirect URIs beyond existing registration.
- Tray / minimize-to-tray is out of scope for v1.

### Decisions (from 01-01 / 01-02 execution)

(See prior STATE archive in git history; unchanged in substance.)

### Decisions (from 02 execution)

| Decision | Rationale |
|----------|-----------|
| `window-all-closed` → `app.quit()` on all platforms (including darwin) | Matches 02-CONTEXT: closing the last window stops the app like Quit; avoids activate path with no running backend. |
| Bind-shaped failures use `dialog`; generic readiness failure uses in-window error page + relaunch Retry | One primary surface per failure class; avoids double prompts. |
| `bootPackagedShell` reused from `activate` when zero windows | Rare after quit-on-last-window; covers edge relaunch. |

### Open items

- Pin exact Electron major for native rebuild alignment during implementation.
- Validate CORS / load URL host alignment if proxy or origins differ between dev and packaged builds.
- Run human checklist in [02-VERIFICATION.md](./phases/02-backend-lifecycle/02-VERIFICATION.md) on packaged builds (orphan process, port conflict, skeleton timing).

### Blockers

- None recorded.

## Session continuity

- **Last session:** 2026-04-06 — Phase 2 executed (`02-01`–`02-03`): main-process lifecycle, IPC/relaunch/dialogs, web shell gate; **02-VERIFICATION.md** recorded.
- **Next action:** Phase 3 — `/gsd-discuss-phase 3` or `/gsd-plan-phase 3`.
- **Resume file:** None
- **Research:** [research/SUMMARY.md](./research/SUMMARY.md) — stack and phase ordering validated.

---
*STATE initialized: 2026-04-05*  
*Last updated: 2026-04-06*
