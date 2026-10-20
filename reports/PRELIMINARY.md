# Development Deployment Monitor — preliminary allocation and paid spend

Snapshot: 2026-10-20. This is **not** a confirmed live deployment or a real provider invoice.

Eligible repositories: 58. Suspended Render web services: 23 across 19 repositories.

## Free provider recommendation by Render deployment

| Deployment | Current status | Candidate free hosts (not provisioned) | Action |
| --- | --- | --- | --- |
| nft-minting-console-preview | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| our-jam-rehearsal | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| Our-Jam | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| boardroom | suspended-on-render | northflank-sandbox, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| galinsky-2028-volunteer-portal | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| galinsky-2028-private-preview | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| public-debate-engine-preview | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| cornerstone-policy-preview | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| music-video-wizard-prod | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| music-video-wizard-executor | suspended-on-render | northflank-sandbox, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| distributed-radio-engine-preview | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| music-operations-engine | suspended-on-render | northflank-sandbox, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| engine-room | suspended-on-render | northflank-sandbox, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| algorithmic-accountability-preview | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| ram-marketplace-sandbox | suspended-on-render | deno-deploy-free, netlify-free, northflank-sandbox, koyeb-free, railway-free | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| civic-registry-preview-v2 | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| music-video-wizard-preview | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| fireside-chat-preview | suspended-on-render | deno-deploy-free, netlify-free, northflank-sandbox, koyeb-free, railway-free | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| stems-white-label-preview | suspended-on-render | deno-deploy-free, netlify-free, northflank-sandbox, koyeb-free, railway-free | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| secure-intake-preview | suspended-on-render | deno-deploy-free, netlify-free, northflank-sandbox, koyeb-free, railway-free | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| federal-encryption-preview | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| compliance-audit-engine-preview | suspended-on-render | northflank-sandbox, koyeb-free, railway-free, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |
| foia-aggregator | suspended-on-render | northflank-sandbox, oracle-a1, oracle-e2-micro | Connect a compatible free host and securely transfer runtime secrets; verify live endpoint and app authorization |

## Preliminary paid-service sensitivity (NOT a budget)

Illustrative web-container subtotal if every one of the 23 Render web services required its own paid host: **$115–$460 per month** for container compute only.

This does not include: Neon existing Launch compute, storage, egress; GPU and music generation; object storage and egress; transactional email; custom domains renewal; CDN paid feature usage; workers and queues; backups, independent monitors and paid DR; payment processing and tax.

## Pending verified evidence

- Confirmed free account/provider connectivity and quota guards.
- Verified deployment URLs and real uptime/readiness histories.
- Measured CPU, memory, bandwidth, storage, GPU and transactional load.
- Official provider rates for the exact resource sizes.
- Stable domains and a safe shared single-writer failover architecture.
- Continuously running Cloudflare D1 telemetry collector.
