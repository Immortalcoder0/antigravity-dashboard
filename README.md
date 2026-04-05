# Antigravity Dashboard

Real-time multi-account Google Cloud quota monitor with a Claude/OpenAI-compatible proxy.

Repository: https://github.com/Immortalcoder0/antigravity-dashboard

## What it includes

- Express backend (`apps/backend`)
- React + Vite frontend (`apps/web`)
- Optional Electron shell (`electron`)
- SQLite-backed usage tracking
- WebSocket live updates

## Requirements

- Node.js `>=18`
- `pnpm`

## Setup

```bash
pnpm install
```

Copy `.env.example` to `.env` and configure OAuth values before running locally.

## Run

```bash
# Start backend
pnpm start

# Run workspace dev scripts
pnpm run dev

# Build all workspaces
pnpm run build

# Lint
pnpm run lint
pnpm run lint:fix
```

## Electron

```bash
# Run Electron in dev mode
pnpm run electron:dev

# Build Electron artifacts into /release
pnpm run electron:build

# Run Electron against production builds
pnpm run electron:preview
```

## Project structure

```text
apps/backend/   Express server, API proxy, services
apps/web/       Dashboard UI
electron/       Electron main/preload
release/        Electron build output
```

## Security notes

- Keep `.env` private.
- OAuth account data is local runtime data and must not be committed.
- Use `DASHBOARD_SECRET` when exposing the dashboard beyond localhost.

## License

MIT. See `LICENSE`.
