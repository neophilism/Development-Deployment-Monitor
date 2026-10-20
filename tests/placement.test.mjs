import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hostCandidates,allocatePortfolio} from "../src/placement.mjs";
import {scenarioForecast,rankPaidQuotes} from "../src/forecast.mjs";
const catalog=JSON.parse(readFileSync(new URL("../registry/free-resources.json",import.meta.url)));
const base={deployment_id:"demo",repository:"neophilism/Boardroom",workload_class:"nextjs",commercial:true,always_on:false,priority:100};
test("free catalogue has 50+ distinct options across required resource categories",()=>{
  assert(catalog.resources.length>=55);assert.equal(new Set(catalog.resources.map(r=>r.id)).size,catalog.resources.length);
  for(const category of ["static","container","vm","serverless","database","object-store","monitor","job","auth","email"])
    assert(catalog.resources.some(r=>r.category===category),category);
  assert(catalog.resources.every(r=>r.verified_connected===false&&r.cost_guard_verified===false));
});
test("a business never receives personal-only or potentially billable hosts",()=>{
  const candidates=hostCandidates(base,catalog);
  assert(!candidates.find(c=>c.provider_id==="vercel-hobby").eligible);
  assert(!candidates.find(c=>c.provider_id==="google-cloud-run").eligible);
  assert(!candidates.find(c=>c.provider_id==="digitalocean-static").eligible);
  assert(candidates.find(c=>c.provider_id==="netlify-free").eligible);
  assert(!candidates.find(c=>c.provider_id==="northflank-sandbox").eligible);
  assert(!candidates.find(c=>c.provider_id==="koyeb-free").eligible);
  assert(!candidates.find(c=>c.provider_id==="render-web-free").eligible);
});
test("real deployment does not occur merely because candidate ranks first",()=>{
  const result=allocatePortfolio([base],catalog);
  assert(result.entries[0].recommendation);
  assert(result.entries[0].not_deployed);
  assert.equal(result.all_live_deployments_verified,false);
  assert(!result.entries[0].alternatives.some(x=>x.action_allowed));
});
test("requirements prevent sleeping hosts from masquerading as 24/7",()=>{
  const x=hostCandidates({...base,workload_class:"persistent",always_on:true},catalog);
  assert(!x.find(y=>y.provider_id==="netlify-free").eligible);
  assert(x.find(y=>y.provider_id==="oracle-e2-micro").eligible);
  assert(!x.find(y=>y.provider_id==="northflank-sandbox").eligible);
});
test("portfolio capacity is account-wide, not unbounded per repo",()=>{
  const data={resources:catalog.resources.map(r=>({...r,
    verified_connected:r.id==="northflank-sandbox",
    cost_guard_verified:r.id==="northflank-sandbox",
    available_capacity:r.id==="northflank-sandbox"?2:null}))};
  const apps=Array.from({length:6},(_,i)=>({...base,deployment_id:String(i),workload_class:"persistent",always_on:true,priority:6-i}));
  const x=allocatePortfolio(apps,data);
  assert(x.entries.filter(e=>e.recommendation==="northflank-sandbox").length<=2);
  assert(x.entries.filter(e=>e.recommendation==="oracle-e2-micro").length<=1);
});
test("web container cost scenarios are explicitly unverified and exclude databases",()=>{
  const f=scenarioForecast([{type:"web_service"},{type:"web_service"},{type:"static_site"}]);
  assert.equal(f.known_baseline_min_usd_month,10);assert.equal(f.known_baseline_max_usd_month,40);
  assert.equal(f.authoritative_paid_budget_usd_month,null);
});
test("usage-free paid quotes do not fabricate exact monthly prices",()=>{
  const q=rankPaidQuotes(base,[{id:"a",base_usd_month:7}],{});
  assert.equal(q[0].estimated_usd_month,null);
});

test("unconnected $0 allocation never fabricates more free apps than provider published caps",()=>{
 const apps=Array.from({length:30},(_,i)=>({...base,deployment_id:String(i),always_on:false,priority:30-i}));
 const x=allocatePortfolio(apps,catalog);
 assert(x.entries.filter(e=>e.recommendation==="deno-deploy-free").length<=10);
 assert(!x.entries.some(e=>["northflank-sandbox","koyeb-free","render-web-free"].includes(e.recommendation)));
 assert(x.entries.every(e=>e.not_deployed===true));
});
