# Development Deployment Monitor (DDM)

Portfolio-wide **free-resource optimizer, verified deployment watcher and future automatic failover controller** for all `neophilism` repositories except the four oldest (`pupil`, `neurosynth`, `facerec`, `hubs`).

**October 20, 2026 scope:** 58 eligible pre-existing repositories, each with an integration PR; unmerged PRs are not considered installed. An independent Render audit found 23 suspended free web deployments across 19 repositories and one running static site. **No replacement host is claimed live yet.**

## What is implemented and what is waiting

- [62 free-resource candidates](registry/free-resources.json) across static, SSR/edge, container, VM, database, file/object storage, cache, email, monitoring, auth, CI and GPU research.
- [23 suspended services](registry/render-services-2026-10-20.json) with conservative workload classification, provisional individually ranked free-host alternatives and zero recorded successful replacements.
- [Host ranking engine](src/placement.mjs) with commercial-use, resource compatibility, always-on, shared quota, paid-overage and verified account restrictions.
- [Paid forecast model](src/forecast.mjs), explicit about missing usage data. [Historical sample report](reports/PRELIMINARY.md) is **not** an actual quote or approved spending.
- [Database schema and idempotent historical seed](db/sqlite/001_init.sql) ([seed](db/sqlite/002_seed_inventory.sql)) for services, providers, cost/revision history, uptime, quota samples, incidents, failovers and recommendation scores.
- [Cloudflare Worker + D1 monitor](workers/ddm/src/index.mjs) with five-minute free cron, protected `/api/report` and safe external readiness polling; [live report UI](site/index.html) loads only when its Generate report button is clicked. This is code, **not** a connected or running worker.
- [New-repository discovery](src/discover.mjs) for future source repositories, with scope-restricted GitHub App enrollment PRs only when separately authorized.

### Exactly one active host

Every deployment has a preferred primary and a dynamic fallback ranking. **Do not deploy 58 × 62 copies.** Each project's code specifies its actual runtime requirements; the allocator must respect provider account-wide capacity. Runtime credentials stay only in authorized secret managers. The monitor never silently activates a paid plan.

**No magical instant failover:** providers cannot guarantee immediate availability after a cold build. Automatic traffic switching requires a previously verified standby and an independently operating router, plus exclusive writer fencing for stateful apps. Github Actions is slower best-effort monitoring, not the fast route.

## Start here

- [Accounts, signup URLs, API tokens and secrets checklist](docs/ACCOUNTS_AND_KEYS.md).
- [Historical preliminary spending sensitivity](reports/PRELIMINARY.md) and [free resource catalog](registry/free-resources.json).
- [Architecture](docs/ARCHITECTURE.md), [50-unit roadmap](docs/DEVELOPMENT_PLAN.md), [client integration](docs/INTEGRATION.md).
- [Cloudflare D1 setup and live reporting instructions](docs/ACCOUNTS_AND_KEYS.md#step-by-step-ddm-monitoring-deployment).

```sh
npm test
npm run inventory:check
npm run report:build
npm run db:seed:generate
npm run discover:check
```

**Current external dependencies:** Cloudflare Free account + D1 + safe viewer secret; one or more verified free application-host accounts; secure transfer of existing app secrets out of Render. Existing Neon organization has paid Launch usage, so DDM does not automatically create a new Neon database.

Do not enter API keys, database passwords, SSH private keys, or payment-card details into GitHub source, issues, PR comments or public chat.
