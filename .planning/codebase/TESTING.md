# Testing Patterns

**Analysis Date:** 2026-04-05

## Test Framework

**Runner:**
- Not configured. Root `package.json` has no `test` script; `apps/backend/package.json` and `apps/web/package.json` have no test runner dependencies (no Vitest, Jest, or Node test runner).

**Assertion library:**
- Not applicable until a runner is added.

**Run commands:**
```bash
pnpm run lint                                    # oxlint — current automated quality gate
pnpm --filter=@antigravity/backend run typecheck # tsc --noEmit (backend)
```

There is no `pnpm test` or watch command today.

## Test File Organization

**Location:**
- No `*.test.ts`, `*.spec.ts`, or `*.test.tsx` files under `apps/backend/src` or `apps/web/src` in this repository state.
- No `vitest.config.*` or `jest.config.*` at repo root or in workspaces.

**Naming:**
- When adding tests, prefer co-located names: `moduleName.test.ts` next to `moduleName.ts` (common TypeScript convention; not yet present).

**Structure:**
```
apps/
├── backend/src/     # source only — no *.test.ts detected
└── web/src/         # source only — no *.test.ts detected
```

## Test Structure

**Suite organization:**
- Not applicable — no test suites in repo.

**Patterns to adopt when introducing tests:**
- Use `describe` / `it` (or `test`) with a runner such as Vitest aligned with TypeScript workspaces.
- Keep backend tests in `apps/backend` and frontend tests in `apps/web` so each package keeps its own config.

**Setup/teardown:**
- Not detected.

## Mocking

**Framework:**
- Not applicable.

**Patterns:**
- For future HTTP/route tests: mock `fetch` or inject dependencies rather than hitting live Google/manager URLs.
- For SQLite: use isolated DB files or in-memory patterns if `better-sqlite3` is tested.

**What to mock:**
- External APIs (Google Cloud, manager service), filesystem paths for accounts JSON, and network when testing proxy layers (`apps/backend/src/services/apiProxy/`).

**What not to mock:**
- Pure transforms and small utilities until they need isolation.

## Fixtures and Factories

**Test data:**
- No shared fixtures directory detected.

**Location:**
- When adding tests, place reusable factories beside the test file or under `apps/backend/src/__tests__/fixtures/` / `apps/web/src/__tests__/fixtures/` only if shared across files.

## Coverage

**Requirements:**
- No coverage threshold or CI coverage report detected (no `.github` workflows with tests in this snapshot).

**Configuration:**
- Not applicable.

**View coverage:**
- After adding a runner with coverage (e.g. Vitest + `--coverage`), document the exact script in root `package.json`.

## Test Types

**Unit tests:**
- Not present. Target pure functions first (e.g. `apps/backend/src/services/tierDetection.ts`, `apps/web/src/hooks/` helpers) when introducing tests.

**Integration tests:**
- Not present. Route-level tests would target `apps/backend/src/server.ts` or extracted routers; require a test HTTP client (supertest-style) if adopted.

**E2E tests:**
- Not used (no Playwright/Cypress in workspace `package.json` files).

## Common Patterns

**Async testing:**
- Not applicable until framework exists. Prefer `async`/`await` with `expect(...).resolves` / `rejects` if using Vitest/Jest-compatible APIs.

**Error testing:**
- Not applicable.

**Snapshot testing:**
- Not used.

---

*Testing analysis: 2026-04-05*
*Update when test patterns change*
