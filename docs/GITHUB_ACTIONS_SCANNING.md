# Read-only GitHub Actions scanning

DDM-009 provides two deliberately narrow GitHub Actions boundaries:

- The central scheduled scan reads the canonical inventory and each repository's public deployment contract. It uses `contents: read`, an eight-second manifest request timeout, at most six workers, strict 16 KiB response decoding and the separately reviewed origin approval registry.
- The reusable client workflow checks one caller-owned manifest with the same zero-dependency validator used locally. It does not probe an endpoint or authorize a deployment.

The central scanner sends authenticated requests only to the fixed GitHub API origin and never follows redirects. Endpoint requests remain GET-only, no-store, no-redirect probes implemented by the readiness layer. Checkout credentials are not persisted. Returned manifest and readiness bodies, tokens, provider errors and private operational details are never included in the report.

Status is fail closed. Missing enrollment, unavailable or invalid contracts, inventory-only projects and active contracts without an approved endpoint are distinct from health. `ready` requires an approved active primary and exact readiness predicates. `degraded` requires a real failed probe of an approved active primary and makes the audit job fail. No scan result grants independent monitor quorum, routing authority, writer fencing, provider mutation or spending permission, so the existing failover planner remains non-executing.

Run focused coverage with:

```sh
node --test tests/scan.test.mjs tests/probe.test.mjs
```

GitHub schedules can be delayed or disabled and same-runner repeated probes are not independent geographic evidence. Rollback is a source revert. During scanner failure, operators must report monitoring as unavailable and must not infer application failure or authorize a route change.
