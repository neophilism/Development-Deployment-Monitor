import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {seedInventory} from "../src/seed-inventory.mjs";
const load=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url)));
const sql=seedInventory(load("registry/render-services-2026-10-20.json"),load("registry/repositories.json"),load("registry/free-resources.json"));
test("D1 import persists every existing service and provider without guessing an available primary",()=>{
 assert.equal((sql.match(/INSERT OR IGNORE INTO ddm_services/g)||[]).length,23);
 assert.equal((sql.match(/INSERT OR IGNORE INTO ddm_repositories/g)||[]).length,58);
 assert.equal((sql.match(/INSERT OR IGNORE INTO ddm_providers/g)||[]).length,62);
 assert.equal((sql.match(/INSERT OR IGNORE INTO ddm_deployments/g)||[]).length,23);
 assert(!sql.includes("INSERT INTO ddm_provider_accounts"));
 assert(!sql.includes("INSERT INTO ddm_promotions"));
});
test("Source preserves original DB credentials by never emitting anything resembling a connection string",()=>{
 assert.doesNotMatch(sql,/DATABASE_URL|postgresql:\/\/|api[_-]?key\s*=|secret[_-]?key\s*=/i);
 assert(sql.includes("billing_quota_exhausted"));
});
