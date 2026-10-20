import test from "node:test";
import assert from "node:assert/strict";
import worker,{checkReadyJson,checkEndpoint} from "../workers/ddm/src/index.mjs";
test("The report API fails closed without a secret",async()=>{
  const r=await worker.fetch(new Request("https://ddm.example.net/api/report"),{});
  assert.equal(r.status,401);
});
test("A configured secret is mandatory for accessing reports",async()=>{
  const r=await worker.fetch(new Request("https://ddm.example.net/api/report",{headers:{authorization:"Bearer "+"x".repeat(40)}}),{DDM_READ_TOKEN:"z".repeat(40)});
  assert.equal(r.status,401);
});
test("Worker health never reports the database ready when it is not configured",async()=>{
  const r=await worker.fetch(new Request("https://ddm.example.net/api/health"),{});
  assert.equal((await r.json()).database_connected,false);
});
test("External probes reject unsafe and private origins",async()=>{
 for(const origin of ["http://example.net","https://localhost","https://127.0.0.1","https://a.internal"]){
   const r=await checkEndpoint({origin,ready_path:"/health",expected_status:200});
   assert.equal(r.reason,"unsafe_origin");
 }
});
test("A successful HTTP status with the wrong readiness JSON fails",async()=>{
 const p={origin:"https://example.net",ready_path:"/ready",expected_status:200,required_fields_json:'{"status":"ready"}'};
 const transport=async()=>new Response('{"status":"degraded"}',{status:200,headers:{"content-type":"application/json"}});
 const r=await checkEndpoint(p,transport);
 assert.equal(r.reason,"readiness_predicate");
});
test("Only exact JSON readiness predicates succeed",()=>{
 assert(checkReadyJson({status:"ready",database:{ok:true}},{"database.ok":true,"status":"ready"}));
 assert(!checkReadyJson({status:"ok"},{"status":"ready"}));
});
