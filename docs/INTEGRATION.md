# Enrolling a repository (DDM-003)

**All repositories except the four oldest get one manifest.** Libraries, research prototypes, infrastructure policies and empty repositories should remain inventory-only until they have actual deployable software. Never create a fake health endpoint.

## Version 1 contract invariants

The JSON Schema and runtime validator are both authoritative. A contract is rejected unless it is closed to unknown fields, belongs to the repository being validated, retains the zero-dollar budget, and declares an explicit router state. Public origins must be credential-free HTTPS origins with no path, query, fragment, IP literal or private hostname. Runbooks are repository-relative Markdown files under `docs/` or `.github/`.

`inventory` is the default and makes no availability claim. An `active` contract has exactly one primary; every declared deployment has an exact 40-character release SHA, confirmed zero-cost quota, a unique origin and at least one exact readiness JSON assertion. `auto-verified` additionally requires a verified external stable origin and a warm, preprovisioned, quota-verified standby on a different provider at the primary's exact release. Stateful automatic failover also requires writer fencing. These declarations establish eligibility only; they do not execute a promotion.

1. Add the file `.github/deployment-monitor.json`, replacing `neophilism/YOUR-REPO` with the **exact** GitHub repository full name. Set initial kind conservatively; the source owner can classify it later.
2. Add `.github/workflows/deployment-monitor-contract.yml` invoking the shared DDM validator, or use your existing workflow to call `node src/cli.mjs validate-client`.
3. When a deployment exists, make the app expose a credential-free *readiness* endpoint that confirms real dependencies and release identity, not just a process returning HTTP 200. A static site may instead use its immutable release marker.
4. Register the **public HTTPS origin** and expected response fields in the source manifest, then add a matching entry to DDM `registry/approved-origins.json` in a reviewed PR. Do not add private network URLs, auth tokens, full connection strings or arbitrary query parameters.
5. Run a real external probe from more than one network, confirm end-user login/API authorization checks, and record exact release revision. Only then change `monitoring.mode` to `active`.
6. Register at least one provider independently with verified remaining free quota, exact release SHA and credentials. Attempt a controlled rehearsal; create a fallback runbook. Set `failover.mode` from `disabled` to `manual` for human-controlled host switching.
7. Automatic failover requires an independently maintained fast-route controller, multi-region probe quorum, a prepared zero-cost standby and atomic write fencing where applicable. Never turn it on because a file contains two URLs.

**Initial safe manifest:**

```json
{
  "schema_version": 1,
  "repository": "neophilism/YOUR-REPO",
  "kind": "unclassified",
  "monitoring": {"mode": "inventory"},
  "budget": {"monthly_usd_max": 0, "allow_billable_fallback": false},
  "failover": {"mode": "disabled", "stateful": false, "writer_fencing": false, "router": "none"},
  "deployments": []
}
```

**Shared client validation workflow:**

```yaml
name: Deployment monitor contract
on:
  pull_request:
    paths:
      - .github/deployment-monitor.json
      - .github/workflows/deployment-monitor-contract.yml
  workflow_dispatch:
permissions:
  contents: read
jobs:
  contract:
    uses: neophilism/Development-Deployment-Monitor/.github/workflows/validate-client.yml@main
```

The shared workflow does **not** create any hosting account, runtime instance, billing subscription or database. It validates the public-safe contract and provides a stable handoff to DDM. On a failover request DDM must obtain independently verified provider permissions and runtime secrets via the authorized deployment adapter.
