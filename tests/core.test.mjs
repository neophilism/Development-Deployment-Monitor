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
const endpoint=(id,role,provider)=>({id,provider,origin:"https://example.net",ready_path:"/api/ready",expected_status:200,role,ready_json:{status:"ready"},release_sha:"a".repeat(40),preprovisioned:true,warm:true,quota_verified:true});
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
