import {lstat,readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {ContractError,validateContract} from "../src/contract.mjs";

const defaultProvidersPath=fileURLToPath(new URL("../registry/providers.json",import.meta.url));
const fail=code=>{throw new ContractError(code);};

async function readBoundedJson(path,{label,maxBytes}){
  let metadata;
  try{metadata=await lstat(path);}catch{fail(label+"_unreadable");}
  if(!metadata.isFile()||metadata.isSymbolicLink()||metadata.size>maxBytes)fail(label+"_unsafe");
  let raw;
  try{raw=await readFile(path,"utf8");}catch{fail(label+"_unreadable");}
  try{return JSON.parse(raw);}catch{fail(label+"_json_invalid");}
}

export async function validateContractFile(manifestPath,expectedRepository,{providersPath=defaultProvidersPath}={}){
  if(typeof manifestPath!=="string"||!manifestPath||typeof expectedRepository!=="string"||!expectedRepository)fail("usage");
  const [manifest,providers]=await Promise.all([
    readBoundedJson(resolve(manifestPath),{label:"manifest",maxBytes:64*1024}),
    readBoundedJson(resolve(providersPath),{label:"provider_catalog",maxBytes:256*1024})
  ]);
  if(providers?.schema_version!==1||!Array.isArray(providers.providers)||!providers.providers.length)fail("provider_catalog_invalid");
  const known=new Set();
  for(const provider of providers.providers){
    if(typeof provider?.id!=="string"||known.has(provider.id))fail("provider_catalog_invalid");
    known.add(provider.id);
  }
  return validateContract(manifest,expectedRepository,known);
}

async function main(args){
  if(args.length!==2)fail("usage");
  await validateContractFile(args[0],args[1]);
  console.log("Manifest contract verified for "+args[1]);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main(process.argv.slice(2)).catch(error=>{
    const code=error instanceof ContractError?error.code:"validation_failed";
    console.error("Contract validation failed: "+code);
    process.exitCode=1;
  });
}
