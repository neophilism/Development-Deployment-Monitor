import test from "node:test";
import assert from "node:assert/strict";
import {probeDeployment,probeRepeated} from "../src/probe.mjs";

const target=()=>({origin:"https://service.example.net",ready_path:"/api/ready",
 expected_status:200,ready_json:{status:"ready","release.sha":"a".repeat(40)}});
const response=(body,init={})=>new Response(body,{...init,status:init.status??200,
 headers:{"content-type":"application/json",...(init.headers??{})}});

test("uses one bounded read-only request and verifies exact scalar fields",async()=>{
 const calls=[];
 const result=await probeDeployment(target(),{transport:async(url,options)=>{
  calls.push({url,options});return response(JSON.stringify({status:"ready",release:{sha:"a".repeat(40)},extra:true}));
 }});
 assert.equal(result.ok,true);assert.equal(calls.length,1);
 assert.equal(calls[0].url,"https://service.example.net/api/ready");
 assert.equal(calls[0].options.method,"GET");assert.equal(calls[0].options.redirect,"manual");
 assert.equal(calls[0].options.cache,"no-store");
});

test("rejects malformed targets before transport",async()=>{
 for(const patch of [
  {origin:"http://service.example.net"},{ready_path:"/ready?token=x"},{expected_status:302},
  {ready_json:{}},{ready_json:{"bad[path]":"ready"}},{ready_json:{status:null}}
 ]){
  let called=false;
  const result=await probeDeployment({...target(),...patch},{transport:async()=>{called=true;return response("{}");}});
  assert.deepEqual(result,{ok:false,reason:"invalid_probe_target"});assert.equal(called,false);
 }
});

test("fails closed for response type, parsing, status and exact predicate mismatches",async()=>{
 const cases=[
  [new Response("ok",{status:200,headers:{"content-type":"text/plain"}}),"not_json"],
  [response("{"),"invalid_json"],
  [response("[]"),"invalid_json_object"],
  [response(JSON.stringify({status:"starting",release:{sha:"a".repeat(40)}})),"readiness_field_mismatch"],
  [new Response(null,{status:204,headers:{"content-type":"application/json"}}),"http_status_mismatch"]
 ];
 for(const [reply,reason] of cases)
  assert.equal((await probeDeployment(target(),{transport:async()=>reply})).reason,reason);
});

test("stops oversized declared and streamed bodies",async()=>{
 const declared=response("{}",{headers:{"content-length":"32769"}});
 assert.equal((await probeDeployment(target(),{transport:async()=>declared})).reason,"body_too_large");
 const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(32768));controller.enqueue(new Uint8Array(1));controller.close();}});
 const streamed=new Response(stream,{status:200,headers:{"content-type":"application/json"}});
 assert.equal((await probeDeployment(target(),{transport:async()=>streamed})).reason,"body_too_large");
});

test("repeated probing reports every observation and requires all to pass",async()=>{
 let calls=0;
 const result=await probeRepeated(target(),{count:2,transport:async()=>{
  calls++;return response(JSON.stringify({status:calls===1?"ready":"starting",release:{sha:"a".repeat(40)}}));
 }});
 assert.equal(result.ok,false);assert.equal(result.observations.length,2);
});
