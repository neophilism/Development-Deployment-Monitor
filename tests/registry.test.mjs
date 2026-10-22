import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateRegistry } from "../scripts/validate-pr-registry.mjs";

const source = JSON.parse(fs.readFileSync(new URL("../registry/prs.json", import.meta.url), "utf8"));
const clone = () => structuredClone(source);

test("canonical registry has 50 ordered units and referenced PR evidence", () => {
  assert.equal(validateRegistry(clone()).units.length, 50);
});

test("rejects a PR reference without an observed record", () => {
  const registry = clone();
  registry.units[0].prs = [999];
  assert.throws(() => validateRegistry(registry), /unobserved PR 999/);
});

test("rejects forward dependencies and duplicate observed PRs", () => {
  const forward = clone();
  forward.units[0].dependsOn = ["DDM-002"];
  assert.throws(() => validateRegistry(forward), /unit DDM-001/);

  const duplicate = clone();
  duplicate.pullRequests.push(structuredClone(duplicate.pullRequests[0]));
  assert.throws(() => validateRegistry(duplicate), /observed PR 1/);
});
