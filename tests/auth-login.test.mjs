import test from 'node:test';
import assert from 'node:assert/strict';
import login from '../api/auth/login.js';
const originalFetch = global.fetch;
const previous = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
const reply=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)});
function req(email='user@example.com',password='right'){return {method:'POST',headers:{'content-length':'160'},body:{email,password}};}
function res(){return {statusCode:0,data:null,headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(c){this.statusCode=c;return this;},json(body){this.data=body;return this;}};}
function env(){process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_ANON_KEY='sb_publishable_test';process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_test';}
function reset(){global.fetch=originalFetch;for(const [key,val] of Object.entries(previous)){if(val===undefined)delete process.env[key];else process.env[key]=val;}}
test('Fast login checks real Supabase credentials and returns only verified role in one browser request',async()=>{
  env();let count=0;global.fetch=async(url,options)=>{
    count++;const u=String(url);
    if(u.includes('/auth/v1/token')) {assert.equal(options.headers.apikey,'sb_publishable_test');return reply({user:{id:'00000000-0000-0000-0000-000000000001',email:'user@example.com'},access_token:'token_1',refresh_token:'refresh_1',expires_in:3600});}
    if(u.includes('/procure_ai_profiles')) {assert.equal(options.headers.apikey,'sb_secret_test');return reply([{active:true,user_code:'usr_dept_head',display_name:'Dept head',email:'user@example.com',role:'dept_head',branch_id:'HQ',department_id:'IT'}]);}
    throw Error('unexpected request');
  };try {const r=res();await login(req(),r);assert.equal(r.statusCode,200);assert.equal(r.data.profile.roles[0],'dept_head');assert.equal(r.data.profile.branchId,'HQ');assert.equal(r.data.session.access_token,'token_1');assert.equal(count,2);assert.equal(r.headers['Cache-Control'],'no-store, private');}finally{reset();}
});
test('Invalid password never queries profiles or returns session',async()=>{
  env();let count=0;global.fetch=async()=>{count++;return reply({error:'invalid_grant'},400)};
  try {const r=res();await login(req('user@example.com','wrong'),r);assert.equal(r.statusCode,401);assert.equal(count,1);assert.equal(r.data.session,undefined);}finally{reset();}
});
test('Disabled profile cannot log in even with a valid Supabase password',async()=>{
  env();global.fetch=async url=> String(url).includes('/auth/v1/token')
    ?reply({user:{id:'00000000-0000-0000-0000-000000000001',email:'user@example.com'},access_token:'token',refresh_token:'refresh'})
    :reply([{active:false,email:'user@example.com'}]);
  try {const r=res();await login(req(),r);assert.equal(r.statusCode,403);assert.equal(r.data.session,undefined);}finally{reset();}
});
