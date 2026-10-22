import fs from "node:fs";

const resourcePolicies=new Set(["billing-risk","demo-only","free-conditional","free-hard-limit","personal-only","restricted-use","verify-terms"]);
const providerPolicies=new Set(["existing-free-eligible","free-allowance-billing-risk","free-conditional","free-hard-quota","free-limited","paid","personal-only","trial-or-paid","verification-required"]);
const quotaScopes=new Set(["account","billing-account","project"]);
const idPattern=/^[a-z0-9][a-z0-9-]{0,79}$/;
const fail=message=>{throw new Error("Invalid provider catalogue: "+message);};
const isObject=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
const https=value=>{try{return new URL(value).protocol==="https:";}catch{return false;}};
const nonnegative=value=>value===null||(typeof value==="number"&&Number.isFinite(value)&&value>=0);

export function validateProviderCatalog(providers,resources){
  if(providers?.schema_version!==1||providers.guaranteed_zero_charges_by_default!==true||!Array.isArray(providers.providers)||!providers.providers.length)fail("provider envelope");
  if(resources?.schema_version!==1||resources.additional_charges_allowed!==false||resources.live_account_quota_data!==false||!Array.isArray(resources.resources)||resources.provider_count!==resources.resources.length)fail("resource envelope");
  const providerIds=new Set();
  for(const p of providers.providers){
    if(!isObject(p)||!idPattern.test(p.id)||providerIds.has(p.id)||typeof p.capability!=="string"||!providerPolicies.has(p.cost_policy)||typeof p.limitations!=="string"||!p.limitations||!https(p.documentation)||p.autodeploy_enabled!==false||p.verified_connected!==false)fail("provider "+p?.id);
    providerIds.add(p.id);
  }
  const resourceIds=new Set();
  for(const r of resources.resources){
    if(!isObject(r)||!idPattern.test(r.id)||resourceIds.has(r.id)||typeof r.name!=="string"||!r.name||typeof r.category!=="string"||!r.category||typeof r.kind!=="string"||!r.kind||!Array.isArray(r.capabilities)||!r.capabilities.length||new Set(r.capabilities).size!==r.capabilities.length||!r.capabilities.every(x=>typeof x==="string"&&x.length>0)||!resourcePolicies.has(r.policy)||!quotaScopes.has(r.quota_scope)||typeof r.notes!=="string"||!r.notes||!https(r.docs_url)||r.verified_connected!==false||r.cost_guard_verified!==false||!nonnegative(r.available_capacity)||!nonnegative(r.month_to_date_usage)||typeof r.reviewed_at!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(r.reviewed_at)||!nonnegative(r.published_account_app_cap)||typeof r.signup_requires_card!=="boolean"||typeof r.production_suitable!=="boolean")fail("resource "+r?.id);
    if(["billing-risk","demo-only","personal-only","restricted-use","verify-terms"].includes(r.policy)&&r.production_suitable===true)fail("unsafe production suitability "+r.id);
    resourceIds.add(r.id);
  }
  return {providerCount:providerIds.size,resourceCount:resourceIds.size};
}

if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
  const providers=JSON.parse(fs.readFileSync("registry/providers.json","utf8"));
  const resources=JSON.parse(fs.readFileSync("registry/free-resources.json","utf8"));
  const result=validateProviderCatalog(providers,resources);
  console.log(`Provider catalog valid: ${result.providerCount} control-plane providers and ${result.resourceCount} zero-cost candidates.`);
}
