import test from "node:test";
import assert from "node:assert/strict";
import {scanHasConfirmedDegradation,scanPortfolio} from "../src/scan.mjs";

const repository=(name,branch="main")=>({repository:`neophilism/${name}`,default_branch:branch});
const envelope=value=>{
  const bytes=Buffer.from(JSON.stringify(value));
  return {encoding:"base64",content:bytes.toString("base64"),size:bytes.length};
};
const response=(status,value)=>({status,ok:status>=200&&status<300,json:async()=>value});
const manifest=(mode="inventory")=>({monitoring:{mode},deployments:[],failover:{}});
function dependencies(overrides={}){
  return {inventory:{repositories:[repository("Beta"),repository("Alpha","release/test")]},
    knownProviders:new Set(["provider"]),approvals:{approvals:[]},concurrency:2,
    checkedAt:()=>"2026-10-25T00:00:00.000Z",
    validateContract:value=>value,findApproval:()=>null,
    probe:async()=>({ok:true}),plan:()=>({reason:"automatic_failover_not_authorized"}),
    ...overrides};
}

test("uses only bounded read-only GitHub manifest requests and sorts results",async()=>{
  const calls=[];
  const report=await scanPortfolio(dependencies({token:"secret",transport:async(url,options)=>{
    calls.push({url,options});return response(200,envelope(manifest()));
  }}));
  assert.deepEqual(report.results.map(result=>result.repository),["neophilism/Alpha","neophilism/Beta"]);
  assert.deepEqual(report.summary,{inventory_only:2});
  assert.equal(report.checked_at,"2026-10-25T00:00:00.000Z");
  for(const call of calls){
    assert.match(call.url,/^https:\/\/api\.github\.com\/repos\/neophilism\//);
    assert.equal(call.options.method,"GET");
    assert.equal(call.options.redirect,"error");
    assert.equal(call.options.cache,"no-store");
    assert.equal(call.options.headers.Authorization,"Bearer secret");
  }
  assert.match(calls.find(call=>call.url.includes("Alpha")).url,/ref=release%2Ftest$/);
});

test("distinguishes missing, unavailable, and malformed manifests without leaking bodies",async()=>{
  const entries=[repository("Missing"),repository("Unavailable"),repository("Malformed")];
  const report=await scanPortfolio(dependencies({inventory:{repositories:entries},transport:async url=>{
    if(url.includes("Missing"))return response(404,{});
    if(url.includes("Unavailable"))return response(503,{secret:"do-not-return"});
    return response(200,{encoding:"base64",content:"!!!!",size:3});
  }}));
  assert.deepEqual(report.results,[
    {repository:"neophilism/Malformed",status:"invalid_or_unavailable_contract"},
    {repository:"neophilism/Missing",status:"not_integrated"},
    {repository:"neophilism/Unavailable",status:"manifest_unavailable"}
  ]);
  assert.doesNotMatch(JSON.stringify(report),/do-not-return/);
});

test("does not probe unapproved deployments or grant routing authority",async()=>{
  const active={monitoring:{mode:"active"},failover:{},deployments:[
    {id:"primary",role:"primary"},{id:"standby",role:"standby"}
  ]};
  let probes=0,planning;
  const report=await scanPortfolio(dependencies({inventory:{repositories:[repository("App")]},
    transport:async()=>response(200,envelope(active)),
    findApproval:(_registry,target)=>target.id==="primary"?{}:null,
    probe:async()=>{probes++;return {ok:false};},
    plan:(_contract,states,options)=>{planning={states,options};return {reason:"dry_run"};}
  }));
  assert.equal(probes,1);
  assert.equal(report.results[0].status,"degraded");
  assert.equal(planning.states.primary.centrallyApproved,true);
  assert.equal(planning.states.standby.centrallyApproved,false);
  assert.deepEqual(planning.options,{unhealthySamples:3,independentMonitorQuorum:false,
    routingAuthority:false,exclusiveWriterLease:false});
  assert.equal(scanHasConfirmedDegradation(report),true);
});

test("fails closed for invalid configuration and oversized decoded responses",async()=>{
  await assert.rejects(scanPortfolio(dependencies({concurrency:17})),/invalid_scan_configuration/);
  const body="x".repeat(16*1024+1);
  const report=await scanPortfolio(dependencies({inventory:{repositories:[repository("Huge")]},
    transport:async()=>response(200,{encoding:"base64",content:Buffer.from(body).toString("base64"),size:body.length})
  }));
  assert.equal(report.results[0].status,"invalid_or_unavailable_contract");
  assert.equal(scanHasConfirmedDegradation(report),false);
});

