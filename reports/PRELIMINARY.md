# Development Deployment Monitor — preliminary allocation and paid spend

Snapshot: 2026-10-20. This is **not** a confirmed live deployment or a real provider invoice.

Eligible repositories: 58. Suspended Render web services: 23 across 19 repositories.

## Free provider recommendation by Render deployment

| Deployment | Current status | Provisional single host (not provisioned) | Ranked alternative hosts (not provisioned) | Action |
| --- | --- | --- | --- | --- |
| nft-minting-console-preview | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| our-jam-rehearsal | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| Our-Jam | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| boardroom | suspended-on-render | oracle-e2-micro |  | Connect free host account, securely transfer runtime secrets, deploy and verify |
| galinsky-2028-volunteer-portal | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| galinsky-2028-private-preview | suspended-on-render | railway-free | oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| public-debate-engine-preview | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| cornerstone-policy-preview | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| music-video-wizard-prod | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| music-video-wizard-executor | suspended-on-render | no free slot with known cap | oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| distributed-radio-engine-preview | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| music-operations-engine | suspended-on-render | no free slot with known cap | oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| engine-room | suspended-on-render | no free slot with known cap | oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| algorithmic-accountability-preview | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| ram-marketplace-sandbox | suspended-on-render | deno-deploy-free | netlify-free, railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| civic-registry-preview-v2 | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| music-video-wizard-preview | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| fireside-chat-preview | suspended-on-render | deno-deploy-free | netlify-free, railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| stems-white-label-preview | suspended-on-render | deno-deploy-free | netlify-free, railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| secure-intake-preview | suspended-on-render | deno-deploy-free | netlify-free, railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| federal-encryption-preview | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| compliance-audit-engine-preview | suspended-on-render | no free slot with known cap | railway-free, oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |
| foia-aggregator | suspended-on-render | no free slot with known cap | oracle-e2-micro | Connect free host account, securely transfer runtime secrets, deploy and verify |

Provisional only: published app-count caps are account-wide, but available CPU, RAM, bandwidth and credits are **not** verified. Free tier capacity cannot be assumed for live business use.

## Preliminary paid-service sensitivity (NOT a budget)

Illustrative web-container subtotal if every one of the 23 Render web services required its own paid host: **$115–$460 per month** for container compute only.

This does not include any of the following: Neon existing Launch compute, storage, egress; GPU and music generation; object storage and egress; transactional email; custom domains renewal; CDN paid feature usage; workers and queues; backups, independent monitors and paid DR; payment processing and tax.

Once telemetry is collected for real live services, select optimal shared hosts and paid offers across every workload, accounting for costs, quotas, uptime, geographic latency and scale.

## What is missing

- Verified credentials and $0 account quota on independent hosts.
- Verified deployment URLs and real uptime/readiness histories.
- Measured monthly CPU, memory, egress, storage, request volume, GPU activity and application requirements.
- Official metered provider pricing for the exact resource size and jurisdiction.
- Stable domains, safe OAuth/cookie routing and same-revision failover rehearsals.
- Continuously running control plane linked to its D1 Free database.

