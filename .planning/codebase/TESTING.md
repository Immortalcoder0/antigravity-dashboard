# Testing

**Analysis Date:** 2026-04-05

## Test Setup

### Current Status: NO TEST FRAMEWORK

The antigravity-dashboard project has **no testing infrastructure**. There are no test dependencies, no test scripts, no test configuration files, and no test files within the `apps/` workspace.

### What Was Checked
- **No test dependencies** in `package.json` (root, backend, or web)
- **No test scripts** — only `build`, `dev`, `start`, `lint`, `lint:fix`
- **No test config files** — no `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `cypress.config.*` in `apps/`
- **No test files** — no `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, or `__tests__/` directories in `apps/`
- **No CI/CD** — no `.github/workflows/`, no `.gitlab-ci.yml`

### External Skill Tests (Not Part of This Project)
The only test file in the repository is `.opencode/skills/dev-browser/src/snapshot/__tests__/snapshot.test.ts` — this belongs to the dev-browser skill, not the antigravity-dashboard project. It uses **vitest + playwright** but is unrelated to the dashboard codebase.

## Test Structure

### Not Applicable (No Tests Exist)

When tests are added, the following structure is recommended based on existing codebase patterns:

**Recommended test file locations:**
- **Backend**: `apps/backend/src/**/*.test.ts` (co-located with source)
- **Frontend**: `apps/web/src/**/*.test.tsx` (co-located with source)

**Recommended naming:**
- `accountsFile.test.ts` — tests for `accountsFile.ts`
- `quotaService.test.ts` — tests for `quotaService.ts`
- `monitor.test.ts` — tests for `monitor.ts`
- `authMiddleware.test.ts` — tests for `authMiddleware.ts`
- `useQuota.test.ts` — tests for `useQuota.ts` hook

## Existing Tests

**None.** Zero test coverage across the entire codebase.

### Untested Critical Areas

| Area | Files | Risk |
|------|-------|------|
| OAuth flow | `server.ts` (lines 392-587) | High — authentication, token exchange |
| Account CRUD | `server.ts` (lines 592-700) | High — data mutation |
| Quota fetching | `services/quotaService.ts` | High — core business logic |
| Account file watcher | `services/accountsFile.ts` | High — file I/O, state management |
| WebSocket manager | `services/websocket.ts` | Medium — real-time updates |
| SQLite operations | `monitor.ts` | High — data persistence |
| API proxy | `services/apiProxy/` | High — request transformation |
| Auth middleware | `utils/authMiddleware.ts` | High — security |
| File logger | `services/fileLogger.ts` | Medium — logging |
| Tier detection | `services/tierDetection.ts` | Medium — business logic |
| All React components | `components/*.tsx` | Medium — UI rendering |
| All custom hooks | `hooks/*.ts` | Medium — data fetching |
| Zustand store | `stores/useDashboardStore.ts` | Medium — state management |

## Testing Patterns

### Recommended Patterns (Based on Codebase Architecture)

#### Backend Unit Tests
```typescript
// apps/backend/src/services/accountsFile.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AccountsService } from './accountsFile';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

describe('AccountsService', () => {
  let service: AccountsService;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), 'antigravity-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });
    service = new AccountsService(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should add an account', async () => {
    const account = await service.addAccount({
      email: 'test@example.com',
      refreshToken: 'test-token',
    });
    expect(account.email).toBe('test@example.com');
  });
});
```

#### Database Tests (monitor.ts)
```typescript
// apps/backend/src/monitor.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UsageMonitor } from './monitor';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync } from 'fs';

describe('UsageMonitor', () => {
  let monitor: UsageMonitor;
  let dbPath: string;

  beforeEach(() => {
    dbPath = join(tmpdir(), `test-usage-${Date.now()}.db`);
    monitor = new UsageMonitor(dbPath);
  });

  afterEach(() => {
    monitor.close();
    rmSync(dbPath, { force: true });
  });

  it('should log and retrieve API calls', () => {
    monitor.logApiCall({
      timestamp: Date.now(),
      account_email: 'test@example.com',
      model: 'claude-sonnet-4-5',
      endpoint: '/v1/messages',
      duration_ms: 1500,
      status: 'success',
    });

    const stats = monitor.getAccountStats();
    expect(stats).toHaveLength(1);
    expect(stats[0].email).toBe('test@example.com');
  });
});
```

#### Frontend Hook Tests
```typescript
// apps/web/src/hooks/useQuota.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useQuota } from './useQuota';

describe('useQuota', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch quotas on mount', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: { quotas: [], cacheAge: 0 },
      }),
    });

    const { result } = renderHook(() => useQuota(100));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.quotas).toEqual([]);
  });
});
```

