/** Portfolio reconciliation after any new GitHub repository appears.
 * Safe by default: no provider deployments or money; observe-only without an
 * explicitly installed owner-scoped GitHub App token.
 */
import {readFile,writeFile} from "node:fs/promises";
const owner="neophilism";
export const exclusionNames=["pupil","neurosynth","facerec","hubs"];
const forbidden=new Set(exclusionNames.map(x=>owner+"/"+x));
export function classifySourceFiles(paths=[],pkg={}){
 const set=new Set(paths);
 const dependencies={...(pkg.dependencies??{}),...(pkg.devDependencies??{})};
 if(set.has("Dockerfile")||set.has("docker-compose.yml"))return "container";
 if(dependencies.next)return "nextjs";
 if(dependencies.astro||dependencies.vite)return "unclassified"; // may also have API
 return "unclassified";
}
export function reconcileRepoList(owned,registered){
 const existing=new Set(registered.repositories.map(x=>x.repository));
 const sorted=[...owned].filter(x=>x.owner?.login===owner&&!x.fork)
   .sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))||a.id-b.id);
 const oldest=sorted.slice(0,4).map(x=>x.name);
 if(oldest.join(",")!==exclusionNames.join(","))throw Error("Owner's historically oldest four changed; abort rather than include exclusions");
 const additions=[];
 for(const r of sorted.slice(4)){
  if(r.name==="Development-Deployment-Monitor"||existing.has(r.full_name)||forbidden.has(r.full_name))continue;
  additions.push({repository:r.full_name,repository_id:r.id,default_branch:r.default_branch||"main",
    registration:"planned",has_git_content:typeof r.size==="number"&&r.size>0,
    classification:"unclassified"});
 }
 return additions;
}
async function requestJson(url,token,options={}){
 const {headers:extraHeaders={},...rest}=options;
 const res=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(15000),...rest,
  headers:{"Accept":"application/vnd.github+json","User-Agent":"development-deployment-monitor/1",...(token?{Authorization:"Bearer "+token}:{}),...extraHeaders}});
 if(!res.ok)throw Error("GitHub API returned HTTP "+res.status);
 return res.json();
}
async function listOwnerRepos(token){
 const all=[];
 for(let page=1;page<=10;page++){
  const rows=await requestJson("https://api.github.com/users/"+owner+"/repos?per_page=100&page="+page+"&sort=created&direction=asc",token);
  all.push(...rows);if(rows.length<100)break;
 }
 if(all.length>=1000)throw Error("Owner repo list may be incomplete");
 return all;
}
const initial={
 schema_version:1,repository:"",kind:"unclassified",monitoring:{mode:"inventory"},
 budget:{monthly_usd_max:0,allow_billable_fallback:false},
 failover:{mode:"disabled",stateful:false,writer_fencing:false,router:"none"},deployments:[]
};
const reusable=`name: Deployment monitor contract
on:
  pull_request:
    paths:
      - .github/deployment-monitor.json
      - .github/workflows/deployment-monitor-contract.yml
  workflow_dispatch:
permissions:
  contents: read
jobs:
  contract:
    uses: neophilism/Development-Deployment-Monitor/.github/workflows/validate-client.yml@main
`;
function encode(s){return [...new TextEncoder().encode(s)].map(x=>String.fromCharCode(x)).join("")}
async function enrolled(repo,token){
 const auth={Authorization:"Bearer "+token};
 const url="https://api.github.com/repos/"+repo.repository;
 const safeBranch="integrate/ddm-"+new Date().toISOString().slice(0,10).replace(/-/g,"");
 // Only scoped Github App token with explicit repo creation rights.
 const ref=await requestJson(url+"/git/ref/heads/"+encodeURIComponent(repo.default_branch),token);
 const response=await requestJson(url+"/git/refs",token,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ref:"refs/heads/"+safeBranch,sha:ref.object.sha})});
 if(!response.ref)throw Error("No Git branch created");
 for(const [path,content] of [[".github/deployment-monitor.json",JSON.stringify({...initial,repository:repo.repository},null,2)+"\n"],
 [".github/workflows/deployment-monitor-contract.yml",reusable]]){
   const exists=await fetch(url+"/contents/"+path+"?ref="+encodeURIComponent(safeBranch),{headers:auth});
   if(exists.ok)continue; // never overwrite another agent's existing setup
   if(exists.status!==404)throw Error("Cannot determine whether manifest exists");
   const put=await requestJson(url+"/contents/"+path,token,{method:"PUT",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({message:"Register with Development Deployment Monitor",content:btoa(encode(content)),branch:safeBranch})});
   if(!put.commit)throw Error("GitHub did not confirm manifest commit");
 }
 const pr=await requestJson(url+"/pulls",token,{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({title:"Enroll in Development Deployment Monitor (inventory only)",
   head:safeBranch,base:repo.default_branch,body:"Initial public-safe $0 inventory contract and reusable DDM contract CI. No host, database, credentials or application logic is modified."})});
 return {repo:repo.repository,url:pr.html_url};
}
export async function runDiscovery({apply=false}={}){
 const token=process.env.DDM_GITHUB_APP_TOKEN||process.env.GITHUB_TOKEN||"";
 const saved=JSON.parse(await readFile(new URL("../registry/repositories.json",import.meta.url),"utf8"));
 const diff=reconcileRepoList(await listOwnerRepos(token),saved);
 console.log(JSON.stringify({snapshot_time:new Date().toISOString(),new_repositories:diff,apply_enabled:apply,authorization_present:!!process.env.DDM_GITHUB_APP_TOKEN},null,2));
 if(!apply||!diff.length)return diff;
 if(!process.env.DDM_GITHUB_APP_TOKEN||process.env.DDM_GITHUB_APP_TOKEN.length<24)throw Error("DDM_GITHUB_APP_TOKEN GitHub App installation secret is required to create cross-repo PRs");
 const results=[];
 for(const r of diff)try{results.push(await enrolled(r,process.env.DDM_GITHUB_APP_TOKEN))}
 catch(e){results.push({repo:r.repository,status:"not_enrolled",reason:String(e.message).slice(0,120)})}
 console.log(JSON.stringify({PRs:results},null,2));
 return results;
}
if(process.argv[1]?.endsWith("/discover.mjs"))await runDiscovery({apply:process.argv.includes("--apply")});
