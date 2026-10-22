import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateContract,validateOrigin,validateInventory,ContractError} from "../src/contract.mjs";
import {probeDeployment} from "../src/probe.mjs";
import {planFailover} from "../src/failover.mjs";
const load=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const providerSet=new Set(load("registry/providers.json").providers.map(x=>x.id));
const manifest=()=>({schema_version:1,repository:"neophilism/Boardroom",kind:"web-app",
 monitoring:{mode:"inventory"},budget:{monthly_usd_max:0,allow_billable_fallback:false},
 failover:{mode:"disabled",stateful:true,writer_fencing:false,router:"none"},deployments:[]});
const endpoint=(id,role,provider)=>({id,provider,origin:`https://${id}.example.net`,ready_path:"/api/ready",expected_status:200,role,ready_json:{status:"ready"},release_sha:"a".repeat(40),preprovisioned:true,warm:true,quota_verified:true});
test("Four oldest exclusions and all 58 project entries match audited inventory",()=>{
 const x=validateInventory(load("registry/repositories.json"));
 assert.equal(x.repositories.length,58);
 assert.equal(new Set(x.repositories.map(r=>r.repository)).size,58);
 assert.equal(x.excluded.length,4);
 assert(!x.repositories.some(r=>r.repository==="neophilism/pupil"));
});
test("All providers are disabled for paid/autonomous provisioning by default",()=>{
 const p=load("registry/providers.json").providers;
 assert(p.length>12);
 assert(p.every(x=>x.autodeploy_enabled===false&&x.verified_connected===false));
});
test("Default repository registration is valid and never asserts a live app",()=>{
 assert.equal(validateContract(manifest(),"neophilism/Boardroom",providerSet).monitoring.mode,"inventory");
});
test("The contract never permits unauthorized costs or unknown fields",()=>{
 const m=manifest();m.budget.monthly_usd_max=1;
 assert.throws(()=>validateContract(m,m.repository,providerSet),ContractError);
 const n=manifest();n.DATABASE_URL="secret";
 assert.throws(()=>validateContract(n,n.repository,providerSet),ContractError);
});
test("No embedded credentials, plain HTTP or internal network target",()=>{
 for(const url of ["http://example.net","https://user:pass@example.net","https://localhost","https://127.0.0.1","https://api.internal","https://host.local","https://example.net/admin"]){
  assert.throws(()=>validateOrigin(url),ContractError);
 }
 assert.equal(validateOrigin("https://boardroom.example.net"),"https://boardroom.example.net");
});
test("An unverified primary may not trigger an automatic promotion",()=>{
 const m=manifest();m.monitoring.mode="active";m.failover={mode:"auto-verified",stateful:true,writer_fencing:true,router:"verified-external",stable_origin:"https://boardroom.example.net"};
 m.deployments=[endpoint("first","primary","netlify"),endpoint("second","standby","deno-deploy")];
 validateContract(m,m.repository,providerSet);
 const s={first:{ok:false},second:{ok:true}};
 assert.equal(planFailover(m,s,{unhealthySamples:3,independentMonitorQuorum:false,routingAuthority:true,exclusiveWriterLease:true}).action,"none");
 assert.equal(planFailover(m,s,{unhealthySamples:3,independentMonitorQuorum:true,routingAuthority:false,exclusiveWriterLease:true}).action,"none");
 assert.equal(planFailover(m,s,{unhealthySamples:3,independentMonitorQuorum:true,routingAuthority:true,exclusiveWriterLease:false}).action,"none");
 const p=planFailover(m,s,{unhealthySamples:3,independentMonitorQuorum:true,routingAuthority:true,exclusiveWriterLease:true});
 assert.equal(p.action,"propose_promotion");assert.equal(p.execute,false);
});
test("A standby must be same release, a different provider, ready and zero-cost quota confirmed",()=>{
 const m=manifest();m.monitoring.mode="active";m.failover={mode:"auto-verified",stateful:false,writer_fencing:false,router:"verified-external",stable_origin:"https://boardroom.example.net"};
 m.deployments=[endpoint("first","primary","netlify"),endpoint("second","standby","deno-deploy")];
 const opts={unhealthySamples:3,independentMonitorQuorum:true,routingAuthority:true};
 m.deployments[1].release_sha="b".repeat(40);
 assert.equal(planFailover(m,{first:{ok:false},second:{ok:true}},opts).action,"none");
 m.deployments[1].release_sha="a".repeat(40);m.deployments[1].quota_verified=false;
 assert.equal(planFailover(m,{first:{ok:false},second:{ok:true}},opts).action,"none");
});
test("Readiness validates an exact application JSON field, never just HTTP 200",async()=>{
 const d=endpoint("first","primary","netlify");
 const transport=async()=>new Response(JSON.stringify({status:"not_ready"}),{status:200,headers:{"content-type":"application/json"}});
 const res=await probeDeployment(d,{transport});
 assert.equal(res.ok,false);assert.equal(res.reason,"readiness_field_mismatch");
});
test("A matching readiness JSON is healthy",async()=>{
 const d=endpoint("first","primary","netlify");
 const transport=async()=>new Response(JSON.stringify({status:"ready"}),{status:200,headers:{"content-type":"application/json"}});
 assert.equal((await probeDeployment(d,{transport})).ok,true);
});

