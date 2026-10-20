import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL("../.github/workflows/deploy-cloudflare.yml",import.meta.url),"utf8");
test("Cloudflare deployment is manually dispatched and cannot charge without explicit Free confirmation",()=>{
 assert.match(src,/workflow_dispatch:/);
 assert.doesNotMatch(src,/\nschedule:/);
 assert.match(src,/if: vars\.DDM_FREE_PLAN_VERIFIED == 'true'/);
 assert.match(src,/environment: ddm-free/);
});
test("Cloudflare workflow loads provider credentials only from protected GitHub secrets",()=>{
 for(const key of ["CLOUDFLARE_API_TOKEN","CLOUDFLARE_ACCOUNT_ID","DDM_D1_DATABASE_ID","DDM_READ_TOKEN"])
 assert(src.includes("secrets."+key),key);
 assert(src.includes("wrangler secret put DDM_READ_TOKEN"));
 assert(!src.includes("echo $DDM_READ_TOKEN"));
});
test("D1 deploy includes both schema and idempotent seed and verifies report stays protected",()=>{
 assert(src.includes("db/sqlite/001_init.sql"));
 assert(src.includes("db/sqlite/002_seed_inventory.sql"));
 assert(src.includes('x.status!==401'));
 assert(src.includes("git diff --exit-code"));
});
