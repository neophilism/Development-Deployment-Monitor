import test from "node:test";
import assert from "node:assert/strict";
import {planFailover} from "../src/failover.mjs";

const release="a".repeat(40);
const deployment=(id,role,provider,priority=50)=>({id,role,provider,priority,
 release_sha:release,preprovisioned:true,warm:true,quota_verified:true});
const contract=()=>({monitoring:{mode:"active"},budget:{monthly_usd_max:0,allow_billable_fallback:false},
 failover:{mode:"auto-verified",router:"verified-external",stateful:false,writer_fencing:false},
 deployments:[deployment("primary","primary","netlify"),deployment("standby","standby","deno-deploy")]});
const states=()=>({primary:{ok:false,centrallyApproved:true},standby:{ok:true,centrallyApproved:true}});
const options=()=>({unhealthySamples:3,independentMonitorQuorum:true,routingAuthority:true});

test("returns a deterministic non-executing proposal only after every gate",()=>{
 const result=planFailover(contract(),states(),options());
 assert.deepEqual(result,{action:"propose_promotion",candidate:"standby",requires_atomic_router_cas:true,execute:false});
 assert.equal(Object.isFrozen(result),true);
});

test("never treats absent central approval as outage evidence",()=>{
 const observations=states();observations.primary={ok:false,centrallyApproved:false};
 assert.deepEqual(planFailover(contract(),observations,options()),
  {action:"none",reason:"primary_not_proven_unhealthy",execute:false});
});

test("fails closed for malformed planning inputs and nonzero cost policy",()=>{
 for(const [value,state,opts] of [
  [null,states(),options()],[contract(),null,options()],[contract(),states(),{...options(),unhealthySamples:Infinity}]
 ])assert.equal(planFailover(value,state,opts).reason,"invalid_planning_input");
 const paid=contract();paid.budget.monthly_usd_max=1;
 assert.equal(planFailover(paid,states(),options()).reason,"zero_cost_policy_not_verified");
});

test("requires failure quorum, routing authority, and writer fencing",()=>{
 assert.equal(planFailover(contract(),states(),{...options(),independentMonitorQuorum:false}).reason,"independent_failure_quorum_missing");
 assert.equal(planFailover(contract(),states(),{...options(),routingAuthority:false}).reason,"routing_control_unverified");
 const stateful=contract();stateful.failover.stateful=true;stateful.failover.writer_fencing=true;
 assert.equal(planFailover(stateful,states(),options()).reason,"write_fencing_not_verified");
 assert.equal(planFailover(stateful,states(),{...options(),exclusiveWriterLease:true}).action,"propose_promotion");
});

test("requires one primary and a healthy approved same-release zero-cost standby",()=>{
 const malformed=contract();malformed.deployments.push(deployment("primary-2","primary","cloudflare-workers"));
 assert.equal(planFailover(malformed,states(),options()).reason,"primary_configuration_invalid");
 for(const mutate of [
  value=>{value.deployments[1].provider="netlify";},
  value=>{value.deployments[1].release_sha="b".repeat(40);},
  value=>{value.deployments[1].quota_verified=false;},
  value=>{value.deployments[1].warm=false;}
 ]){
  const value=contract();mutate(value);
  assert.equal(planFailover(value,states(),options()).reason,"no_verified_same_release_zero_cost_standby");
 }
});

test("selects lowest priority and then stable id without mutating deployments",()=>{
 const value=contract();value.deployments.push(deployment("alpha","standby","cloudflare-workers",10));
 value.deployments.push(deployment("beta","standby","oracle-cloud",10));
 const observations={...states(),alpha:{ok:true,centrallyApproved:true},beta:{ok:true,centrallyApproved:true}};
 const original=value.deployments.map(x=>x.id);
 assert.equal(planFailover(value,observations,options()).candidate,"alpha");
 assert.deepEqual(value.deployments.map(x=>x.id),original);
});
