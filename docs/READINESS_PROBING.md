# Read-only readiness probing

DDM-007 evaluates only centrally approved, credential-free HTTPS readiness targets. The scanner first validates the repository contract, then requires an exact approval binding for repository, deployment ID, provider, origin and path. A source manifest alone cannot authorize a request.

Each observation is one `GET` with redirects disabled, a 30-second maximum timeout, no-store request headers and no request body. A passing response must use the declared 2xx status, identify JSON in `Content-Type`, remain within 32 KiB, decode to an object and match every configured scalar readiness predicate exactly. Nested predicates use dot-separated own-property paths. TLS, connectivity or HTTP status alone never establishes readiness.

Invalid targets, redirects, timeouts, transport failures, oversized or malformed bodies, status mismatches and predicate mismatches fail closed. Response bodies are neither logged nor returned. Three consecutive observations from the same runner reduce transient noise but do not constitute independent geographic quorum; DDM-014 adds signed multi-region evidence. DDM-007 cannot deploy, route, promote, write to an application or authorize spending.

Run the focused contract tests with:

```sh
node --test tests/probe.test.mjs tests/core.test.mjs
```

Rollback is a normal source revert. Removing the probe from a scheduled scan must not be represented as service health; it changes the target to unobserved.
