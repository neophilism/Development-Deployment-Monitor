# Development Deployment Monitor agent instructions

- This repository is the **only** deployment monitor/control plane; source projects integrate through their own `.github/deployment-monitor.json` and DDM's shared validation workflow.
- Enrollment scope: every owned GitHub repository **except** historical creation-order four `pupil`, `neurosynth`, `facerec`, `hubs`; on 2026-10-20 there are 58 eligible existing repos plus DDM itself. Never alter the excluded four.
- Preserve each repository's existing app, deployment branches, database and credentials. No fake healthy statuses, no zero-count substitution for missing data, no invented provider endpoints.
- Funding constraint: **zero incremental USD**. Never authorize paid/flexible-billing provider usage, automatic recharge or new account without explicit owner approval. Treat free provider accounts as shared finite quotas.
- Automated failover is not the same as automatic deployment. Promote an already verified warmed standby only after independent failure quorum, router authority, exact release match and exclusive writer fencing when stateful. Until these are implemented and tested, only emit a non-executable proposal.
- No public exposure of private operational identifiers, credentials, database addresses, support ticket details or unapproved domains. The monitor is a public repository.
- The owner has a second agent working on Engine Room Vercel deployment; integrate minimally and do not alter that agent's infrastructure configuration.
- CI is authoritative for whether code passes. Merge only exact-head green verified changes; in-progress checks are not successes. Prefer scoped PRs and never request `neophilism` as PR reviewer.
- Canonical development units: `registry/prs.json`. Do not convert planned PR units into "partially implemented" based on empty `prs`; distinguish actual GitHub PR evidence and operational acceptance. Source files: `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_PLAN.md`, `docs/INTEGRATION.md`.
- The Github Actions scanner is best effort and cannot deliver guaranteed instant failover. A deployed multi-region/router service with stateful fencing is the production milestone, not a skipped human audit.

## Free-resource allocation, database and report policy — Oct 20, 2026

- Read `registry/free-resources.json`, `registry/render-services-2026-10-20.json`, `docs/ACCOUNTS_AND_KEYS.md`, and the SQL schema before recommending hosting. 62 catalogue entries do NOT mean 62 immediately usable free production hosts.
- User needs ONE appropriate active deployment per service, not one deployment on each provider. Keep a dynamically ranked compatibility- and performance-aware list of fallback choices. Collect request volume, cold start, readiness latency, CPU/memory, database/egress use, quota consumption, real USD invoices, provider pricing and auth/feature readiness evidence.
- Never claim all 23 Render-suspended services recovered until each actually works elsewhere (or is explicitly retired). Report every affected runtime separately even when multiple runtimes share a repository.
- Central report API on Cloudflare D1 is NOT live until Cloudflare connected. Do not treat static historical preview as realtime. Existing Neon org is on Launch and should not be billed for new monitoring DB creation.
- New repos: use read-only GitHub discovery. An owner-scoped GitHub App secret is required for cross-repo enrollment PR creation; never try to forge or expose it. The first four oldest are excluded forever. New repo classification and free-host shortlist are re-evaluated based on actual code and measured provider offers.
- Paid forecast is cost-constrained optimization from real history, not simply multiplying counts of repos by server plans. A static site or library often needs no paid app server at all, and several services may share a host safely where memory/isolation allows.
