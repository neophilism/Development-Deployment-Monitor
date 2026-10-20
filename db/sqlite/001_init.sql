-- DDM-DB-001. Compatible with SQLite 3 / Cloudflare D1.
-- Zero-cost preferred deployment: Cloudflare Workers Free + D1 Free.
-- Do NOT put secret values, customer data, passwords, or private origin tokens here.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS ddm_repositories (
  repo TEXT PRIMARY KEY,
  github_repo_id INTEGER UNIQUE,
  kind TEXT NOT NULL DEFAULT 'unclassified',
  enrolled INTEGER NOT NULL DEFAULT 0 CHECK(enrolled IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_at TEXT,
  excluded INTEGER NOT NULL DEFAULT 0 CHECK(excluded IN (0,1))
);
CREATE TABLE IF NOT EXISTS ddm_services (
  id TEXT PRIMARY KEY,
  repo TEXT NOT NULL REFERENCES ddm_repositories(repo),
  display_name TEXT NOT NULL,
  workload_class TEXT NOT NULL DEFAULT 'unclassified',
  deployment_purpose TEXT NOT NULL DEFAULT 'unclassified',
  stateful INTEGER NOT NULL DEFAULT 0 CHECK(stateful IN (0,1)),
  always_on INTEGER NOT NULL DEFAULT 0 CHECK(always_on IN (0,1)),
  priority INTEGER NOT NULL DEFAULT 50,
  requirements_json TEXT NOT NULL DEFAULT '{}',
  classification_verified INTEGER NOT NULL DEFAULT 0 CHECK(classification_verified IN (0,1)),
  monitoring_enabled INTEGER NOT NULL DEFAULT 0 CHECK(monitoring_enabled IN (0,1)),
  failover_enabled INTEGER NOT NULL DEFAULT 0 CHECK(failover_enabled IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ddm_service_repo_idx ON ddm_services(repo);
CREATE TABLE IF NOT EXISTS ddm_providers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  policy TEXT NOT NULL,
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  documentation_url TEXT,
  eligibility_verified INTEGER NOT NULL DEFAULT 0,
  monthly_starting_usd REAL,
  paid_usage_price_json TEXT,
  last_verified_at TEXT
);
CREATE TABLE IF NOT EXISTS ddm_provider_accounts (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES ddm_providers(id),
  account_alias TEXT NOT NULL,
  connected INTEGER NOT NULL DEFAULT 0 CHECK(connected IN (0,1)),
  hard_zero_usd_guard INTEGER NOT NULL DEFAULT 0 CHECK(hard_zero_usd_guard IN (0,1)),
  cumulative_cost_usd REAL,
  quota_json TEXT NOT NULL DEFAULT '{}',
  remaining_quota_json TEXT NOT NULL DEFAULT '{}',
  expiry_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ddm_deployments (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES ddm_services(id),
  provider_account_id TEXT REFERENCES ddm_provider_accounts(id),
  provider_id TEXT NOT NULL REFERENCES ddm_providers(id),
  origin TEXT NOT NULL,
  ready_path TEXT NOT NULL,
  required_fields_json TEXT NOT NULL DEFAULT '{}',
  expected_status INTEGER NOT NULL DEFAULT 200,
  git_revision TEXT,
  runtime_status TEXT NOT NULL DEFAULT 'unknown',
  provider_reported_status TEXT NOT NULL DEFAULT 'unknown',
  role TEXT NOT NULL DEFAULT 'candidate',
  central_approved INTEGER NOT NULL DEFAULT 0 CHECK(central_approved IN (0,1)),
  active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
  verified_readiness INTEGER NOT NULL DEFAULT 0 CHECK(verified_readiness IN (0,1)),
  capacity_verified INTEGER NOT NULL DEFAULT 0 CHECK(capacity_verified IN (0,1)),
  last_sampled_at TEXT,
  last_deployed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS ddm_unique_active_origin_per_service
  ON ddm_deployments(service_id) WHERE active=1;
CREATE INDEX IF NOT EXISTS ddm_deployment_sample_idx ON ddm_deployments(central_approved,active,last_sampled_at);
CREATE TABLE IF NOT EXISTS ddm_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id TEXT NOT NULL REFERENCES ddm_deployments(id),
  observed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  probe_region TEXT NOT NULL DEFAULT 'unspecified',
  latency_ms INTEGER,
  http_status INTEGER,
  readiness_ok INTEGER NOT NULL CHECK(readiness_ok IN (0,1)),
  failure_code TEXT,
  revision_observed TEXT,
  provider_reported_status TEXT,
  cpu_ms REAL,
  memory_mb REAL,
  database_ready INTEGER,
  authorization_ready INTEGER
);
CREATE INDEX IF NOT EXISTS ddm_observations_deployment_time_idx
  ON ddm_observations(deployment_id,observed_at DESC);
CREATE TABLE IF NOT EXISTS ddm_usage_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL REFERENCES ddm_provider_accounts(id),
  service_id TEXT REFERENCES ddm_services(id),
  captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  request_count INTEGER,
  cpu_ms REAL,
  memory_gb_hours REAL,
  egress_gb REAL,
  storage_gb REAL,
  build_minutes REAL,
  credits_consumed REAL,
  billed_usd REAL,
  credits_remaining REAL,
  monthly_quota_fraction REAL,
  unit TEXT,
  raw_metrics_json TEXT
);
CREATE INDEX IF NOT EXISTS ddm_usage_account_time_idx ON ddm_usage_samples(account_id,captured_at DESC);
CREATE TABLE IF NOT EXISTS ddm_incidents (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES ddm_services(id),
  started_at TEXT NOT NULL,
  resolved_at TEXT,
  category TEXT NOT NULL,
  impact TEXT NOT NULL DEFAULT 'unknown',
  evidence_json TEXT NOT NULL DEFAULT '{}',
  provider_id TEXT,
  resolution TEXT,
  downtime_seconds INTEGER
);
CREATE TABLE IF NOT EXISTS ddm_promotions (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES ddm_services(id),
  from_deployment_id TEXT,
  to_deployment_id TEXT,
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  policy_generation INTEGER,
  writer_fence_epoch INTEGER,
  verified_same_revision INTEGER NOT NULL DEFAULT 0,
  verified_quota INTEGER NOT NULL DEFAULT 0,
  verified_router_control INTEGER NOT NULL DEFAULT 0,
  result TEXT NOT NULL DEFAULT 'planned'
);
CREATE TABLE IF NOT EXISTS ddm_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id TEXT NOT NULL REFERENCES ddm_providers(id),
  sku TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'global',
  effective_at TEXT NOT NULL,
  observed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  currency TEXT NOT NULL DEFAULT 'USD',
  monthly_base REAL NOT NULL CHECK(monthly_base>=0),
  request_usd REAL,
  cpu_hour_usd REAL,
  gb_egress_usd REAL,
  gb_storage_usd REAL,
  source_url TEXT NOT NULL,
  reviewed INTEGER NOT NULL DEFAULT 0 CHECK(reviewed IN (0,1))
);
CREATE INDEX IF NOT EXISTS ddm_pricing_provider_time_idx ON ddm_pricing(provider_id,effective_at DESC);
CREATE TABLE IF NOT EXISTS ddm_recommendations (
  service_id TEXT NOT NULL REFERENCES ddm_services(id),
  provider_id TEXT NOT NULL REFERENCES ddm_providers(id),
  rank INTEGER NOT NULL CHECK(rank>=1),
  computed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  score REAL NOT NULL,
  eligibility TEXT NOT NULL,
  reasoning_json TEXT NOT NULL,
  monthly_usd_low REAL,
  monthly_usd_expected REAL,
  monthly_usd_high REAL,
  confidence TEXT NOT NULL DEFAULT 'unverified',
  PRIMARY KEY(service_id,provider_id)
);
CREATE TABLE IF NOT EXISTS ddm_reports (
  id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  telemetry_cutoff TEXT,
  resource_cost_usd_known REAL,
  estimated_low_usd REAL,
  estimated_expected_usd REAL,
  estimated_high_usd REAL,
  assumptions_json TEXT NOT NULL DEFAULT '{}',
  missing_data_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'incomplete'
);
CREATE TABLE IF NOT EXISTS ddm_event_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}'
);
CREATE VIEW IF NOT EXISTS ddm_deployment_latest AS
  SELECT d.*, (SELECT o.observed_at FROM ddm_observations o WHERE o.deployment_id=d.id ORDER BY o.id DESC LIMIT 1) AS sample_at,
    (SELECT o.readiness_ok FROM ddm_observations o WHERE o.deployment_id=d.id ORDER BY o.id DESC LIMIT 1) AS last_readiness
  FROM ddm_deployments d;
CREATE VIEW IF NOT EXISTS ddm_account_daily_cost AS
  SELECT account_id, substr(captured_at,1,10) day,
    max(billed_usd) billed_usd_current, max(credits_consumed) credits_consumed_current,
    max(credits_remaining) credits_remaining_latest
  FROM ddm_usage_samples GROUP BY account_id,substr(captured_at,1,10);
