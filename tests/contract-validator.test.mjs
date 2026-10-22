import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,symlink,writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {validateContractFile} from "../scripts/validate-contract.mjs";

const script=fileURLToPath(new URL("../scripts/validate-contract.mjs",import.meta.url));
const fixture=fileURLToPath(new URL("fixtures/inventory-contract.json",import.meta.url));

test("local validator accepts the checked-in zero-spend inventory contract",async()=>{
  const result=await validateContractFile(fixture,"neophilism/Development-Deployment-Monitor");
  assert.equal(result.monitoring.mode,"inventory");
  assert.deepEqual(result.deployments,[]);
});

test("local validator fails closed for malformed JSON and oversized or linked input",async t=>{
  const dir=await mkdtemp(join(tmpdir(),"ddm-contract-"));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const malformed=join(dir,"malformed.json");
  await writeFile(malformed,"{");
  await assert.rejects(validateContractFile(malformed,"neophilism/Development-Deployment-Monitor"),error=>error.code==="manifest_json_invalid");
  const oversized=join(dir,"oversized.json");
  await writeFile(oversized," ".repeat(64*1024+1));
  await assert.rejects(validateContractFile(oversized,"neophilism/Development-Deployment-Monitor"),error=>error.code==="manifest_unsafe");\n  const linked=join(dir,"linked.json");\n  await symlink(fixture,linked);\n  await assert.rejects(validateContractFile(linked,"neophilism/Development-Deployment-Monitor"),error=>error.code==="manifest_unsafe");
});

test("local validator rejects repository mismatch and unknown providers",async t=>{
  await assert.rejects(validateContractFile(fixture,"neophilism/Other"),error=>error.code==="repository_mismatch");
  const dir=await mkdtemp(join(tmpdir(),"ddm-contract-"));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const active=JSON.parse(await readFile(fixture,"utf8"));
  active.monitoring.mode="active";
  active.deployments=[{
    id:"primary",provider:"not-approved",origin:"https://app.example.net",ready_path:"/ready",
    expected_status:200,role:"primary",ready_json:{status:"ready"},release_sha:"a".repeat(40),quota_verified:true
  }];
  const path=join(dir,"active.json");
  await writeFile(path,JSON.stringify(active));
  await assert.rejects(validateContractFile(path,active.repository),error=>error.code==="provider_unknown");
});

test("command reports stable success and failure without parser details",()=>{
  const ok=spawnSync(process.execPath,[script,fixture,"neophilism/Development-Deployment-Monitor"],{encoding:"utf8"});
  assert.equal(ok.status,0);
  assert.match(ok.stdout,/Manifest contract verified/);
  const missing=spawnSync(process.execPath,[script],{encoding:"utf8"});
  assert.equal(missing.status,1);
  assert.equal(missing.stderr.trim(),"Contract validation failed: usage");
});
