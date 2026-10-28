# DDM — comprehensive incremental development and rollout plan

**Canonical planned work:** `registry/prs.json` has **50 stable DDM units**. A unit is not an opened pull request or a real deployment; `prs: []` is an intentional pending status until linked to actual GitHub evidence. Work in dependency order, chain safe green PRs, and keep source/operational acceptance distinct.

## Phase strategy

- **Foundation:** scope, schema, public-safe approvals, provider classifications, read-only health probes and GitHub CI; no actuation.
- **Enrollment:** Reconcile the rolling eligible repository cohort with small per-repository contract PRs and a shared CI validation workflow; no DNS or hosting actions. Empty repositories are recorded as blockers and do not receive fabricated application code or deployment claims.
- **Trust and monitoring:** provider-authenticated events, 2+ independent probe networks, durable incident/quota history, split-brain prevention and explicit zero-dollar enforcement.
- **Routing and stateful operation:** stable-origin router, automatic *preprovisioned* failover in permitted cases, recovery runbooks, fencing epochs, verified endpoint authorization and rollback.
- **Provider adapters:** one capability-gated adapter per provider. Implement native zero-cost first, cost-risk adapters disabled unless authorized.
- **Owner dashboard and rollout:** readable health/incident/cost status; Boardroom and Engine Room integrations are observational and do not hijack development. Canary with a real verified host, then gradual rollout.

## Units, in order

