import {validateOrigin} from "./contract.mjs";

export class ApprovalError extends Error {
  constructor(code) {
    super(code);
    this.name = "ApprovalError";
    this.code = code;
  }
}
function check(ok,code){if(!ok)throw new ApprovalError(code);}
function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value);}
const EXACT_KEYS=["repository","id","provider","origin","ready_path"];
export function approvalKey(value){return `${value.repository}#${value.id}`;}
export function validateApprovalRegistry(registry,approvedProviders){
  check(isObject(registry),"approval_registry_invalid");
  check(Object.keys(registry).every(key=>["schema_version","approvals","note"].includes(key)),"approval_registry_unknown_field");
  check(registry.schema_version===1&&Array.isArray(registry.approvals),"approval_registry_invalid");
  check(typeof registry.note==="string"&&registry.note.length>0&&registry.note.length<=500,"approval_registry_note_invalid");
  const keys=new Set(),origins=new Set();
  for(const approval of registry.approvals){
    check(isObject(approval)&&Object.keys(approval).length===EXACT_KEYS.length&&EXACT_KEYS.every(key=>Object.hasOwn(approval,key)),"approval_entry_fields_invalid");
    check(typeof approval.repository==="string"&&/^neophilism\/[A-Za-z0-9_.-]+$/.test(approval.repository),"approval_repository_invalid");
    check(typeof approval.id==="string"&&/^[a-z0-9][a-z0-9-]{0,62}$/.test(approval.id),"approval_id_invalid");
    check(typeof approval.provider==="string"&&approvedProviders.has(approval.provider),"approval_provider_unknown");
    let origin;try{origin=validateOrigin(approval.origin);}catch{throw new ApprovalError("approval_origin_unsafe");}
    check(typeof approval.ready_path==="string"&&/^\/[^?#]*$/.test(approval.ready_path)&&approval.ready_path.length<=180,"approval_ready_path_invalid");
    const key=approvalKey(approval);
    check(!keys.has(key),"approval_key_duplicate");
    check(!origins.has(origin),"approval_origin_duplicate");
    keys.add(key);origins.add(origin);
  }
  return registry;
}
export function findExactApproval(registry,target){
  const approval=registry.approvals.find(value=>approvalKey(value)===approvalKey(target));
  if(!approval)return null;
  return EXACT_KEYS.every(key=>approval[key]===target[key])?approval:null;
}
