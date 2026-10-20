# Development Deployment Monitor

A portfolio-wide, provider-neutral deployment watchdog and portable failover controller. It monitors only **registered, verified deployments**; no repository, free-tier account, or persistent database is provisioned implicitly. The first four historically oldest repositories are excluded.

See `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_PLAN.md`, and `registry/repositories.json` after the foundation PR lands.

No deployment is marked live without externally verified readiness and traffic checks. No provider may incur charges without explicit owner authorization.
