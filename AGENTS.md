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
