import {validateOrigin} from "./contract.mjs";

const MAX_BODY_BYTES=32768;
const READY_PATH=/^\/[^?#]*$/;
const READY_FIELD=/^[A-Za-z][\w.]{0,75}$/;
function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
function validScalar(value){return ["string","number","boolean"].includes(typeof value)&&
  (typeof value!=="number"||Number.isFinite(value));}
function validTarget(target){
  if(!isObject(target)||typeof target.ready_path!=="string"||target.ready_path.length>180||
    !READY_PATH.test(target.ready_path)||!Number.isInteger(target.expected_status)||
    target.expected_status<200||target.expected_status>299||!isObject(target.ready_json))return false;
  const fields=Object.entries(target.ready_json);
  return fields.length>0&&fields.length<=20&&
    fields.every(([path,value])=>READY_FIELD.test(path)&&validScalar(value));
}
async function readBoundedText(response){
  const declared=response.headers.get("content-length");
  if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BODY_BYTES))return null;
  if(!response.body)return "";
  const reader=response.body.getReader();
  const decoder=new TextDecoder();
  let bytes=0,text="";
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>MAX_BODY_BYTES){await reader.cancel();return null;}
      text+=decoder.decode(value,{stream:true});
    }
    return text+decoder.decode();
  }finally{reader.releaseLock();}
}

/** Readiness probes are safe GETs only. Do not follow redirects or emit bodies.
 * A successful TLS connection or HTTP 200 alone is NOT an application pass.
 * URLs are exact central approvals AND separately validated contract entries.
 */
export async function probeDeployment(target,{transport=fetch,timeoutMs=5500}={}){
  if(!validTarget(target)||!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)
    return {ok:false,reason:"invalid_probe_target"};
  let origin;try{origin=validateOrigin(target.origin);}catch{return {ok:false,reason:"invalid_probe_target"};}
  const url=origin+target.ready_path;
  try{
    const res=await transport(url,{
      method:"GET",redirect:"manual",cache:"no-store",
      headers:{"Accept":"application/json","Cache-Control":"no-store","X-Deployment-Monitor":"1"},
      signal:AbortSignal.timeout(timeoutMs)
    });
    if(res.status!==target.expected_status)return {ok:false,reason:"http_status_mismatch",status:res.status};
    if(!res.headers.get("content-type")?.toLowerCase().includes("application/json"))
      return {ok:false,reason:"not_json"};
    const body=await readBoundedText(res);
    if(body===null)return {ok:false,reason:"body_too_large"};
    let data;try{data=JSON.parse(body);}catch{return {ok:false,reason:"invalid_json"};}
    if(!isObject(data))return {ok:false,reason:"invalid_json_object"};
    for(const [path,want] of Object.entries(target.ready_json)){
      const found=path.split(".").reduce((value,key)=>
        isObject(value)&&Object.hasOwn(value,key)?value[key]:undefined,data);
      if(found!==want)return {ok:false,reason:"readiness_field_mismatch"};
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
