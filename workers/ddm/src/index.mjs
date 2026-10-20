/** DDM D1 control plane: read-only protected dashboard plus bounded external health cron.
 * No paid providers, account provisioning, promotion, DNS changes or app writes.
 * Deployed only after owner connects Cloudflare Workers Free and D1 Free.
 */
const json=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",
 "x-content-type-options":"nosniff","referrer-policy":"no-referrer"}});
const MIN_TOKEN=32;
function approvedUrl(origin,path){
 if(typeof origin!=="string"||typeof path!=="string"||!/^\/[^?#]*$/.test(path))return null;
 let u;try{u=new URL(origin)}catch{return null}
 const h=u.hostname.toLowerCase();
 if(u.protocol!=="https:"||u.username||u.password||u.hash||u.search||u.pathname!=="/"||
 !h.includes(".")||h==="localhost"||h.endsWith(".internal")||h.endsWith(".local")||
 /^\d+\.\d+\.\d+\.\d+$/.test(h)||h.startsWith("["))
 return null;
 return u.origin+path;
}
export function checkReadyJson(data,want){
 if(data===null||Array.isArray(data)||typeof data!=="object")return false;
 for(const [path,expected] of Object.entries(want)){
  const actual=path.split(".").reduce((x,k)=>x&&typeof x==="object"&&Object.hasOwn(x,k)?x[k]:undefined,data);
  if(actual!==expected)return false;
 }
 return true;
}
async function compareToken(supplied,expected){
 if(typeof supplied!=="string"||!supplied.startsWith("Bearer ")||typeof expected!=="string"||
 expected.length<MIN_TOKEN)return false;
 const key=supplied.slice(7);
 if(key.length<MIN_TOKEN||key.length>256)return false;
 const enc=new TextEncoder();
 const [a,b]=await Promise.all([crypto.subtle.digest("SHA-256",enc.encode(key)),crypto.subtle.digest("SHA-256",enc.encode(expected))]);
 const one=new Uint8Array(a),two=new Uint8Array(b);let diff=0;
 for(let i=0;i<one.length;i++)diff|=one[i]^two[i];
 return diff===0;
}
export async function checkEndpoint(d,transport=fetch){
 const url=approvedUrl(d.origin,d.ready_path);
 if(!url)return {ok:false,http_status:null,latency_ms:null,reason:"unsafe_origin"};
 const start=Date.now();
 try{
  const r=await transport(url,{method:"GET",redirect:"manual",
   headers:{"Accept":"application/json","X-Deployment-Monitor":"1"},
   signal:AbortSignal.timeout(5500)});
  const latency_ms=Date.now()-start;
  if(r.status!==d.expected_status)return {ok:false,http_status:r.status,latency_ms,reason:"http_status"};
  const fields=JSON.parse(d.required_fields_json??"{}");
  if(Object.keys(fields).length){
    if(!r.headers.get("content-type")?.includes("application/json"))
      return {ok:false,http_status:r.status,latency_ms,reason:"not_json"};
    const body=await r.text();
    if(body.length>32768)return {ok:false,http_status:r.status,latency_ms,reason:"oversized_response"};
    let decoded;try{decoded=JSON.parse(body)}catch{return {ok:false,http_status:r.status,latency_ms,reason:"invalid_json"}}
    if(!checkReadyJson(decoded,fields))return {ok:false,http_status:r.status,latency_ms,reason:"readiness_predicate"};
  }
  return {ok:true,http_status:r.status,latency_ms,reason:null};
 }catch{return {ok:false,http_status:null,latency_ms:Date.now()-start,reason:"network_timeout_or_tls"}}
}
async function collect(env){
 if(!env.DB)return {error:"D1 binding not configured"};
 const rows=await env.DB.prepare(
  "SELECT d.id,d.origin,d.ready_path,d.expected_status,d.required_fields_json "+
  "FROM ddm_deployments d JOIN ddm_services s ON s.id=d.service_id "+
  "WHERE d.central_approved=1 AND d.active=1 AND s.monitoring_enabled=1 "+
  "ORDER BY (d.last_sampled_at IS NOT NULL),d.last_sampled_at ASC,d.id ASC LIMIT 12"
 ).all();
 const pending=rows.results??[];
 // Parallel bounded external probes; only previously authorized origins.
 const checks=await Promise.all(pending.map(async d=>({d,check:await checkEndpoint(d)})));
 for(const {d,check} of checks){
  await env.DB.batch([
   env.DB.prepare("INSERT INTO ddm_observations(deployment_id,observed_at,probe_region,latency_ms,http_status,readiness_ok,failure_code) "+
    "VALUES(?,datetime('now'),'cloudflare-edge',?,?,?,?,?)")
   .bind(d.id,check.latency_ms,check.http_status,check.ok?1:0,check.reason),
   env.DB.prepare("UPDATE ddm_deployments SET last_sampled_at=datetime('now'),verified_readiness=?,runtime_status=?,updated_at=datetime('now') WHERE id=?")
   .bind(check.ok?1:0,check.ok?"ready":"degraded",d.id)
  ]);
 }
 return {sampled:checks.length,ready:checks.filter(x=>x.check.ok).length};
}
async function report(env){
 const [totals,deployments,recommendations,usage,incidents]=await Promise.all([
  env.DB.prepare("SELECT count(*) AS total, sum(CASE WHEN monitoring_enabled=1 THEN 1 ELSE 0 END) monitored FROM ddm_services").first(),
  env.DB.prepare("SELECT s.display_name AS service,s.repo,d.id,d.provider_id,d.origin,d.git_revision,d.runtime_status,d.verified_readiness,d.last_sampled_at "+
    "FROM ddm_services s JOIN ddm_deployments d ON d.service_id=s.id ORDER BY s.display_name,d.id LIMIT 150").all(),
  env.DB.prepare("SELECT r.service_id,s.display_name AS service,r.provider_id,r.rank,r.score,r.eligibility,r.confidence,r.monthly_usd_expected,r.computed_at "+
    "FROM ddm_recommendations r JOIN ddm_services s ON s.id=r.service_id ORDER BY s.display_name,r.rank LIMIT 450").all(),
  env.DB.prepare("SELECT account_id,substr(captured_at,1,10) AS day,max(billed_usd) AS observed_billed_usd,"+
    "max(credits_remaining) AS credits_remaining FROM ddm_usage_samples "+
    "WHERE captured_at>=datetime('now','-31 days') GROUP BY account_id,substr(captured_at,1,10) LIMIT 1000").all(),
  env.DB.prepare("SELECT id,service_id,category,started_at,resolved_at,impact FROM ddm_incidents ORDER BY started_at DESC LIMIT 35").all()
 ]);
 const ready=(deployments.results??[]).filter(d=>d.verified_readiness===1);
 return {schema_version:1,generated_at:new Date().toISOString(),data_source:"cloudflare_d1_live",
   live_deployment_count:ready.length,tracked_service_count:totals?.total??0,monitored_service_count:totals?.monitored??0,
   known_quotas_only:true,deployments:deployments.results??[],rankings:recommendations.results??[],
   recent_usage:usage.results??[],incidents:incidents.results??[],
   actual_spend_total_usd:null,optimized_paid_spend_usd:null,
   estimate_status:"insufficient_verified_usage_and_pricing_data"};
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==="/api/health")return json({service:"ddm",liveness:"alive",database_connected:!!env.DB});
  if(url.pathname.startsWith("/api/")){
    if(!await compareToken(request.headers.get("authorization"),env.DDM_READ_TOKEN))
      return json({error:"not_authorized"},401);
    if(!env.DB)return json({error:"database_not_configured"},503);
    if(url.pathname==="/api/report"&&request.method==="GET")
      try{return json(await report(env))}catch{return json({error:"database_unavailable"},503)}
    return json({error:"not_found"},404);
  }
  return env.ASSETS?env.ASSETS.fetch(request):json({error:"static_assets_unavailable"},503);
 },
 async scheduled(_controller,env,ctx){
  ctx.waitUntil(collect(env));
 }
};
