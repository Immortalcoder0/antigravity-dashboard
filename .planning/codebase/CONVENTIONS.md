# Coding Conventions

**Analysis Date:** 2026-04-05

## Naming Patterns

**Files:**
- Backend modules and utilities: `camelCase.ts` (e.g. `accountsFile.ts`, `authMiddleware.ts`).
- React page/feature components: `PascalCase.tsx` in `apps/web/src/components/` (e.g. `AccountsPage.tsx`, `SettingsPage.tsx`).
- Hooks: `use` prefix + `camelCase.ts` in `apps/web/src/hooks/` (e.g. `useQuota.ts`, `useDashboardStore.ts` lives under `stores/` with `use` prefix).
- Types: shared interfaces in `apps/backend/src/types/` and `apps/web/src/types/` — keep names aligned when duplicated.

**Functions:**
- `camelCase` for functions and methods.
- Async helpers use no special prefix (e.g. `proxyToManager`, `isManagerAvailable` in `apps/backend/src/server.ts`).
- Event-style handlers in UI: `handleX` / `onX` props as usual in React.

**Variables:**
- `camelCase` for locals and properties.
- `UPPER_SNAKE_CASE` for module-level constants (e.g. `ACCOUNTS_FILE_PATH`, `MANAGER_URL` in `apps/backend/src/server.ts`).

**Types:**
- Interfaces and type aliases: `PascalCase` (e.g. `LocalAccount`, `DashboardState` in `apps/web/src/stores/useDashboardStore.ts`).
- No `I` prefix on interfaces.
- Prefer `import type { ... }` for type-only imports where split (see `apps/web/src/components/AccountsPage.tsx`).

## Code Style

**Formatting:**
- No Prettier or Biome config in the repository root; style follows existing files (2-space indent in sampled TS/TSX).
- Not detected: enforced line length or quote style via tooling.

**Linting:**
- Tool: **oxlint** (`oxlint` in root `package.json`).
- Config: `.oxlintrc.json` at repository root.
- Plugins: `typescript`, `import`, `unicorn`, `promise`.
- Category defaults: `correctness` → error; `suspicious` / `perf` → warn; `pedantic` / `style` / `restriction` / `nursery` → off.
- Notable rules: `no-debugger` → error; `no-console` → off; `no-unused-vars` → warn; `typescript/no-explicit-any` → warn; several `unicorn/*` rules explicitly off (e.g. `unicorn/no-null`, `unicorn/prefer-module`).
- Ignore patterns include `dist`, `node_modules`, `coverage`, `tasks`, `*.min.js`.

**Run:**
```bash
pnpm run lint       # oxlint
pnpm run lint:fix   # oxlint --fix
```

**TypeScript (strictness):**
- Backend: `apps/backend/tsconfig.json` — `strict: true`, CommonJS, `ES2020`.
- Web: `apps/web/tsconfig.json` — `strict: true`, `noUnusedLocals` / `noUnusedParameters`, `noFallthroughCasesInSwitch`, path alias `@/*` → `./src/*`.
- Backend verification: `pnpm --filter=@antigravity/backend run typecheck` runs `tsc --noEmit`.

**Project anti-patterns (from `AGENTS.md`):**
- Avoid `as any` and `@ts-ignore` — strict mode is the expectation.

## Import Organization

**Order (observed):**
1. Side-effect imports first when needed (e.g. `dotenv` in `apps/backend/src/server.ts`).
2. Node built-ins (`path`, `fs`, `crypto`).
3. External packages (`express`, `cors`, `react`).
4. Internal relative imports (`./services/...`, `../hooks/...`).
5. `import type` may appear inline with value imports or grouped; type-only for React/large types is used in places.

**Path aliases:**
- Web only: `@/` → `apps/web/src/` (see `apps/web/tsconfig.json`).

**Grouping:**
- No enforced blank-line rule in tooling; one blank line between groups is common in larger files.

## Error Handling

**Patterns:**
- Express route handlers: wrap logic in `try/catch`, respond with `res.status(500).json({ success: false, error: ... })` on failure (see `apps/backend/src/server.ts` routes such as `/api/accounts/local`).
- Some async helpers return `null` or `false` on failure instead of throwing (e.g. `proxyToManager` returns `null` after `console.error`).
- Empty `catch { }` used sparingly for cleanup (e.g. `activeAuthServer?.close()`).
- `FileLogger` in `apps/backend/src/services/fileLogger.ts`: catch write failures, `console.error` with `[FileLogger]` prefix — do not throw from logging.

**Error types:**
- Catch clauses sometimes use `error: any` to read `.message` — oxlint warns on `any`; prefer narrowing or `unknown` + type guards in new code.

## Logging

**Framework:**
- `console.log` / `console.error` widely used (allowed by oxlint `no-console: off`), often with bracketed prefixes (`[Server]`, `[Proxy]`, `[FileLogger]`).
- Structured file logging: `FileLogger` class in `apps/backend/src/services/fileLogger.ts` — JSON lines per day under `~/.config/opencode/antigravity-dashboard/logs/`.

**Patterns:**
- Log errors with enough context to identify the operation (manager proxy, sync, etc.).
- Service boundaries: quota/proxy paths log via dedicated helpers or `FileLogger` where wired.

## Comments

**When to comment:**
- Short section comments in large files (e.g. `server.ts`) for security, rate limits, or route groups.
- Explain non-obvious behavior (env path resolution, Electron vs dev).

**JSDoc/TSDoc:**
- Sparse; used for public methods where clarity helps (e.g. `FileLogger.log` in `apps/backend/src/services/fileLogger.ts`).

**TODO comments:**
- Not standardized; search with `TODO`/`FIXME` if auditing.

## Function Design

**Size:**
- `apps/backend/src/server.ts` is a monolithic route file (2000+ lines) — new routes should still follow existing try/catch + JSON response patterns; consider splitting only when coordinated with architecture docs.

**Parameters:**
- Options objects and destructuring in React components; Express uses `req, res` standard.

**Return values:**
- API JSON shape: `{ success: boolean, data?: ..., error?: string }` is common for success/error responses.

## Module Design

**Exports:**
- Backend services: singleton factories like `getAccountsService()`, `getMonitor()` (see `apps/backend/src/services/`).
- React: default export for root `App` in `apps/web/src/App.tsx`; named exports for components as needed.

**Barrel files:**
- Not a heavy pattern; imports target concrete files.

---

*Convention analysis: 2026-04-05*
*Update when patterns change*
