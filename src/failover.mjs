/** Pure planner. No network, DNS, billing, provider mutation or DB writes.
 * A caller must prove independent monitors and a durable exclusive promotion
 * lock before an actuator can execute; the foundation never executes one.
 */
export function planFailover(contract,states,{unhealthySamples=0,independentMonitorQuorum=false,routingAuthority=false,exclusiveWriterLease=false}={}){
  const refuse=reason=>({action:"none",reason});
  if(contract.failover.mode!=="auto-verified")return refuse("automatic_failover_not_authorized");
  if(unhealthySamples<3||!independentMonitorQuorum)return refuse("independent_failure_quorum_missing");
  if(!routingAuthority||contract.failover.router!=="verified-external")return refuse("routing_control_unverified");
  if(contract.failover.stateful&&(!contract.failover.writer_fencing||!exclusiveWriterLease))
    return refuse("write_fencing_not_verified");
  const primary=contract.deployments.find(d=>d.role==="primary");
  if(!primary||states[primary.id]?.ok!==false)return refuse("primary_not_proven_unhealthy");
  const eligible=contract.deployments.filter(d=>d.role==="standby"&&d.provider!==primary.provider&&
    d.preprovisioned===true&&d.warm===true&&d.quota_verified===true&&
    states[d.id]?.ok===true&&d.release_sha&&d.release_sha===primary.release_sha);
  eligible.sort((a,b)=>(a.priority??50)-(b.priority??50)||a.id.localeCompare(b.id));
  if(!eligible.length)return refuse("no_verified_same_release_zero_cost_standby");
  return {action:"propose_promotion",candidate:eligible[0].id,requires_atomic_router_cas:true,execute:false};
}
