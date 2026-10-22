import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateProviderCatalog} from "../scripts/validate-provider-catalog.mjs";

const load=path=>JSON.parse(readFileSync(new URL("../"+path,import.meta.url),"utf8"));
const fixtures=()=>[structuredClone(load("registry/providers.json")),structuredClone(load("registry/free-resources.json"))];

test("provider and resource catalogs are complete, unique, and default-deny",()=>{
  const result=validateProviderCatalog(...fixtures());
  assert.equal(result.providerCount,18);
  assert.equal(result.resourceCount,62);
});
test("catalog rejects provider actuation or an unverified live connection",()=>{
  const [providers,resources]=fixtures();
  providers.providers[0].autodeploy_enabled=true;
  assert.throws(()=>validateProviderCatalog(providers,resources),/provider render/);
  const [p2,r2]=fixtures();r2.resources[0].verified_connected=true;
  assert.throws(()=>validateProviderCatalog(p2,r2),/resource cloudflare-pages/);
});
test("catalog rejects count drift, duplicate ids, and negative capacity",()=>{
  const [providers,resources]=fixtures();resources.provider_count--;
  assert.throws(()=>validateProviderCatalog(providers,resources),/resource envelope/);
  const [p2,r2]=fixtures();r2.resources[1].id=r2.resources[0].id;
  assert.throws(()=>validateProviderCatalog(p2,r2),/resource cloudflare-pages/);
  const [p3,r3]=fixtures();r3.resources[0].available_capacity=-1;
  assert.throws(()=>validateProviderCatalog(p3,r3),/resource cloudflare-pages/);
});
test("risk-bearing or restricted offers cannot be production suitable",()=>{
  const [providers,resources]=fixtures();
  const risk=resources.resources.find(x=>x.policy==="billing-risk");
  risk.production_suitable=true;
  assert.throws(()=>validateProviderCatalog(providers,resources),/unsafe production suitability/);
});
