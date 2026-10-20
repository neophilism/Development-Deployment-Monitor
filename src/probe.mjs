import {validateOrigin} from "./contract.mjs";

/** Readiness probes are safe GETs only. Do not follow redirects or emit bodies.
 * A successful TLS connection or HTTP 200 alone is NOT an application pass.
 * URLs are exact central approvals AND separately validated contract entries.
 */
export async function probeDeployment(target,{transport=fetch,timeoutMs=5500}={}){
  const origin=validateOrigin(target.origin);
  const url=origin+target.ready_path;
  try{
    const res=await transport(url,{
      method:"GET",redirect:"manual",cache:"no-store",
      headers:{"Accept":"application/json","Cache-Control":"no-store","X-Deployment-Monitor":"1"},
      signal:AbortSignal.timeout(timeoutMs)
    });
    if(res.status!==target.expected_status)return {ok:false,reason:"http_status_mismatch",status:res.status};
    const expected=target.ready_json;
    if(Object.keys(expected).length){
      if(!res.headers.get("content-type")?.toLowerCase().includes("application/json"))
        return {ok:false,reason:"not_json"};
      const body=await res.text();
      if(Buffer.byteLength(body,"utf8")>32768)return {ok:false,reason:"body_too_large"};
      let data;try{data=JSON.parse(body);}catch{return {ok:false,reason:"invalid_json"};}
      if(!data||typeof data!=="object"||Array.isArray(data))return {ok:false,reason:"invalid_json_object"};
      for(const [path,want] of Object.entries(expected)){
        const found=path.split(".").reduce((v,k)=>(v&&typeof v==="object"&&Object.hasOwn(v,k))?v[k]:undefined,data);
        if(found!==want)return {ok:false,reason:"readiness_field_mismatch"};
      }
    }
    return {ok:true,reason:"verified_readiness",status:res.status};
  }catch{return {ok:false,reason:"connection_or_timeout"};}
}
/** Same-host consecutive checks reduce glitches, but are NOT independent
 * geographic vantage points. A later PR adds durable quorum evidence.
 */
export async function probeRepeated(target,options={}){
  const count=Number.isInteger(options.count)&&options.count>0?Math.min(options.count,5):3;
  const observations=[];
  for(let i=0;i<count;i++)observations.push(await probeDeployment(target,options));
  return {ok:observations.every(x=>x.ok),observations};
}
