# Portfolio deployment policy — 2026-11-01

Status: **owner-approved intended policy, not evidence of deployed/suspended services.**

## Tiers and triggers

1. **Core:** Boardroom and Engine Room are prioritized for continuously reachable public/private control-plane endpoints. A continuously running backend requires verified always-on hosting. Their existing free Render instances are not 24/7 guarantees.
2. **Sales:** Death Of The Salesman becomes an always-reachable candidate only after a verified seller-operations pilot, outbound consent/suppression controls, payments (where needed), hard spending caps, authentication, and production smoke tests.
3. **Development:** Every other project is **on-demand**. Do not provision a continuously active app server merely because a GitHub repository or PR exists. Run short-lived test/preview deployments only when a dependency-ready development task, acceptance test, or explicit owner request requires one. Stop after the task and verification; preserve source, durable database state and release artifacts.
4. **Productized:** A finished product can graduate to dedicated hosting once an owner approves the commercial launch and actual expected contribution margin covers measured compute, data, security and support costs. Do not infer capacity to pay from roadmap completion alone.

## Shared quota protection

- All 23 active Render free web services use the **same workspace-level** free runtime pool; record monthly hours actually used and the provider's next reset date from its authenticated control plane. In November, 30 days times 24 hours times two continuously active instances means **1,440 hours**, exceeding the cited **750 free instance-hour** shared allowance before previews.
- Allocate no more than the live free capacity measured and verified. A sleeping Render free web instance does not satisfy '24/7 running'. **No billable overage, paid migration, plan upgrade, new account, auto-recharge or paid model inference** without separate owner authorization.
- Use provider control-plane inventory/metrics first, not HTTP GET health checks that wake idle services; prefer one-shot/manual probes for development previews.
- A new source commit must not automatically wake a parked preview indefinitely. Inspect existing repository auto-deploy and schedules and disable them safely through supported provider APIs before claiming on-demand compliance.
- For stateful workloads, distinguish pausing a disposable web process from suspending or destroying a database. Never destroy production data, secrets, leases or hosted records to save runtime hours. Only one active webhook/scheduler writer at a time.

## Operating actions and evidence

DDM is the single deployment-policy owner. Engine Room presents read-only consumption, last observation time, capped projected usage, quota depletion and operator actions; Boardroom stays a separate development coordinator. Do not duplicate actuation or misstate historical snapshots as live.

An account-scoped collector must expose per-service runtime state, plan, observed instance-hours, shared remaining quota, last reset, estimated depletion (unknown when consumption is missing), and next action. The manager should require explicit approval and an audit event for any provider pause/resume until the supported API and safe shutdown semantics are verified.

**Current limitation:** The installed Render connector exposes get/list/metrics/deploy, but no pause/suspend/delete action. This policy and repository PR do **not** enact an automatic shutdown or move services. Any existing external workflows or uptime probes may still wake the sites until individually audited.
