import {readFile,writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
const root=new URL("../",import.meta.url);
const load=async path=>JSON.parse(await readFile(new URL(path,root),"utf8"));
const lit=v=>v===null||v===undefined?"NULL":typeof v==="number"?String(v):"'"+String(v).replaceAll("'","''")+"'";
const sql=(table,columns,values)=>"INSERT OR IGNORE INTO "+table+" ("+columns.join(",")+") VALUES ("+values.map(lit).join(",")+");";
export function seedInventory(inventory,registry,offers){
 if(registry.repositories.length<58||inventory.workloads.length!==23||offers.resources.length<60)throw Error("Incomplete seed inputs");
 const statements=[
 "-- DDM public-safe historical catalogue. No credentials, connection strings, customer data or authenticated origins.",
 "-- Migration first: db/sqlite/001_init.sql. This import never overwrites existing D1 rows.",
 "BEGIN TRANSACTION;"
 ];
 for(const r of registry.repositories){
  statements.push(sql("ddm_repositories",["repo","github_repo_id","kind","enrolled","excluded"],
   [r.repository,r.repository_id,r.classification??"unclassified",0,0]));
 }
 for(const p of offers.resources){
  statements.push(sql("ddm_providers",["id","display_name","category","policy","capabilities_json","documentation_url","eligibility_verified"],
   [p.id,p.name,p.category,p.policy,JSON.stringify(p.capabilities),p.docs_url,0]));
 }
 for(const w of inventory.workloads){
  const columns=["id","repo","display_name","workload_class","deployment_purpose","stateful","always_on","priority","requirements_json","classification_verified","monitoring_enabled","failover_enabled"];
  statements.push(sql("ddm_services",columns,[w.deployment_id,w.repository,w.name,w.workload_class,"pitch_demo_or_internal",
   w.stateful?1:0,w.always_on?1:0,w.priority,JSON.stringify({legacy_provider:"render-web-free",needs_private_auth:w.needs_private_auth}),0,0,0]));
  statements.push(sql("ddm_deployments",
   ["id","service_id","provider_id","origin","ready_path","expected_status","git_revision","runtime_status","provider_reported_status","role","central_approved","active","verified_readiness","capacity_verified"],
   [w.deployment_id,w.deployment_id,"render-web-free",w.legacy_origin,"/api/health",200,null,"suspended","billing_quota_exhausted","legacy",0,0,0,0]));
 }
 statements.push("COMMIT;");
 return statements.join("\n")+"\n";
}
async function main(){
 const [i,r,c]=await Promise.all([load("registry/render-services-2026-10-20.json"),
 load("registry/repositories.json"),load("registry/free-resources.json")]);
 const data=seedInventory(i,r,c);
 await writeFile(new URL("db/sqlite/002_seed_inventory.sql",root),data);
 console.log("Generated safe D1 seed for 58 repositories, 23 suspended services and 62 provider candidates.");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
