import {readFile,writeFile,mkdir} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {hostCandidates,allocatePortfolio} from "./placement.mjs";
import {scenarioForecast} from "./forecast.mjs";

const root=new URL("../",import.meta.url);
const read=async path=>JSON.parse(await readFile(new URL(path,root),"utf8"));
export function generatePreview(inventory,resources,registry){
 const allocation=allocatePortfolio(inventory.workloads,resources);
 const assignments=new Map(allocation.entries.map(x=>[x.deployment_id,x]));
 const services=inventory.workloads.map(w=>{
   const matches=hostCandidates(w,resources).filter(p=>p.eligible);
   const assignment=assignments.get(w.deployment_id);
   return {id:w.deployment_id,name:w.name,repository:w.repository,
     provisional_one_host_allocation:assignment?.recommendation??null,
     capacity_assumptions_unverified:true,
     status:"suspended-on-render",classification:w.workload_class,
     ranked_free_options:matches.slice(0,8).map(p=>p.provider_id),
     account_guard_verified:false,verified_live_deployment:null,
     next_action:w.workload_class==="unclassified"
       ?"Inspect app runtime and security before ranking"
       :"Connect free host account, securely transfer runtime secrets, deploy and verify",
     needs_private_auth:w.needs_private_auth,stateful:w.stateful};
 });
 const forecast=scenarioForecast(inventory.services);
 return {schema_version:1,snapshot_date:inventory.snapshot_date,
   eligible_repositories:registry.repositories.length,
   suspended_legacy_services:inventory.suspended_web_count,
   verified_live_deployments:0,
   free_resource_candidates:resources.resources.length,
   distinct_render_repositories:new Set(inventory.workloads.map(w=>w.repository)).size,
   source_live_provider_accounts_connected:0,
   account_quota_instrumented:false,
   data_is_historical:true,
   hypothetical_hosting_low_usd_month:forecast.known_baseline_min_usd_month,
   hypothetical_hosting_high_usd_month:forecast.known_baseline_max_usd_month,
   excluded_costs:forecast.addons_not_included,
   estimation_confidence:"hypothetical_unit_costs_only",
   services,resources:resources.resources,
   notes:["No Render replacement is counted as deployed without a real readiness observation.",
     "Provider ranking is provisional and respects published free app limits, but actual account credits and resource capacities are unverified.",
     "A free provider must be compatible with commercial use and must block any overage billing.",
     "The paid range covers only 23 web-container slots and excludes databases, GPU and other costs."]};
}
export function reportMarkdown(d){
 const lines=[
 "# Development Deployment Monitor — preliminary allocation and paid spend",
 "",
 "Snapshot: "+d.snapshot_date+". This is **not** a confirmed live deployment or a real provider invoice.",
 "",
 "Eligible repositories: "+d.eligible_repositories+". Suspended Render web services: "+
 d.suspended_legacy_services+" across "+d.distinct_render_repositories+" repositories.",
 "",
 "## Free provider recommendation by Render deployment",
 "",
 "| Deployment | Current status | Provisional single host (not provisioned) | Ranked alternative hosts (not provisioned) | Action |",
 "| --- | --- | --- | --- | --- |",
 ...d.services.map(x=>"| "+x.name+" | "+x.status+" | "+
  (x.provisional_one_host_allocation??"no free slot with known cap")+" | "+
  (x.ranked_free_options.length?x.ranked_free_options.filter(p=>p!==x.provisional_one_host_allocation).slice(0,5).join(", "):"unclassified")+" | "+
  x.next_action+" |"),
 "",
 "Provisional only: published app-count caps are account-wide, but available CPU, RAM, bandwidth and credits are **not** verified. Free tier capacity cannot be assumed for live business use.",
 "",
 "## Preliminary paid-service sensitivity (NOT a budget)",
 "",
 "Illustrative web-container subtotal if every one of the "+d.suspended_legacy_services+
 " Render web services required its own paid host: **$"+d.hypothetical_hosting_low_usd_month+
 "–$"+d.hypothetical_hosting_high_usd_month+" per month** for container compute only.",
 "",
 "This does not include any of the following: "+d.excluded_costs.join("; ")+".",
 "",
 "Once telemetry is collected for real live services, select optimal shared hosts and paid offers across"+
 " every workload, accounting for costs, quotas, uptime, geographic latency and scale.",
 "",
 "## What is missing",
 "",
 "- Verified credentials and $0 account quota on independent hosts.",
 "- Verified deployment URLs and real uptime/readiness histories.",
 "- Measured monthly CPU, memory, egress, storage, request volume, GPU activity and application requirements.",
 "- Official metered provider pricing for the exact resource size and jurisdiction.",
 "- Stable domains, safe OAuth/cookie routing and same-revision failover rehearsals.",
 "- Continuously running control plane linked to its D1 Free database.",
 ""];
 return lines.join("\n");
}
export async function build(){
 const [inventory,resources,registry]=await Promise.all([
   read("registry/render-services-2026-10-20.json"),
   read("registry/free-resources.json"),
   read("registry/repositories.json")]);
 const d=generatePreview(inventory,resources,registry);
 const dest=new URL("site/data/",root);
 await mkdir(dest,{recursive:true});
 await writeFile(new URL("portfolio-snapshot.json",dest),JSON.stringify(d,null,2)+"\n");
 await mkdir(new URL("reports/",root),{recursive:true});
 await writeFile(new URL("reports/PRELIMINARY.md",root),reportMarkdown(d)+"\n");
 console.log("Created explicit historical 23-service snapshot, 62-resource catalog and preliminary cost sensitivity report.");
 return d;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await build();
