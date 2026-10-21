import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import worker from "../workers/ddm/src/index.mjs";

// Exercise the collector's real SQL against the production schema. D1's small
// prepare/bind/batch interface is adapted here; SQLite validates the statements.
function database(){
 const sqlite=new DatabaseSync(":memory:");
 sqlite.exec(readFileSync(new URL("../db/sqlite/001_init.sql",import.meta.url),"utf8"));
 sqlite.exec(`
  INSERT INTO ddm_repositories(repo) VALUES ('neophilism/test');
  INSERT INTO ddm_services(id,repo,display_name,monitoring_enabled)
    VALUES ('test','neophilism/test','Test',1);
  INSERT INTO ddm_providers(id,display_name,category,policy)
    VALUES ('test','Test','serverless','free-hard-limit');
  INSERT INTO ddm_deployments(id,service_id,provider_id,origin,ready_path,
    required_fields_json,central_approved,active)
    VALUES ('primary','test','test','https://example.net','/api/ready',
      '{"status":"ready"}',1,1);
 `);
 const DB={
  prepare(sql){
   const statement=sqlite.prepare(sql);let values=[];
   return {
    bind(...args){values=args;return this},
    async all(){return {results:statement.all(...values)}},
    run(){return statement.run(...values)}
   };
  },
  async batch(statements){
   sqlite.exec("BEGIN");
   try{const out=statements.map(s=>s.run());sqlite.exec("COMMIT");return out}
   catch(error){sqlite.exec("ROLLBACK");throw error}
  }
 };
 return {DB,sqlite};
}

test("Scheduled checks persist observations and readiness in the real schema",async()=>{
 const {DB,sqlite}=database();
 const originalFetch=globalThis.fetch;
 const run=async response=>{
  globalThis.fetch=async()=>response;
  let pending;
  await worker.scheduled({}, {DB}, {waitUntil(promise){pending=promise}});
  await pending;
 };
 try{
  await run(new Response('{"status":"ready"}',{headers:{"content-type":"application/json"}}));
  const healthy=sqlite.prepare("SELECT * FROM ddm_observations").get();
  assert.equal(healthy.deployment_id,"primary");
  assert.equal(healthy.http_status,200);
  assert.equal(healthy.readiness_ok,1);
  assert.equal(healthy.failure_code,null);
  assert.equal(healthy.probe_region,"cloudflare-edge");
  assert(healthy.observed_at);
  const ready=sqlite.prepare("SELECT * FROM ddm_deployments").get();
  assert.equal(ready.verified_readiness,1);
  assert.equal(ready.runtime_status,"ready");
  assert(ready.last_sampled_at);

  await run(new Response('{"status":"degraded"}',{headers:{"content-type":"application/json"}}));
  const failed=sqlite.prepare("SELECT * FROM ddm_observations ORDER BY id DESC LIMIT 1").get();
  assert.equal(failed.readiness_ok,0);
  assert.equal(failed.failure_code,"readiness_predicate");
  const degraded=sqlite.prepare("SELECT * FROM ddm_deployments").get();
  assert.equal(degraded.verified_readiness,0);
  assert.equal(degraded.runtime_status,"degraded");
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM ddm_observations").get().count,2);
 }finally{globalThis.fetch=originalFetch;sqlite.close()}
});
