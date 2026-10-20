import test from "node:test";
import assert from "node:assert/strict";
import {reconcileRepoList,classifySourceFiles} from "../src/discover.mjs";
const repo=(name,id,year)=>({owner:{login:"neophilism"},name,id,created_at:year,full_name:"neophilism/"+name,default_branch:"main",size:10,fork:false});
test("New repos are discovered while the original four are always excluded",()=>{
 const data=[repo("pupil",1,"2014-01-01"),repo("neurosynth",2,"2014-02-01"),
 repo("facerec",3,"2014-03-01"),repo("hubs",4,"2021-01-01"),
 repo("Boardroom",5,"2026-10-01"),repo("Demo-Engine",6,"2026-10-21"),
 repo("Development-Deployment-Monitor",7,"2026-10-22")];
 const r=reconcileRepoList(data,{repositories:[{repository:"neophilism/Boardroom"}]});
 assert.deepEqual(r.map(x=>x.repository),["neophilism/Demo-Engine"]);
});
test("A different oldest-four ordering fails closed",()=>{
 const data=[repo("facerec",1,"2014-01-01"),repo("pupil",2,"2014-02-01"),
 repo("neurosynth",3,"2014-03-01"),repo("hubs",4,"2021-01-01"),
 repo("Boardroom",5,"2026-10-01")];
 assert.throws(()=>reconcileRepoList(data,{repositories:[]}),/oldest four changed/);
});
test("A static build tool does not imply there is no backend",()=>{
 assert.equal(classifySourceFiles(["package.json"],{dependencies:{vite:"*"}}),"unclassified");
 assert.equal(classifySourceFiles(["Dockerfile","package.json"],{dependencies:{vite:"*"}}),"container");
});
