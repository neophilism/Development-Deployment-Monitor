const SHA=/^[a-f0-9]{40}$/;
function object(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
function refuse(reason){return Object.freeze({action:"none",reason,execute:false});}
function approvedObservation(states,id,ok){
  return object(states)&&Object.hasOwn(states,id)&&object(states[id])&&
    states[id].centrallyApproved===true&&states[id].ok===ok;
}

/** Pure planner. No network, DNS, billing, provider mutation or DB writes.
 * A caller must prove independent monitors and a durable exclusive promotion
 * lock before an actuator can execute; this planner only returns proposals.
 */
export function planFailover(contract,states,options={}){
  if(!object(contract)||!object(contract.failover)||!Array.isArray(contract.deployments)||
    !object(contract.budget)||!object(states)||!object(options))
    return refuse("invalid_planning_input");
  const {unhealthySamples=0,independentMonitorQuorum=false,routingAuthority=false,
    exclusiveWriterLease=false}=options;
  if(!Number.isSafeInteger(unhealthySamples)||unhealthySamples<0||
    typeof independentMonitorQuorum!=="boolean"||typeof routingAuthority!=="boolean"||
    typeof exclusiveWriterLease!=="boolean")return refuse("invalid_planning_input");
  if(contract.monitoring?.mode!=="active"||contract.failover.mode!=="auto-verified")
    return refuse("automatic_failover_not_authorized");
  if(contract.budget.monthly_usd_max!==0||contract.budget.allow_billable_fallback!==false)
    return refuse("zero_cost_policy_not_verified");
  if(unhealthySamples<3||!independentMonitorQuorum)
    return refuse("independent_failure_quorum_missing");
  if(!routingAuthority||contract.failover.router!=="verified-external")
    return refuse("routing_control_unverified");
  if(contract.failover.stateful===true&&
    (contract.failover.writer_fencing!==true||!exclusiveWriterLease))
    return refuse("write_fencing_not_verified");
  const primaries=contract.deployments.filter(d=>object(d)&&d.role==="primary");
  if(primaries.length!==1)return refuse("primary_configuration_invalid");
  const primary=primaries[0];
  if(!SHA.test(primary.release_sha??"")||!approvedObservation(states,primary.id,false))
    return refuse("primary_not_proven_unhealthy");
  const eligible=contract.deployments.filter(d=>object(d)&&d.role==="standby"&&
    d.provider!==primary.provider&&d.preprovisioned===true&&d.warm===true&&
    d.quota_verified===true&&approvedObservation(states,d.id,true)&&
    SHA.test(d.release_sha??"")&&d.release_sha===primary.release_sha&&
    Number.isInteger(d.priority??50)&&(d.priority??50)>=0&&(d.priority??50)<=100);
  eligible.sort((a,b)=>(a.priority??50)-(b.priority??50)||a.id.localeCompare(b.id));
  if(!eligible.length)return refuse("no_verified_same_release_zero_cost_standby");
  return Object.freeze({action:"propose_promotion",candidate:eligible[0].id,
    requires_atomic_router_cas:true,execute:false});
}
