#!/usr/bin/env node
import {readFile,appendFile} from "node:fs/promises";
import {resolve} from "node:path";
import {validateContract,validateInventory} from "./contract.mjs";
import {findExactApproval,validateApprovalRegistry} from "./approvals.mjs";
import {probeRepeated} from "./probe.mjs";
import {planFailover} from "./failover.mjs";

const root=new URL("../",import.meta.url);
const load=async p=>JSON.parse(await readFile(new URL(p,root),"utf8"));
const inventory=await load("registry/repositories.json");
const providers=await load("registry/providers.json");
const known=new Set(providers.providers.map(p=>p.id));

export async function validateClientFile(path,expectedRepo){
  const o=JSON.parse(await readFile(resolve(path),"utf8"));
  return validateContract(o,expectedRepo,known);
}
const arg=process.argv[2]||"help";
if(arg==="inventory"){
  validateInventory(inventory);
  if(inventory.repositories.length<58)throw new Error("Inventory regression: fewer than 58 previously eligible owner repositories");
  console.log("Eligible projects:",inventory.repositories.length);
  console.log("Excluded:",inventory.excluded.map(x=>x.repository).join(", "));
  console.log("Provider candidates:",known.size);
}else if(arg==="validate-client"){
  if(!process.argv[3]||!process.argv[4])throw new Error("usage: validate-client <manifest.json> <owner/repo>");
  await validateClientFile(process.argv[3],process.argv[4]);
  console.log("Manifest contract verified for "+process.argv[4]);
}else if(arg==="scan"){
  validateInventory(inventory);
  const approvals=validateApprovalRegistry(await load("registry/approved-origins.json"),known);
  const token=process.env.GITHUB_TOKEN;
  const results=[];
  const jobs=[...inventory.repositories];
  const workers=Array.from({length:6},async()=>{
    while(jobs.length){
      const entry=jobs.shift();
      const slug=entry.repository.split("/")[1];
      const uri="https://api.github.com/repos/neophilism/"+encodeURIComponent(slug)+"/contents/.github/deployment-monitor.json?ref="+encodeURIComponent(entry.default_branch);
      try{
        const r=await fetch(uri,{redirect:"error",headers:{"Accept":"application/vnd.github+json","User-Agent":"development-deployment-monitor/1",...(token?{Authorization:"Bearer "+token}:{})},signal:AbortSignal.timeout(8000)});
        if(r.status===404){results.push({repository:entry.repository,status:"not_integrated"});continue;}
        if(!r.ok){results.push({repository:entry.repository,status:"manifest_unavailable"});continue;}
        const e=await r.json();
        if(e.encoding!=="base64"||typeof e.content!=="string"||e.size>16384)throw Error("invalid GitHub content response");
        const manifest=validateContract(JSON.parse(Buffer.from(e.content,"base64").toString("utf8")),entry.repository,known);
        if(manifest.monitoring.mode!=="active"){results.push({repository:entry.repository,status:"inventory_only"});continue;}
        const statuses={};
        let monitored=0;
        for(const d of manifest.deployments){
          const a=findExactApproval(approvals,{repository:entry.repository,...d});
          if(!a){
            statuses[d.id]={ok:false,reason:"origin_not_centrally_approved",centrallyApproved:false};continue;
          }
          const evidence=await probeRepeated(d,{count:3});
          statuses[d.id]={ok:evidence.ok,reason:evidence.ok?"verified":"probe_failed",centrallyApproved:true};
          monitored++;
        }
        const primary=manifest.deployments.find(d=>d.role==="primary");
        const healthy=primary&&statuses[primary.id]?.ok===true;
        const suggestion=planFailover(manifest,statuses,{
          unhealthySamples:healthy?0:3,
          independentMonitorQuorum:false, // no cross-region durable quorum in this foundation
          routingAuthority:false,
          exclusiveWriterLease:false
        });
        results.push({repository:entry.repository,status:!monitored?"awaiting_approved_endpoint":healthy?"ready":"degraded",suggestion:suggestion.reason??"dry_run"});
      }catch{
        results.push({repository:entry.repository,status:"invalid_or_unavailable_contract"});
      }
    }
  });
  await Promise.all(workers);
  results.sort((a,b)=>a.repository.localeCompare(b.repository));
  const counts={};for(const r of results)counts[r.status]=(counts[r.status]||0)+1;
  console.log(JSON.stringify({checked_at:new Date().toISOString(),results,summary:counts},null,2));
  if(process.env.GITHUB_STEP_SUMMARY){
    const lines=["### Development Deployment Monitor",...Object.entries(counts).sort().map(([name,n])=>"- "+name+": "+n),"- Automatic traffic promotion: **disabled until independently verified and configured**"];
    await appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join("\n")+"\n");
  }
  if(results.some(r=>r.status==="degraded"))process.exitCode=1;
}else{
  console.log("Usage: node src/cli.mjs inventory | validate-client <file> <repo> | scan");
  if(arg!=="help")process.exitCode=2;
}
