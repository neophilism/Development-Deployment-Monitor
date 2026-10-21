import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const h=readFileSync(new URL("../site/index.html",import.meta.url),"utf8");
const w=readFileSync(new URL("../.github/workflows/monitor.yml",import.meta.url),"utf8");
test("Cost report is generated only on explicit click",()=>{
 assert.match(h,/>Generate report<\/button>/);
 assert.match(h,/addEventListener\("click"/);
 assert.doesNotMatch(h,/setInterval\(/);
});
test("Redundant GitHub fallback runs daily, not 5 minutes",()=>{
 assert(w.includes("17 3 * * *"));
 assert(!w.includes("*/5 * * * *"));
});
