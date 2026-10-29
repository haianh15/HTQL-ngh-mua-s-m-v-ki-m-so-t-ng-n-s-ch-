import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import state from '../api/ops/state.js';
import mutate from '../api/ops/mutate.js';
const uid='00000000-0000-0000-0000-000000000007';
const user={auth_uid:uid,user_code:'usr_finance',email:'finance@test.example',display_name:'Finance',role:'finance',branch_id:'HQ',department_id:'DEP_FIN_HQ',active:true};
const initialEnv={...process.env};const realFetch=global.fetch;
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)});
const res=()=>({statusCode:0,data:null,setHeader(){return this;},status(s){this.statusCode=s;return this;},json(d){this.data=d;return this;},end(){return this;}});
function setup(failMutate=false){
 process.env.SUPABASE_URL='https://v13.test.supabase.co';process.env.SUPABASE_ANON_KEY='sb_publishable_test';process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_test';
 const seen=[];
 global.fetch=async(url,opts)=>{const u=String(url); seen.push({u,opts});
  if(u.endsWith('/auth/v1/user'))return response({id:uid,email:user.email});
  if(u.includes('/procure_ai_profiles'))return response([user]);
  if(u.includes('/rpc/procure_v13_state'))return response({users:[],purchaseRequests:[],budgetPools:[],ledgerEntries:[],transfers:[],delegations:[],notifications:[],auditLogs:[],accountingBatches:[]});
  if(u.includes('/rpc/procure_v13_mutate'))return failMutate?response({code:'42501',message:'Forbidden'},403):response({ok:true,id:'PR-2026-100001'});
  throw Error('Unexpected network access: '+u);
 };
 return seen;
}
const auth={authorization:'Bearer validtesttoken'};
function teardown(){global.fetch=realFetch;process.env={...initialEnv};}
test('V13 state rejects unauthenticated requests',async()=>{const r=res();await state({method:'GET',headers:{}},r);assert.equal(r.statusCode,401)});
test('V13 state scopes data RPC by verified Supabase UID',async()=>{const calls=setup();try{const r=res();await state({method:'GET',headers:auth},r);assert.equal(r.statusCode,200);const rpc=calls.find(c=>c.u.includes('/rpc/procure_v13_state'));assert.ok(rpc);assert.equal(JSON.parse(rpc.opts.body).p_uid,uid);}finally{teardown()}});
test('V13 mutations ignore forged user UID, role, branch from the browser',async()=>{const calls=setup();try{const r=res();await mutate({method:'POST',headers:auth,body:{action:'PR_CREATE',data:{p_uid:'forged',role:'bod',branch:'BR_HCM',request:{title:'Test'}}}},r);assert.equal(r.statusCode,200);const rpc=calls.find(c=>c.u.includes('/rpc/procure_v13_mutate'));assert.ok(rpc);const payload=JSON.parse(rpc.opts.body);assert.equal(payload.p_uid,uid);assert.equal(payload.p_action,'PR_CREATE');assert.equal(payload.p_data.role,'bod');assert.equal(r.data.id,'PR-2026-100001');}finally{teardown()}});
test('V13 write API denies arbitrary RPC action before touching database',async()=>{const calls=setup();try{const r=res();await mutate({method:'POST',headers:auth,body:{action:'EXECUTE_SQL',data:{sql:'select * from auth.users'}}},r);assert.equal(r.statusCode,400);assert.equal(calls.filter(c=>c.u.includes('/rpc/procure_v13_mutate')).length,0);}finally{teardown()}});
test('V13 surfaces database access denial without claiming operation success',async()=>{const calls=setup(true);try{const r=res();await mutate({method:'POST',headers:auth,body:{action:'APPROVAL',data:{prId:'PR-1',decision:'APPROVED'}}},r);assert.equal(r.statusCode,403);assert.notEqual(r.data?.ok,true);}finally{teardown()}});
test('V13 SQL enforces strict permissions, row-level locks and private tables',()=>{
 const sql=readFileSync(new URL('../database/V13_PRODUCTION.sql',import.meta.url),'utf8');
 for(const pattern of ['enable row level security','revoke all on table','grant execute on function public.procure_v13_mutate','for update','owner_uid<>p_uid','Đã','HOLD_PR','HOLD_TO_COMMIT','COMMIT_TO_USED','WAITING_FUNDS','public.procure_v13_state','security definer'])assert.ok(sql.includes(pattern),pattern);
 assert.ok(!sql.includes('drop table public.procure_ai_profiles'));
});
