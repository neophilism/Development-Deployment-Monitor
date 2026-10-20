import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL("../db/sqlite/001_init.sql",import.meta.url),"utf8");
test("durable telemetry schema covers observations, usage, quota, pricing, incidents and forecasts",()=>{
 for(const table of ["ddm_repositories","ddm_services","ddm_providers","ddm_provider_accounts","ddm_deployments","ddm_observations","ddm_usage_samples","ddm_incidents","ddm_promotions","ddm_pricing","ddm_recommendations","ddm_reports","ddm_event_ledger"])
   assert.match(src,new RegExp("CREATE TABLE IF NOT EXISTS "+table));
});
test("one active deployment per service and chronological observations are indexed",()=>{
 assert.match(src,/CREATE UNIQUE INDEX IF NOT EXISTS ddm_unique_active_origin_per_service[\s\S]+WHERE active=1/);
 assert.match(src,/ddm_observations_deployment_time_idx/);
});
test("source DB schema never stores plaintext runtime passwords or access tokens",()=>{
 assert.doesNotMatch(src,/password\s+TEXT|secret\s+TEXT|api_key\s+TEXT|credential_value\s+TEXT/i);
});
