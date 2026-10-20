import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {generatePreview,reportMarkdown} from "../src/generate-report.mjs";
const load=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
test("Portfolio report stays honest about all suspended Render apps",()=>{
 const d=generatePreview(load("registry/render-services-2026-10-20.json"),load("registry/free-resources.json"),load("registry/repositories.json"));
 assert.equal(d.eligible_repositories,58);
 assert.equal(d.suspended_legacy_services,23);
 assert.equal(d.services.length,23);
 assert(d.free_resource_candidates>=60);
 assert.equal(d.verified_live_deployments,0);
 assert(d.services.every(s=>s.verified_live_deployment===null&&s.status==="suspended-on-render"));
 const cost=reportMarkdown(d);
 assert.match(cost,/NOT a budget/);
 assert.match(cost,/not provisioned/);
});
