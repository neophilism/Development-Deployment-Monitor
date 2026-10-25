# Failover policy planner

DDM-008 is a pure, default-non-executing policy boundary. It accepts an already validated active deployment contract, centrally approved observations, and explicit safety-gate evidence. Its only positive result is a proposal with `execute: false`; it has no network, provider, database, DNS or routing authority.

A proposal requires auto-verified policy, an exact zero-dollar budget, at least three failures plus independent-monitor quorum, verified external routing authority, exactly one centrally approved unhealthy primary, and a centrally approved healthy standby on another provider. The standby must be preprovisioned, warm, within verified free quota, and at the primary's exact 40-character release SHA. Stateful services additionally require contract writer fencing and a caller-held exclusive writer lease.

Candidate selection is deterministic: lowest numeric priority, then deployment ID. Missing or malformed evidence, missing central approval, disabled/manual policy, billable fallback, ambiguous primaries, failed fencing or the absence of a same-release standby returns a frozen `action: "none"` decision with `execute: false`.

This unit does not establish independent probe evidence, routing compare-and-swap, writer leases, deployment adapters or actuation. Those remain later plan units. Rollback is a source revert; callers must continue treating any unavailable planner as no authorization to change traffic.

Run focused coverage with:

```sh
node --test tests/failover.test.mjs tests/core.test.mjs
```
