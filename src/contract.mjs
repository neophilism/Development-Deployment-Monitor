/** Zero-dependency validation for the per-repository deployment contract.
 * The public manifest MUST NOT contain credentials or unreviewed active URLs.
 */
export const KINDS=new Set(["unclassified","web-app","api","worker","static-site","library","research","infrastructure","job","control-plane"]);
export const MODES=new Set(["inventory","active"]);
export const FAILOVER_MODES=new Set(["disabled","observe-only","manual","auto-verified"]);
export const ROUTERS=new Set(["none","verified-external"]);
export class ContractError extends Error{constructor(code){super(code);this.name="ContractError";this.code=code;}}
function check(ok,code){if(!ok)throw new ContractError(code);}
function isObject(o){return o!==null&&typeof o==="object"&&!Array.isArray(o);}
function onlyKeys(o,names){check(Object.keys(o).every(k=>names.includes(k)),"unknown_field");}
function optionalString(value,{code,max,pattern}){
  if(value===undefined)return;
  check(typeof value==="string"&&value.length>0&&value.length<=max&&(!pattern||pattern.test(value)),code);
}
export function validateOrigin(raw){
  check(typeof raw==="string"&&raw.length<256,"origin_invalid");
  let u;try{u=new URL(raw);}catch{throw new ContractError("origin_invalid");}
  check(u.protocol==="https:"&&!u.username&&!u.password&&!u.hash&&!u.search&&u.pathname==="/"&&u.origin===raw.replace(/\/$/,""),"origin_unsafe");
  const host=u.hostname.toLowerCase();
  check(host.includes(".")&&!host.endsWith(".local")&&!host.endsWith(".internal")&&!host.endsWith(".localhost")&&host!=="localhost"&&!/^\[/.test(host)&&!/^\d+\.\d+\.\d+\.\d+$/.test(host),"origin_private_or_ip");
  return u.origin;
}
export function validateContract(o,expectedRepo,approvedProviders){
  check(isObject(o),"contract_invalid");
  onlyKeys(o,["schema_version","repository","kind","monitoring","budget","failover","deployments"]);
  check(o.schema_version===1,"schema_version_mismatch");
  check(o.repository===expectedRepo&&/^neophilism\/[A-Za-z0-9_.-]+$/.test(expectedRepo),"repository_mismatch");
  check(KINDS.has(o.kind),"workload_kind_invalid");
  check(isObject(o.monitoring),"monitoring_invalid");
  onlyKeys(o.monitoring,["mode","description"]);
  check(MODES.has(o.monitoring.mode),"monitoring_mode_invalid");
  optionalString(o.monitoring.description,{code:"monitoring_description_invalid",max:500});
  check(isObject(o.budget)&&o.budget.monthly_usd_max===0&&o.budget.allow_billable_fallback===false,"zero_budget_required");
  onlyKeys(o.budget,["monthly_usd_max","allow_billable_fallback"]);
  check(isObject(o.failover)&&FAILOVER_MODES.has(o.failover.mode)&&typeof o.failover.stateful==="boolean"&&typeof o.failover.writer_fencing==="boolean"&&ROUTERS.has(o.failover.router),"failover_invalid");
  onlyKeys(o.failover,["mode","stateful","writer_fencing","router","stable_origin","runbook"]);
  if(o.failover.stable_origin!==undefined)validateOrigin(o.failover.stable_origin);
  optionalString(o.failover.runbook,{code:"runbook_invalid",max:180,pattern:/^(?:docs|\.github)\/[A-Za-z0-9_./-]+\.md$/});
  if(o.failover.router==="none")check(o.failover.stable_origin===undefined,"stable_origin_without_router");
  if(o.failover.router==="verified-external")check(o.failover.stable_origin!==undefined,"router_origin_required");
  check(Array.isArray(o.deployments)&&o.deployments.length<=20,"deployments_invalid");
  const ids=new Set(),origins=new Set();
  for(const d of o.deployments){
    check(isObject(d),"deployment_invalid");
    onlyKeys(d,["id","provider","origin","ready_path","expected_status","role","ready_json","release_sha","region","preprovisioned","warm","quota_verified","priority"]);
    check(typeof d.id==="string"&&/^[a-z0-9][a-z0-9-]{0,62}$/.test(d.id)&&!ids.has(d.id),"deployment_id_invalid");
    ids.add(d.id);
    check(typeof d.provider==="string"&&approvedProviders.has(d.provider),"provider_unknown");
    const origin=validateOrigin(d.origin);
    check(!origins.has(origin),"deployment_origin_duplicate");
    origins.add(origin);
    check(typeof d.ready_path==="string"&&/^\/[^?#]*$/.test(d.ready_path)&&d.ready_path.length<=180,"ready_path_invalid");
    check(Number.isInteger(d.expected_status)&&d.expected_status>=200&&d.expected_status<=299,"ready_status_invalid");
    check(["primary","standby"].includes(d.role)&&isObject(d.ready_json)&&Object.keys(d.ready_json).length>0,"deployment_role_or_ready_json_invalid");
    for(const [k,v] of Object.entries(d.ready_json))
      check(/^[A-Za-z][\w.]{0,75}$/.test(k)&&["string","number","boolean"].includes(typeof v)&&Number.isFinite(typeof v==="number"?v:0),"ready_json_invalid");
    if(d.release_sha!==undefined)check(typeof d.release_sha==="string"&&/^[a-f0-9]{40}$/.test(d.release_sha),"release_sha_invalid");
    optionalString(d.region,{code:"region_invalid",max:80,pattern:/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/});
    for(const flag of ["preprovisioned","warm","quota_verified"])if(d[flag]!==undefined)check(typeof d[flag]==="boolean","flag_invalid");
    if(d.priority!==undefined)check(Number.isInteger(d.priority)&&d.priority>=0&&d.priority<=100,"priority_invalid");
  }
  if(o.monitoring.mode==="active"){
    check(o.deployments.length>0,"active_without_deployments");
    check(o.deployments.filter(x=>x.role==="primary").length===1,"active_primary_required");
    check(o.deployments.every(x=>x.release_sha&&x.quota_verified===true),"active_evidence_required");
  }
  if(o.failover.mode==="auto-verified"){
    check(o.monitoring.mode==="active"&&o.failover.router==="verified-external","auto_router_required");
    check(!o.failover.stateful||o.failover.writer_fencing,"auto_writer_fencing_required");
    const primary=o.deployments.find(x=>x.role==="primary");
    check(Boolean(primary),"auto_primary_required");
    check(o.deployments.some(x=>x.role==="standby"&&x.preprovisioned===true&&x.warm===true&&x.quota_verified===true&&x.provider!==primary.provider&&x.release_sha===primary.release_sha),"auto_warm_standby_required");
  }
  return o;
}
export function validateInventory(inventory){
  check(inventory.schema_version===1&&inventory.owner==="neophilism"&&Array.isArray(inventory.repositories),"inventory_invalid");
  check(inventory.excluded.map(e=>e.repository).join(",")==="neophilism/pupil,neophilism/neurosynth,neophilism/facerec,neophilism/hubs","exclusions_mismatch");
  const excluded=new Set(inventory.excluded.map(e=>e.repository));
  const ids=new Set(),names=new Set();
  for(const r of inventory.repositories){
    check(typeof r.repository==="string"&&/^neophilism\/[\w.-]+$/.test(r.repository)&&!excluded.has(r.repository)&&!names.has(r.repository),"inventory_repository_invalid");
    check(Number.isInteger(r.repository_id)&&r.repository_id>0&&!ids.has(r.repository_id),"inventory_id_invalid");
    check(typeof r.default_branch==="string"&&r.default_branch.length>0,"default_branch_invalid");
    ids.add(r.repository_id);names.add(r.repository);
  }
  check(names.size>=1,"inventory_empty");
  return inventory;
}
