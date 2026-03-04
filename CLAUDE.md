# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Fredy?

Fredy is a self-hosted real estate listing aggregator for Germany. It scrapes platforms (ImmoScout24, Immowelt, Kleinanzeigen, WG-Gesucht, etc.) and sends notifications (Slack, Telegram, Email, Discord, ntfy, etc.) when new listings appear. It has a React web UI for managing searches.

## Commands

```bash
# Development
yarn start:backend:dev        # Backend with hot reload (nodemon), port 9998
yarn start:frontend:dev       # Vite dev server (proxies /api to :9998)

# Production
yarn build:frontend           # Vite build → ui/public
yarn start:backend            # NODE_ENV=production

# Testing
yarn test                     # Full Mocha test suite (includes provider tests needing live sites)
yarn testGH                   # CI-safe subset (excludes live provider tests)

# Code quality
yarn lint                     # ESLint
yarn format                   # Prettier

# Database
yarn migratedb                # Run SQLite migrations
```

Pre-commit hook (husky + lint-staged) runs lint, format, and copyright check automatically.

## Architecture

### Core Pipeline (`lib/FredyPipelineExecutioner.js`)

The central orchestrator runs this pipeline per provider/job:

**URL prep → Extract (Puppeteer) → Normalize → Filter → Find new (hash comparison) → Geocode → Store (SQLite) → Distance calc → Similarity filter → Notify**

Each step is a chained promise. `NoNewListingsWarning` is thrown (and caught) as flow control when no new listings exist.

### Plugin System

**Providers** (`lib/provider/`): Each file exports `config`, `metaInformation`, and `init()`. The config defines CSS selectors (`crawlContainer`, `crawlFields`), a `normalize()` function, and a `filter()` function. Some providers (e.g., immoscout) override the default Puppeteer extraction with a custom `getListings()` that hits APIs directly.

**Notification Adapters** (`lib/notification/adapter/`): Each adapter handles sending listings to a specific channel. Loaded dynamically by `lib/utils.js`.

### Backend (`lib/`)

- **API**: Restana-based REST API (`lib/api/`) with route files in `lib/api/routes/`
- **Storage**: Better-SQLite3 with migration system (`lib/services/storage/migrations/`)
- **Scheduling**: node-cron jobs (`lib/services/jobs/jobExecutionService.js`)
- **Extraction**: Puppeteer with stealth plugin (`lib/services/extractor/`)
- **Events**: SSE-based event bus for real-time job status updates to the frontend

### Frontend (`ui/src/`)

React 19 + Vite + Semi UI component library + Zustand for state. MapLibre GL for listing maps, Chart.js for analytics. React Router 7 for routing.

## Tech Stack

- **Runtime**: Node.js 22 (ESM throughout)
- **Database**: SQLite via better-sqlite3
- **Scraping**: Puppeteer + puppeteer-extra-plugin-stealth + Cheerio
- **Testing**: Mocha + Chai + esmock (ESM mocking)
- **Linting**: ESLint flat config (`eslint.config.js`)

## Key Patterns

- All source uses ES modules (`import`/`export`), no CommonJS
- Provider and adapter modules are auto-discovered by scanning their directories (`lib/utils.js`)
- Database migrations are versioned numerically in `lib/services/storage/migrations/`
- The similarity cache (`lib/services/similarity-check/`) deduplicates listings across providers using title/address/price comparison
- Docker build uses system Chromium instead of bundled Puppeteer Chromium