- **DDM-001 — Repository inventory and four-oldest exclusion lock** (Foundation, P0). Dependencies: none.
- **DDM-002 — Shared PR registry and agent constraints** (Foundation, P0). Dependencies: DDM-001.
- **DDM-003 — Per-repository deployment contract schema** (Foundation, P0). Dependencies: DDM-001.
- **DDM-004 — Provider capability and zero-cost risk catalog** (Foundation, P0). Dependencies: DDM-001.
- **DDM-005 — Local contract validator and CI** (Foundation, P0). Dependencies: DDM-003, DDM-004.
- **DDM-006 — Approval-only HTTPS target registry** (Foundation, P0). Dependencies: DDM-003.
- **DDM-007 — Read-only readiness probing with exact response checks** (Foundation, P0). Dependencies: DDM-005, DDM-006.
- **DDM-008 — Hardened failover policy planner, default non-executing** (Foundation, P0). Dependencies: DDM-007.
- **DDM-009 — Central read-only GitHub Actions scanning and reusable CI** (Foundation, P0). Dependencies: DDM-005, DDM-007.
- **DDM-010 — Integrate the rolling eligible repository cohort, no deployment assumed** (Enrollment, P0). Dependencies: DDM-003, DDM-009.
- **DDM-011 — Detect repository types automatically without classifying empty stubs as apps** (Enrollment, P1). Dependencies: DDM-010.
- **DDM-012 — Incremental future GitHub-repository discovery and exclusion enforcement** (Enrollment, P1). Dependencies: DDM-011.
- **DDM-013 — Test source manifest signature, immutable ref and GitHub App credentials** (Trust, P0). Dependencies: DDM-010.
- **DDM-014 — Independent multi-region probes and signed quorum evidence** (Monitoring, P0). Dependencies: DDM-007.
- **DDM-015 — Durable provider outage ledger with deduplication** (Monitoring, P0). Dependencies: DDM-014.
- **DDM-016 — Health hysteresis, cooldown and correlated provider failures** (Monitoring, P0). Dependencies: DDM-015.
- **DDM-017 — Provider quota and shared free-account budget telemetry** (Cost, P0). Dependencies: DDM-004.
- **DDM-018 — Hard zero-dollar spend enforcer and paid actuator interlock** (Cost, P0). Dependencies: DDM-017.
- **DDM-019 — Sensitive config and secret references in secure vaults** (Trust, P0). Dependencies: DDM-013.
- **DDM-020 — Authenticated, replay-resistant provider status webhooks** (Monitoring, P1). Dependencies: DDM-015.
- **DDM-021 — Guarded deployment adapter contract and audit trail** (Providers, P0). Dependencies: DDM-018, DDM-019.
- **DDM-022 — Stable-domain provider-neutral traffic router design** (Routing, P0). Dependencies: DDM-016.
- **DDM-023 — Cloudflare Worker free request-level routing prototype** (Routing, P1). Dependencies: DDM-022.
- **DDM-024 — Independent backup controller to remove primary watchdog SPOF** (Routing, P1). Dependencies: DDM-023.
- **DDM-025 — Atomic compare-and-swap promotion controller** (Routing, P0). Dependencies: DDM-015, DDM-022.
- **DDM-026 — Single-writer database lease and fencing SDK** (Stateful, P0). Dependencies: DDM-025.
- **DDM-027 — Stateful API authorization, CSRF and OAuth origin validation** (Stateful, P0). Dependencies: DDM-026.
- **DDM-028 — GitHub OCI/Actions reusable immutable build adapter** (Providers, P0). Dependencies: DDM-021.
- **DDM-029 — Netlify Free deployment integration and quota guard** (Providers, P1). Dependencies: DDM-028.
- **DDM-030 — Deno Deploy Free deployment integration and quota guard** (Providers, P1). Dependencies: DDM-028.
- **DDM-031 — Oracle Always Free VM deployment integration and capacity guard** (Providers, P1). Dependencies: DDM-028.
- **DDM-032 — Cloudflare Workers/Pages deployment and static adapter** (Providers, P1). Dependencies: DDM-021.
- **DDM-033 — Render Free instance-hours adapter and outage detection** (Providers, P1). Dependencies: DDM-021.
- **DDM-034 — Koyeb Free single-service capacity adapter** (Providers, P2). Dependencies: DDM-021.
- **DDM-035 — Northflank free sandbox verified adapter** (Providers, P2). Dependencies: DDM-021.
- **DDM-036 — GitHub Pages / Firebase / DigitalOcean static-only adapters** (Providers, P2). Dependencies: DDM-021.
- **DDM-037 — AWS Lambda/GCP Cloud Run/Azure Container Apps cost-risk deny adapters** (Providers, P2). Dependencies: DDM-018, DDM-021.
- **DDM-038 — Trial/commercial-only restrictions for Vercel/Railway/Fly/HF Spaces** (Providers, P2). Dependencies: DDM-021.
- **DDM-039 — Central dashboard inventory, health, quotas and revisions** (Experience, P1). Dependencies: DDM-015.
- **DDM-040 — Incident feed, alerts and owner-action integration with Boardroom** (Experience, P1). Dependencies: DDM-039.
- **DDM-041 — Engine Room read-only deployment health feed** (Experience, P1). Dependencies: DDM-039.
- **DDM-042 — Portable release artifacts, secrets checklist and restore dry run** (Release, P1). Dependencies: DDM-021.
- **DDM-043 — Safe failover and failback drill orchestrator** (Release, P0). Dependencies: DDM-025, DDM-026, DDM-042.
- **DDM-044 — Independent TLS, webhooks, auth and end-to-end availability acceptance** (Release, P0). Dependencies: DDM-043.
- **DDM-045 — Canary rollout to Boardroom, rehearsal then sole active host** (Rollout, P0). Dependencies: DDM-043, DDM-044.
- **DDM-046 — Canary rollout to Engine Room without competing with other agent** (Rollout, P1). Dependencies: DDM-041, DDM-044.
- **DDM-047 — Rollout group: Galinsky-2028, Our-Jam, NFT Minting Console** (Rollout, P0). Dependencies: DDM-044.
- **DDM-048 — Portfolio-wide gradual deployment support and provider cap quotas** (Rollout, P1). Dependencies: DDM-047.
- **DDM-049 — Automated on-call emergency fallback with explicit time-to-recovery SLOs** (Rollout, P1). Dependencies: DDM-048.
- **DDM-050 — Production chaos/partial outage, provider and DNS failure tests** (Rollout, P1). Dependencies: DDM-049.

## Acceptance definition

Each deployable project needs a real HTTPS endpoint, commit/release hash, protected runtime config, verified read-only readiness and authentication denial, a rehearsed second provider, a route owner, actual $0 quota headroom and an independent failure quorum. If mutable, it additionally needs exclusive writer fencing before automatic traffic movement. Until then its status is `inventory_only` or `observed`, never `auto_failover_operational`.

**Speed boundary:** Prepared request-level standby switching can be fast; provisioning an entirely new Node runtime on a free account cannot be promised instant. A GitHub scheduled check every five minutes is merely a slow audit fallback.
