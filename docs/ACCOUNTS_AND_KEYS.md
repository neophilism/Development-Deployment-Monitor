# Zero-cost hosting account and credential checklist

**Never paste a credential into ChatGPT or a public PR.** Set scoped tokens only in the relevant provider's protected secret store. Give DDM the account/project/organization identifiers in its private configuration and a least-privilege provider token through Cloudflare Worker secrets or GitHub environment secrets. The currently connected GitHub, Render and Neon access should be reused, not re-registered.

## Priority host accounts (in signup order)

| Priority | Platform | Account action | Non-secret IDs / protected secrets needed | Deployment use |
|---|---|---|---|---|
| 1 | [Cloudflare](https://dash.cloudflare.com/sign-up) | Workers Free + D1 Free; optionally Pages Free and DNS. No paid Workers plan. | Account ID, one D1 DB ID and name, API token scoped to Worker/D1 deployment, secret `DDM_READ_TOKEN`; DNS zone ID only if an owned domain is configured. | Central monitoring, permanent SQLite database, dashboard, fast edge routing, static content. |
| 2 | [Northflank](https://app.northflank.com) | Sandbox **free**, verify availability of 2 always-on services and account-level limits. | Project and service IDs, deploy-capable API token in protected secrets. | Boardroom or another always-on priority backend; secondary always-on slot. |
| 3 | [Netlify](https://app.netlify.com/start) | Free 300-credit plan and GitHub connection; disable paid recharge and unnecessary previews. | Team/site ID; GitHub integration; deploy token only if automation requires it. Copy each app's private runtime env into that site's private settings. | Next.js SSR, static pages, serverless functions. |
| 4 | [Deno Deploy](https://console.deno.com) | Free plan (10 active applications). | Organization/app ID and securely stored deployment token; per-app server secrets. | SSR/serverless APIs and static serving, low-volume demo sites. |
| 5 | [UptimeRobot](https://uptimerobot.com) | Free plan, no card; max 50 monitors. | Scoped API key in private env, monitor IDs. | Independent external uptime verification, not itself hosting. |
| 6 | [Koyeb](https://app.koyeb.com) | Free 512 MB service. **Card verification may be required**; defer if unavailable. | Org/app/service ID and scoped token; verify no billable resource. | Low-load container if 0.1vCPU and sleeping behavior are acceptable. |

## Existing account access to restore rather than sign up for

- **GitHub `neophilism`:** already connected. No user password, PAT or account login needs to appear in chat. Application deploy GitHub App/token should be least privilege.
- **Oracle Cloud:** previously created Always Free E2.1.Micro VM. Confirm instance is active, public IP or hostname, SSH access and OCI home region; install appropriate deployment credentials **only to a protected CI environment or private VM**, never in the public repo. The VM is a candidate for multiple tiny services, capacity permitting; the 1GB RAM constraint is serious.
- **Neon:** existing organization is on **paid usage-based Launch** with 39 projects. Do not create a new project automatically or assume Free quota is usable inside this organization. Existing `DATABASE_URL` values remain private and each app's current DB is reused; DDM's telemetry should go to Cloudflare D1 Free first.
- **Render:** existing suspended services and private application environment values. Using the Render dashboard, copy server runtime secrets directly to the chosen replacement provider's private runtime settings. The Render integration does **not** return these values via the currently available connector.

## Additional optional accounts, only as an application's requirements justify them

- [Turso Free](https://turso.tech): separate SQLite/libSQL workload or a backup reporting database; organization and DB ID plus scoped token.
- [Supabase Free](https://supabase.com): at most 2 free projects, pause after inactivity; project URL and service-role secret (only in protected backend).
- [Upstash Free Redis](https://upstash.com): one Redis database, 256MB/500K commands; REST URL/token in app secrets.
- [Resend Free](https://resend.com): 3,000 outbound emails monthly/100 daily; sender domain validation, scoped API key.
- [Brevo Free](https://www.brevo.com): 300 daily emails; transactional sender validation and provider API key.
- [Cloudinary](https://cloudinary.com), [ImageKit](https://imagekit.io): free media processing; account/project IDs, scoped keys in protected secrets.
- [Oracle Object Storage](https://cloud.oracle.com): use existing OCI account, stay inside always-free entitlement.
- [Backblaze B2](https://www.backblaze.com/cloud-storage): free storage allowance but billable overage risk; do not auto-connect.
- [Cloudflare R2](https://dash.cloudflare.com): use existing Cloudflare account, but its overage billing must remain explicitly disallowed unless confirmed hard-limited.
- [GitLab](https://gitlab.com), [Firebase Hosting](https://firebase.google.com), [CircleCI](https://circleci.com): additional static/CI capacity; quota and terms verification first.
- Google Cloud, AWS, Azure, DigitalOcean, Fly.io, paid Railway, GPU services: **not required for the initial $0 rollout**; billing verification and owner spending approval are prerequisites, even where free monthly usage is advertised.

## Step-by-step DDM monitoring deployment

1. In the Cloudflare Free account create a D1 Free database `development-deployment-monitor`. Record its database ID.
2. Link this repo to your own machine or a protected CI environment. In `wrangler.toml` replace `REPLACE_WITH_CREATED_FREE_D1_ID` with the D1 ID. Do not commit account tokens.
3. Execute `npx wrangler d1 execute development-deployment-monitor --remote --file=db/sqlite/001_init.sql` and then `npx wrangler d1 execute development-deployment-monitor --remote --file=db/sqlite/002_seed_inventory.sql`. The second script inserts all 58 repo IDs, 62 candidates and 23 historically suspended services as **not active**, never overwriting live rows. Generate it from source with `npm run db:seed:generate`. Never seed app credentials or private database URLs. Set `DDM_READ_TOKEN` with `npx wrangler secret put DDM_READ_TOKEN`, 32+ random characters.
4. Deploy `npx wrangler deploy`. Keep the Worker/D1 account on Free; verify `/api/health`, then protect `/api/report` with the bearer token. A GitHub source checkout or merged PR is not proof of a deployed Worker.
5. Register real production/preview URLs only after security checks. DDM cron does nothing to unknown or unapproved URLs. Connect UptimeRobot for independent external quorum.
6. Run a controlled host migration of **one** service, including secrets and signed webhook/OAuth callbacks. Confirm feature-level behavior. Do not attach multiple writable hosts to the same DB without fenced single-writer coordination.
7. At the end of each successful host migration, designate exactly one primary and populate centrally approved ranked alternatives; monitor free provider quota and record actual consumption before generating a paid cost estimate.

## Privacy and invoice controls

Cloudflare Worker report API is token-protected, uses D1, and never returns secrets. Do not configure a dashboard worker with real private data on an open static URL. Do not enable auto-recharge, paid instance sizes, trials with automatic conversions, overage billing, or provider accounts whose free terms forbid your business applications. The report page refreshes every minute when connected; monitoring cron runs on a five-minute best-effort schedule and cannot guarantee instantaneous failover.

## Easiest deployment route: GitHub protected Free environment

The repository includes the manually triggered workflow [Deploy DDM on Cloudflare Workers Free and D1 Free](../.github/workflows/deploy-cloudflare.yml). After creating your **Cloudflare Workers Free** account and one `development-deployment-monitor` D1 Free database:

1. In the DDM GitHub repository, open **Settings → Environments → New environment**, name it `ddm-free`. Add four secrets there: `CLOUDFLARE_API_TOKEN` (scoped to the Worker/D1 resources), `CLOUDFLARE_ACCOUNT_ID`, `DDM_D1_DATABASE_ID` (the database UUID), and `DDM_READ_TOKEN` (independently generated random 32+ character token).
2. In **Settings → Secrets and variables → Actions → Variables**, add repository variable `DDM_FREE_PLAN_VERIFIED=true` **only after confirming** the Cloudflare account is on Workers Free rather than Workers Paid. Optionally supply `DDM_PRODUCTION_ORIGIN=https://<confirmed>.workers.dev` for strict smoke tests; never guess its hostname.
3. Use **Actions → Deploy DDM on Cloudflare Workers Free and D1 Free → Run workflow**. It validates the repository, applies the D1 schema and seed without overwriting existing rows, deploys the Worker, configures the protected report token, and verifies HTTP security when the origin is known.
4. Confirm the Worker is shown on Cloudflare **Workers Free**. Test the private report from your own browser using `DDM_READ_TOKEN` (enter into the site's form; never paste it into a GitHub issue or ChatGPT). DDM remains **read-only** and will not provision any client apps without separate approved provider connections.

This workflow creates **no provider account or database**; it requires the owner-created D1 Free database. The protected secrets are made available to a manually invoked GitHub Actions environment, not public PRs. Do not activate this workflow before Free eligibility is verified.