#### Auth Middleware Tests
```typescript
// apps/backend/src/utils/authMiddleware.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateToken, requireAuth, isAuthEnabled } from './authMiddleware';

describe('authMiddleware', () => {
  const originalSecret = process.env.DASHBOARD_SECRET;

  afterEach(() => {
    process.env.DASHBOARD_SECRET = originalSecret;
  });

  describe('isAuthEnabled', () => {
    it('should return false when no secret is set', () => {
      delete process.env.DASHBOARD_SECRET;
      expect(isAuthEnabled()).toBe(false);
    });

    it('should return true when secret is set', () => {
      process.env.DASHBOARD_SECRET = 'test-secret';
      expect(isAuthEnabled()).toBe(true);
    });
  });

  describe('validateToken', () => {
    it('should always return true when auth is disabled', () => {
      delete process.env.DASHBOARD_SECRET;
      expect(validateToken('anything')).toBe(true);
    });

    it('should reject invalid tokens when auth is enabled', () => {
      process.env.DASHBOARD_SECRET = 'correct-secret';
      expect(validateToken('wrong-token')).toBe(false);
    });

    it('should accept valid tokens', () => {
      process.env.DASHBOARD_SECRET = 'test-secret';
      expect(validateToken('test-secret')).toBe(true);
    });
  });
});
```

## Mocking

### Recommended Mocking Strategy

#### What to Mock
- **External APIs**: Google Cloud Code API (quota fetching), OAuth token endpoints
- **File system**: `accountsFile.ts` — use temp directories
- **Database**: `monitor.ts` — use in-memory SQLite (`:memory:`)
- **WebSocket connections**: Mock `ws` server/client
- **`fetch`**: Global fetch mock for frontend tests
- **`process.env`**: For auth/config tests

#### What NOT to Mock
- **Business logic**: Tier detection, quota calculations, burn rate calculations
- **Type conversions**: Data transformation functions
- **Utility functions**: Retry helpers, error helpers

### Mock Pattern for Services
```typescript
// Mock singleton pattern
vi.mock('./monitor', () => ({
  getMonitor: vi.fn(() => mockMonitor),
  UsageMonitor: vi.fn(() => mockMonitor),
}));
```

## CI Integration

### Current Status: None

No CI/CD pipeline exists. No GitHub Actions, no GitLab CI, no test commands in any configuration.

### Recommended CI Setup
```yaml
# .github/workflows/test.yml (recommended)
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm --filter=@antigravity/backend run typecheck
      - run: pnpm --filter=@antigravity/backend run test
      - run: pnpm --filter=@antigravity/web run test
```

## Gaps

### Critical Testing Gaps

1. **Zero test coverage** — No tests exist for any code
2. **No test framework** — No vitest, jest, playwright, or cypress installed
3. **No CI pipeline** — No automated test runs on push/PR
4. **No type checking in CI** — `typecheck` script exists for backend but is not automated
5. **No integration tests** — No end-to-end testing of API routes
6. **No component tests** — No React component rendering tests
7. **No mock infrastructure** — No test utilities, factories, or fixtures
8. **No coverage requirements** — No coverage targets or reporting

### Recommended Priority Order for Adding Tests

1. **Auth middleware** (`utils/authMiddleware.ts`) — Security-critical, simple to test
2. **Account CRUD** (`services/accountsFile.ts`) — Core data operations
3. **Database operations** (`monitor.ts`) — Data persistence, use temp SQLite
4. **Quota service** (`services/quotaService.ts`) — Core business logic
5. **Tier detection** (`services/tierDetection.ts`) — Pure functions, easy to test
6. **API proxy converters** (`services/apiProxy/converter.ts`) — Request transformation
7. **Zustand store** (`stores/useDashboardStore.ts`) — State management
8. **Custom hooks** (`hooks/*.ts`) — Data fetching with mocked fetch
9. **React components** (`components/*.tsx`) — UI rendering
10. **WebSocket manager** (`services/websocket.ts`) — Real-time communication

## Running Tests

### Current Commands
**No test commands exist.** The following scripts would need to be added:

```bash
# Recommended additions to package.json scripts:

# Root level
"test": "pnpm -r run test"

# Backend (apps/backend/package.json)
"test": "vitest run"
"test:watch": "vitest"
"test:coverage": "vitest run --coverage"

# Frontend (apps/web/package.json)
"test": "vitest run"
"test:watch": "vitest"
"test:coverage": "vitest run --coverage"
```

### Recommended Test Dependencies to Add
```bash
# Both workspaces
pnpm add -D vitest

# Frontend additionally needs
pnpm add -D @testing-library/react @testing-library/jest-dom jsdom
```

---

*Testing analysis: 2026-04-05*