test("Active contracts require one evidenced primary and unique public origins",()=>{
 const m=manifest();m.monitoring.mode="active";
 m.deployments=[endpoint("first","primary","netlify")];
 assert.equal(validateContract(m,m.repository,providerSet).deployments.length,1);
 const missingRelease=structuredClone(m);delete missingRelease.deployments[0].release_sha;
 assert.throws(()=>validateContract(missingRelease,m.repository,providerSet),e=>e.code==="active_evidence_required");
 const duplicatePrimary=structuredClone(m);duplicatePrimary.deployments.push({...endpoint("second","primary","deno-deploy"),origin:"https://other.example.net"});
 assert.throws(()=>validateContract(duplicatePrimary,m.repository,providerSet),e=>e.code==="active_primary_required");
 const duplicateOrigin=structuredClone(m);duplicateOrigin.deployments.push({...endpoint("second","standby","deno-deploy"),origin:m.deployments[0].origin});
 assert.throws(()=>validateContract(duplicateOrigin,m.repository,providerSet),e=>e.code==="deployment_origin_duplicate");
});
test("Router and runbook fields are explicit and public-safe",()=>{
 const missingRouter=manifest();delete missingRouter.failover.router;
 assert.throws(()=>validateContract(missingRouter,missingRouter.repository,providerSet),e=>e.code==="failover_invalid");
 const strayOrigin=manifest();strayOrigin.failover.stable_origin="https://example.net";
 assert.throws(()=>validateContract(strayOrigin,strayOrigin.repository,providerSet),e=>e.code==="stable_origin_without_router");
 const badRunbook=manifest();badRunbook.failover.runbook="https://private.example/runbook";
 assert.throws(()=>validateContract(badRunbook,badRunbook.repository,providerSet),e=>e.code==="runbook_invalid");
 const documented=manifest();documented.failover.runbook="docs/FAILOVER.md";
 assert.equal(validateContract(documented,documented.repository,providerSet).failover.runbook,"docs/FAILOVER.md");
});
test("Automatic failover requires a same-release standby on another provider",()=>{
 const m=manifest();m.monitoring.mode="active";m.failover={mode:"auto-verified",stateful:false,writer_fencing:false,router:"verified-external",stable_origin:"https://stable.example.net"};
 m.deployments=[endpoint("first","primary","netlify"),{...endpoint("second","standby","netlify"),origin:"https://standby.example.net"}];
 assert.throws(()=>validateContract(m,m.repository,providerSet),e=>e.code==="auto_warm_standby_required");
 m.deployments[1].provider="deno-deploy";m.deployments[1].release_sha="b".repeat(40);
 assert.throws(()=>validateContract(m,m.repository,providerSet),e=>e.code==="auto_warm_standby_required");
 m.deployments[1].release_sha=m.deployments[0].release_sha;
 assert.equal(validateContract(m,m.repository,providerSet).failover.mode,"auto-verified");
});

test("Published schema retains the runtime contract boundaries",()=>{
 const schema=load("schemas/deployment-contract.schema.json");
 assert.equal(schema.$schema,"https://json-schema.org/draft/2020-12/schema");
 assert(schema.properties.failover.required.includes("router"));
 const runbook=new RegExp(schema.properties.failover.properties.runbook.pattern);
 assert(runbook.test("docs/FAILOVER.md"));
 assert(runbook.test(".github/operations/failover.md"));
 assert(!runbook.test("https://private.example/runbook"));
 const origin=new RegExp(schema.properties.deployments.items.properties.origin.pattern);
 assert(origin.test("https://app.example.net"));
 assert(!origin.test("http://app.example.net"));
 assert(!origin.test("https://app.example.net/admin"));
 assert.equal(schema.allOf.length,4);
});
