/** Conservative portfolio-wide free-resource allocator.
 * Never converts a recommendation into a deployed state or a provider API call.
 */
const freeEligible=new Set(["free-hard-limit","free-conditional"]);
const hostCats=new Set(["static","serverless","container","vm"]);
// A documented free allowance is not available capacity until the account has been verified.
const isConnected=r=>r.verified_connected===true&&r.cost_guard_verified===true;
const validNum=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0;
export function hostCandidates(workload,offers,{connectedOnly=false,usage={}}={}){
  const resource=Array.isArray(offers)?offers:offers.resources;
  const needs=new Set(workload.capabilities??[]);
  const primaryClass=workload.workload_class??"unclassified";
  const memory=workload.min_memory_mb??0;
  const requiresAlwaysOn=workload.always_on===true;
  const commercial=workload.commercial!==false;
  const scoreRows=[];
  for(const p of resource){
    if(!hostCats.has(p.category))continue;
    let reason=null;
    if(!freeEligible.has(p.policy))reason="not_hard_zero_usd";
    if(commercial&&["personal-only","restricted-use","demo-only"].includes(p.policy))reason="commercial_use_not_eligible";
    if(primaryClass==="unclassified")reason="unclassified_workload";
    if(primaryClass==="static"&&!p.capabilities.includes("static"))reason="not_a_static_host";
    if(primaryClass==="api"&&!p.capabilities.some(c=>["api","node","docker","edge"].includes(c)))reason="no_api_support";
    if(primaryClass==="nextjs"&&!p.capabilities.includes("nextjs")&&!p.capabilities.includes("node"))reason="missing_nextjs_or_node";
    if(primaryClass==="container"&&!p.capabilities.some(c=>["docker","linux"].includes(c)))reason="container_unsupported";
    if(primaryClass==="persistent"&&!p.capabilities.includes("always-on"))reason="not_persistent";
    for(const need of needs){
      if(!p.capabilities.includes(need)){reason="missing_capability_"+need;break;}
    }
    if(requiresAlwaysOn&&!p.capabilities.includes("always-on"))reason="sleeping_or_ephemeral";
    if(p.signup_requires_card&&!isConnected(p))reason="payment_method_and_spend_guard_unverified";
    if(connectedOnly&&!isConnected(p))reason="account_unverified";
    const publishedCap=validNum(p.published_account_app_cap)?p.published_account_app_cap:null;
    const currentCap=validNum(p.available_capacity)?p.available_capacity:null;
    const hardCap=currentCap===null?publishedCap:(publishedCap===null?currentCap:Math.min(currentCap,publishedCap));
    const committed=usage[p.id]??0;
    if(!reason&&hardCap===0)reason="no_current_available_capacity";
    if(!reason&&hardCap!==null&&committed>=hardCap)reason="shared_free_account_app_limit";
    if(!reason&&memory>0&&p.min_memory_mb&&p.min_memory_mb<memory)reason="memory_insufficient";
    const score=100+
      (p.capabilities.includes("always-on")&&requiresAlwaysOn?30:0)+
      (p.capabilities.includes("nextjs")&&primaryClass==="nextjs"?25:0)+
      (p.capabilities.includes("static")&&primaryClass==="static"?20:0)+
      (p.capabilities.includes("custom-domain")?8:0)+
      (p.policy==="free-hard-limit"?10:0)-
      (p.category==="vm"?8:0)-
      (p.id==="render-web-free"?35:0)-
      (p.policy==="free-conditional"?12:0);
    scoreRows.push({provider_id:p.id,score,eligible:!reason,
      published_account_app_cap:publishedCap,current_available_capacity:currentCap,
      requires_payment_method:p.signup_requires_card===true,
      available_without_verified_account:false,
      action_allowed:!reason&&isConnected(p)&&p.autodeploy_enabled===true,
      reason:reason??(!isConnected(p)?"provider_account_and_cost_guard_not_verified":"eligible_for_evaluation"),
      cost_policy:p.policy,quota_scope:p.quota_scope,notes:p.notes,documentation:p.docs_url});
  }
  return scoreRows.sort((a,b)=>
    Number(b.eligible)-Number(a.eligible)||b.score-a.score||a.provider_id.localeCompare(b.provider_id));
}
export function allocatePortfolio(workloads,offers){
  const usage={};const allocated=[];const order=[...workloads].sort((a,b)=>(b.priority??0)-(a.priority??0)||a.deployment_id.localeCompare(b.deployment_id));
  for(const w of order){
    const ranking=hostCandidates(w,offers,{connectedOnly:false,usage});
    const options=ranking.filter(r=>r.eligible);
    const preferred=options[0]??null;
    if(preferred)usage[preferred.provider_id]=(usage[preferred.provider_id]??0)+1;
    allocated.push({deployment_id:w.deployment_id,repository:w.repository,existing_host_status:w.existing_host_status,
      recommendation:preferred?.provider_id??null,not_deployed:true,
      recommendation_status:preferred?"provisional_capacity_only_not_connected":"no_compatible_free_slot_after_shared_quota_constraints",
      alternatives:options.slice(1,15),disqualified:ranking.filter(r=>!r.eligible).slice(0,8)});
  }
  return {entries:allocated,provisional_usage:usage,all_live_deployments_verified:false};
}
