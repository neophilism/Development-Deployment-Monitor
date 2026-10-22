import fs from "node:fs";

const fail = message => {
  throw new Error("Invalid PR registry: " + message);
};

export function validateRegistry(registry) {
  if (
    registry?.schemaVersion !== 1 ||
    registry.repository !== "neophilism/Development-Deployment-Monitor" ||
    registry.plannedPrCount !== 50 ||
    !Array.isArray(registry.units) ||
    registry.units.length !== registry.plannedPrCount ||
    !Array.isArray(registry.pullRequests) ||
    !Number.isFinite(Date.parse(registry.observedAt))
  ) fail("envelope");

  const observed = new Map();
  for (const pullRequest of registry.pullRequests) {
    if (
      !Number.isSafeInteger(pullRequest.number) ||
      pullRequest.number <= 0 ||
      observed.has(pullRequest.number) ||
      pullRequest.url !== `https://github.com/neophilism/Development-Deployment-Monitor/pull/${pullRequest.number}` ||
      !["open", "closed"].includes(pullRequest.state)
    ) fail("observed PR " + pullRequest.number);
    observed.set(pullRequest.number, pullRequest);
  }

  const ids = new Set();
  const referenced = new Set();
  for (const [index, unit] of registry.units.entries()) {
    const expectedId = `DDM-${String(index + 1).padStart(3, "0")}`;
    if (
      unit.id !== expectedId ||
      ids.has(unit.id) ||
      typeof unit.title !== "string" ||
      !unit.title ||
      typeof unit.origin !== "string" ||
      !unit.origin ||
      !Array.isArray(unit.prs) ||
      !Array.isArray(unit.dependsOn) ||
      !unit.dependsOn.every(id => ids.has(id))
    ) fail("unit " + unit.id);

    for (const number of unit.prs) {
      if (!Number.isSafeInteger(number) || number <= 0 || !observed.has(number)) {
        fail("unobserved PR " + number + " for " + unit.id);
      }
      referenced.add(number);
    }

    if (unit.verification !== undefined) {
      if (!Array.isArray(unit.verification)) fail("verification " + unit.id);
      for (const evidence of unit.verification) {
        if (
          evidence?.status !== "verified" ||
          !/^[a-f0-9]{40}$/.test(evidence.headSha) ||
          !/^[a-f0-9]{40}$/.test(evidence.mergeSha) ||
          !/^https:\/\/github\.com\/neophilism\/Development-Deployment-Monitor\/actions\/runs\/[0-9]+$/.test(evidence.exactHeadRun) ||
          !/^https:\/\/github\.com\/neophilism\/Development-Deployment-Monitor\/actions\/runs\/[0-9]+$/.test(evidence.mergedMainRun)
        ) fail("verification evidence " + unit.id);
      }
    }
    ids.add(unit.id);
  }

  for (const number of observed.keys()) {
    if (!referenced.has(number)) fail("orphan observed PR " + number);
  }
  return registry;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const path = process.argv[2] || "registry/prs.json";
  validateRegistry(JSON.parse(fs.readFileSync(path, "utf8")));
  console.log("Registry valid: 50 ordered units with referential PR evidence.");
}
