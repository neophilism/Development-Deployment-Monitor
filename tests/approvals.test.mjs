import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ApprovalError,findExactApproval,validateApprovalRegistry} from "../src/approvals.mjs";
const load=path=>JSON.parse(readFileSync(new URL("../"+path,import.meta.url),"utf8"));
const providers=new Set(load("registry/providers.json").providers.map(value=>value.id));
const registry=()=>({schema_version:1,approvals:[{
 repository:"neophilism/Boardroom",id:"primary",provider:"netlify",
 origin:"https://boardroom.example.net",ready_path:"/api/ready"
}],note:"Reviewed public readiness targets only."});
test("checked-in approval registry is valid and authorizes no live target",()=>{
 const checkedIn=validateApprovalRegistry(load("registry/approved-origins.json"),providers);
 assert.deepEqual(checkedIn.approvals,[]);
});
test("approval requires an exact repository, deployment, provider, origin and path match",()=>{
 const checked=validateApprovalRegistry(registry(),providers);
 const target={...checked.approvals[0]};
 assert.deepEqual(findExactApproval(checked,target),target);
 for(const [field,value] of [["repository","neophilism/Other"],["id","standby"],["provider","deno-deploy"],["origin","https://other.example.net"],["ready_path","/health"]])
  assert.equal(findExactApproval(checked,{...target,[field]:value}),null);
});
test("registry rejects unsafe, duplicated and unreviewable entries",()=>{
 for(const mutate of [
  value=>{value.approvals[0].origin="http://boardroom.example.net";},
  value=>{value.approvals[0].ready_path="/ready?token=secret";},
  value=>{value.approvals[0].provider="unknown";},
  value=>{value.approvals.push({...value.approvals[0]});},
  value=>{value.approvals[0].token="secret";}
 ]){
  const value=registry();mutate(value);
  assert.throws(()=>validateApprovalRegistry(value,providers),ApprovalError);
 }
});
