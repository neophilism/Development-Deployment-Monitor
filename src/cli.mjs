#!/usr/bin/env node
import {readFile,appendFile} from "node:fs/promises";
import {resolve} from "node:path";
import {validateContract,validateInventory} from "./contract.mjs";
import {findExactApproval,validateApprovalRegistry} from "./approvals.mjs";
import {probeRepeated} from "./probe.mjs";
import {planFailover} from "./failover.mjs";
import {scanHasConfirmedDegradation,scanPortfolio} from "./scan.mjs";

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
  const report=await scanPortfolio({inventory,knownProviders:known,approvals,
    validateContract,findApproval:findExactApproval,probe:probeRepeated,plan:planFailover,
    token:process.env.GITHUB_TOKEN});
  console.log(JSON.stringify(report,null,2));
  if(process.env.GITHUB_STEP_SUMMARY){
    const lines=["### Development Deployment Monitor",...Object.entries(report.summary).sort().map(([name,n])=>"- "+name+": "+n),"- Automatic traffic promotion: **disabled until independently verified and configured**"];
    await appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join("\n")+"\n");
  }
  if(scanHasConfirmedDegradation(report))process.exitCode=1;
}else{
  console.log("Usage: node src/cli.mjs inventory | validate-client <file> <repo> | scan");
  if(arg!=="help")process.exitCode=2;
}

