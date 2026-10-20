/** Incremental, evidence-based cost forecast. No known usage -> no precise bill. */
export const rateCard20261020={
  digitalocean_app_basic_512mb:5,
  digitalocean_app_1gb:10,
  netlify_personal_account:9,
  deno_deploy_pro_account:20,
  cloudflare_workers_paid_account:5,
  northflank_container_nano:2.70,
  koyeb_eco_nano:1.61,
  render_starter_512mb:7,
  github_public_static:0,
  storage_gb_month:0.35
};
export function scenarioForecast(sites,{lowMonthly=5,highMonthly=20,perDatabase=null}={}){
  const counts={web:0,static:0,worker:0,unknown:0};
  for(const s of sites){
    if(s.type==="static_site")counts.static++;
    else if(s.type==="web_service")counts.web++;
    else counts.unknown++;
  }
  const low=counts.web*lowMonthly, high=counts.web*highMonthly;
  return {source:"listed_web_services_only",measured:false,scope:"hosting-web-containers-not-real-portfolio-budget",
    service_counts:counts,known_baseline_min_usd_month:low,known_baseline_max_usd_month:high,
    addons_not_included:["Neon existing Launch compute, storage, egress","GPU and music generation","object storage and egress","transactional email","custom domains renewal","CDN paid feature usage","workers and queues","backups, independent monitors and paid DR","payment processing and tax"],
    authoritative_paid_budget_usd_month:null,
    note:"Illustrative range applies $5-20/month to each listed dynamic Render web service, not an invoice or verified workload-specific quote."};
}
export function rankPaidQuotes(workload,quotes,telemetry){
  return quotes.filter(q=>q&&Number.isFinite(q.base_usd_month)&&q.base_usd_month>=0)
    .map(q=>{
      const unknown=!(Number.isFinite(telemetry?.monthly_requests)&&Number.isFinite(telemetry?.monthly_egress_gb));
      const cost=q.base_usd_month+(unknown?0:Math.max(0,telemetry.monthly_requests-(q.included_requests??0))*(q.usd_per_request??0)+
      Math.max(0,telemetry.monthly_egress_gb-(q.included_egress_gb??0))*(q.usd_per_egress_gb??0));
      return {id:q.id,estimated_usd_month:unknown?null:Math.round(cost*100)/100,
        base_usd_month:q.base_usd_month,confidence:unknown?"insufficient_metrics":"usage_scaled"};
    }).sort((a,b)=>(a.estimated_usd_month??a.base_usd_month)-(b.estimated_usd_month??b.base_usd_month));
}
