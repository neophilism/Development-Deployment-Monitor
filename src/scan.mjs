const MAX_MANIFEST_BYTES=16*1024;
const REPOSITORY=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function manifestUrl(repository,branch){
  if(!REPOSITORY.test(repository)||typeof branch!=="string"||!branch||branch.length>255)
    throw new Error("invalid_inventory_entry");
  const [owner,name]=repository.split("/");
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`+
    `/contents/.github/deployment-monitor.json?ref=${encodeURIComponent(branch)}`;
}

function decodeManifestEnvelope(envelope){
  if(!envelope||typeof envelope!=="object"||Array.isArray(envelope)||
    envelope.encoding!=="base64"||typeof envelope.content!=="string"||
    !Number.isSafeInteger(envelope.size)||envelope.size<0||envelope.size>MAX_MANIFEST_BYTES)
    throw new Error("invalid_manifest_response");
  const encoded=envelope.content.replace(/\s/g,"");
  if(encoded.length%4!==0||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
    throw new Error("invalid_manifest_response");
  const bytes=Buffer.from(encoded,"base64");
  if(bytes.length!==envelope.size)throw new Error("invalid_manifest_response");
  return JSON.parse(bytes.toString("utf8"));
}

async function readManifest(entry,{token,transport}){
  const response=await transport(manifestUrl(entry.repository,entry.default_branch),{
    method:"GET",redirect:"error",cache:"no-store",
    headers:{Accept:"application/vnd.github+json","User-Agent":"development-deployment-monitor/1",
      ...(token?{Authorization:`Bearer ${token}`}:{})},
    signal:AbortSignal.timeout(8000)
  });
  if(response.status===404)return {status:"not_integrated"};
  if(!response.ok)return {status:"manifest_unavailable"};
  return {manifest:decodeManifestEnvelope(await response.json())};
}

async function scanOne(entry,dependencies){
  try{
    const fetched=await readManifest(entry,dependencies);
    if(fetched.status)return {repository:entry.repository,status:fetched.status};
    const manifest=dependencies.validateContract(fetched.manifest,entry.repository,dependencies.knownProviders);
    if(manifest.monitoring.mode!=="active")
      return {repository:entry.repository,status:"inventory_only"};
    const states={};
    let monitored=0;
    for(const deployment of manifest.deployments){
      const approved=dependencies.findApproval(dependencies.approvals,
        {repository:entry.repository,...deployment});
      if(!approved){
        states[deployment.id]={ok:false,reason:"origin_not_centrally_approved",centrallyApproved:false};
        continue;
      }
      const evidence=await dependencies.probe(deployment,{count:3});
      states[deployment.id]={ok:evidence.ok,reason:evidence.ok?"verified":"probe_failed",
        centrallyApproved:true};
      monitored++;
    }
    const primary=manifest.deployments.find(deployment=>deployment.role==="primary");
    const healthy=primary&&states[primary.id]?.ok===true;
    const suggestion=dependencies.plan(manifest,states,{
      unhealthySamples:healthy?0:3,
      independentMonitorQuorum:false,
      routingAuthority:false,
      exclusiveWriterLease:false
    });
    return {repository:entry.repository,
      status:!monitored?"awaiting_approved_endpoint":healthy?"ready":"degraded",
      suggestion:suggestion.reason??"dry_run"};
  }catch{
    return {repository:entry.repository,status:"invalid_or_unavailable_contract"};
  }
}

export async function scanPortfolio(options){
  const {inventory,knownProviders,approvals,validateContract,findApproval,probe,plan,
    token,transport=fetch,concurrency=6,checkedAt=()=>new Date().toISOString()}=options??{};
  if(!inventory||!Array.isArray(inventory.repositories)||!(knownProviders instanceof Set)||
    !approvals||typeof validateContract!=="function"||typeof findApproval!=="function"||
    typeof probe!=="function"||typeof plan!=="function"||typeof transport!=="function"||
    !Number.isSafeInteger(concurrency)||concurrency<1||concurrency>16)
    throw new Error("invalid_scan_configuration");
  const queue=[...inventory.repositories];
  const results=[];
  const dependencies={knownProviders,approvals,validateContract,findApproval,probe,plan,token,transport};
  const workers=Array.from({length:Math.min(concurrency,Math.max(queue.length,1))},async()=>{
    while(queue.length)results.push(await scanOne(queue.shift(),dependencies));
  });
  await Promise.all(workers);
  results.sort((a,b)=>a.repository.localeCompare(b.repository));
  const summary={};
  for(const result of results)summary[result.status]=(summary[result.status]??0)+1;
  return {checked_at:checkedAt(),results,summary};
}

export function scanHasConfirmedDegradation(report){
  return report.results.some(result=>result.status==="degraded");
}

