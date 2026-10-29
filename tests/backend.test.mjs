import test from 'node:test';import assert from 'node:assert/strict';
import {findSimilar,normaliseDraft,financialFacts,validateReport} from '../server/lib/analysis.js';
import {canSeeRequest,canAnalyzeApproval,canSeeBudgets,table} from '../server/lib/supabase.js';
import check from '../api/ai/check.js';import review from '../api/ai/approval.js';import budget from '../api/ai/budget.js';
const requester={authUid:'00000000-0000-0000-0000-000000000001',code:'usr_employee',email:'employee@example.com',name:'Employee',role:'requester',branch:'HQ',dept:'IT'};
const finance={...requester,authUid:'00000000-0000-0000-0000-000000000002',role:'finance'};
const user=(role,branch='HQ',dept='IT',id='user')=>({authUid:id,role,branch,dept});
const draft={title:'Mua laptop',purpose:'Thay thiết bị làm việc cũ',needByDate:'10/11/2026',branchId:'BR_HCM',departmentId:'FIN',items:[{name:'Laptop Dell',specification:'Core i7, 16GB RAM',quantity:1,unitPrice:20000000,taxRate:10}]};
test('Client không thể giả mạo chi nhánh và phòng ban trong draft',()=>{const d=normaliseDraft(draft,requester);assert.equal(d.branchId,'HQ');assert.equal(d.departmentId,'IT');});
test('Phát hiện đề nghị gần trùng từ danh sách máy chủ',()=>{const d=normaliseDraft(draft,requester);const matches=findSimilar(d,[{pr_id:'P1',title:'Mua laptop cho văn phòng',items:d.items,status:'PENDING_FINANCE'}]);assert.equal(matches.length,1);});
test('Không lộ bản nháp của người khác cho Tài chính',()=>{assert.equal(canSeeRequest(finance,{branch_id:'HQ',department_id:'IT',status:'DRAFT',owner_auth_uid:'someone-else'}),false);});
test('Nhân viên chỉ được xem phiếu mình tạo',()=>{assert.equal(canSeeRequest(requester,{branch_id:'HQ',status:'PENDING_DEPT',owner_auth_uid:'different'}),false);assert.equal(canSeeRequest(requester,{branch_id:'HQ',status:'PENDING_DEPT',owner_auth_uid:requester.authUid}),true);});
test('Trưởng phòng chỉ được xem yêu cầu phòng mình',()=>{assert.equal(canSeeRequest(user('dept_head'),{branch_id:'HQ',department_id:'OTHER',status:'PENDING_DEPT',owner_auth_uid:'any'}),false);});
test('Tài chính và Mua hàng không xem chi nhánh khác',()=>{for(const role of ['finance','procurement','accountant']) assert.equal(canSeeRequest(user(role),{branch_id:'BR_HCM',department_id:'IT',status:'APPROVED',owner_auth_uid:'none'}),false);});
test('Ban Giám đốc chỉ xem đơn đang chờ đến lượt BOD',()=>{assert.equal(canSeeRequest(user('bod'),{branch_id:'BR_HCM',status:'APPROVED',owner_auth_uid:'other'}),false);assert.equal(canSeeRequest(user('bod'),{branch_id:'BR_HCM',status:'DRAFT',owner_auth_uid:'other'}),false);assert.equal(canSeeRequest(user('bod'),{branch_id:'BR_HCM',status:'PENDING_FINAL',amount:50_000_000,owner_auth_uid:'other'}),true);assert.equal(canSeeRequest(user('bod'),{branch_id:'BR_HCM',status:'PENDING_FINANCE',amount:50_000_000,owner_auth_uid:'other'}),false);});
test('Người lập không thể yêu cầu AI đánh giá phê duyệt phiếu của mình',()=>{assert.equal(canAnalyzeApproval(finance,{branch_id:'HQ',department_id:'IT',status:'PENDING_FINANCE',owner_auth_uid:finance.authUid}),false);});
test('Chỉ Tài chính và BOD phân tích ngân sách',()=>{assert.equal(canSeeBudgets(requester),false);assert.equal(canSeeBudgets(finance),true);assert.equal(canSeeBudgets(user('bod')),true);});
test('Công thức ngân sách không trừ tiền hai lần',()=>{const [b]=financialFacts([{budget_id:'B',name:'B',branch_id:'HQ',allocated:100000000,adjustments:0,held:30000000,committed:20000000,used:10000000}]);assert.equal(b.available,40000000);});
test('Kết quả Gemini được giới hạn kích thước và định dạng an toàn',()=>{const r=validateReport({headline:'A'.repeat(400),details:['ok'],insights:[{code:'AI_1',level:'untrusted',title:'why',explanation:'test'}]});assert.equal(r.headline.length,300);assert.equal(r.insights[0].level,'info');});
const originalFetch=global.fetch;
const prev={...process.env};
const mockResponse=(obj,status=200)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(obj),json:async()=>obj});
function mockEnvironment() {process.env.SUPABASE_URL='https://fake.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='service-test';process.env.SUPABASE_ANON_KEY='anon-test';process.env.GEMINI_API_KEY='gemini-test';}
function mockRequest(body,method='POST'){return {method,headers:{authorization:'Bearer token', 'content-length':'100'},body};}
function mockRes(){return {code:0,body:null,setHeader(){return this},status(x){this.code=x;return this},json(x){this.body=x;return this},end(){return this}}}
function fakeFetch(url,opts){
  const u=String(url);
  if(u.endsWith('/auth/v1/user'))return Promise.resolve(mockResponse({id:requester.authUid,email:requester.email}));
  if(u.includes('/procure_ai_profiles'))return Promise.resolve(mockResponse([{auth_uid:requester.authUid,user_code:requester.code,email:requester.email,display_name:requester.name,role:'requester',branch_id:'HQ',department_id:'IT',active:true}]));
  if(u.includes('/rpc/procure_ai_take_slot'))return Promise.resolve(mockResponse(true));
  if(u.includes('/rpc/procure_v13_state'))return Promise.resolve(mockResponse({purchaseRequests:[{id:'PR-OWN',title:'Laptop Dell',items:normaliseDraft(draft,requester).items,status:'PENDING_DEPT',createdByEmail:requester.email},{id:'PR123',title:'Laptop Dell',items:normaliseDraft(draft,requester).items,status:'PENDING_DEPT',createdByEmail:'other@example.com'}],budgetPools:[]}));
  if(u.includes('/procure_ai_budgets'))return Promise.resolve(mockResponse([]));
  if(u.includes(':generateContent'))return Promise.resolve(mockResponse({candidates:[{content:{parts:[{text:JSON.stringify({headline:'Có điểm cần kiểm tra',details:['3 nguồn'],insights:[]})}]}}]}));
  throw Error('Unexpected URL '+u);
}
function restoreEnv(){global.fetch=originalFetch;process.env=prev;}
test('API cấm truy cập không token', async()=>{const res=mockRes();await check({method:'POST',headers:{},body:{draft}},res);assert.equal(res.code,401);});
test('AI kiểm tra trùng cho requester chỉ trả cảnh báo, không lộ mã/tiêu đề người khác',async()=>{
  mockEnvironment();global.fetch=fakeFetch;
  try{const res=mockRes();await check(mockRequest({draft}),res);assert.equal(res.code,200);assert.equal(res.body.report.source,'gemini');assert.ok(res.body.report.insights.some(i=>i.code==='SIMILAR_REQUEST'));assert.ok(!JSON.stringify(res.body).includes('PR123'));}
  finally{restoreEnv();}
});
test('API phê duyệt chặn nhân viên dù biết mã phiếu',async()=>{
  mockEnvironment();global.fetch=fakeFetch;try{const res=mockRes();await review(mockRequest({prId:'PR123'}),res);assert.equal(res.code,403);}finally{restoreEnv();}
});
test('API ngân sách chặn nhân viên',async()=>{
  mockEnvironment();global.fetch=fakeFetch;try{const res=mockRes();await budget(mockRequest({}),res);assert.equal(res.code,403);}finally{restoreEnv();}
});


test('Supabase secret key mới chỉ gửi apikey, không gửi Bearer giả JWT',async()=>{
  const previous=process.env.SUPABASE_SERVICE_ROLE_KEY, url=process.env.SUPABASE_URL,anon=process.env.SUPABASE_ANON_KEY;
  const priorFetch=global.fetch;
  process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_abc123';process.env.SUPABASE_URL='https://fake.supabase.co';process.env.SUPABASE_ANON_KEY='sb_publishable_abc123';
  let seen;global.fetch=async(_u,opts)=>{seen=opts.headers;return mockResponse([]);};
  try {await table('procure_ai_requests',{select:'pr_id',limit:'1'});assert.equal(seen.apikey,'sb_secret_abc123');assert.equal(seen.Authorization,undefined);}
  finally {global.fetch=priorFetch;process.env.SUPABASE_SERVICE_ROLE_KEY=previous;process.env.SUPABASE_URL=url;process.env.SUPABASE_ANON_KEY=anon;}
});

test('V12: Backend AI restricts finance/department head/directory by stage and amount',()=>{
 const base={branch_id:'HQ',department_id:'IT',status:'PENDING_DEPT',amount:15_000_000,owner_auth_uid:'another'};
 assert.equal(canAnalyzeApproval(user('dept_head'),base),true);
 assert.equal(canAnalyzeApproval(user('finance'),base),false);
 assert.equal(canAnalyzeApproval(user('branch_director'),base),false);
 assert.equal(canAnalyzeApproval(user('dept_head'),{...base,status:'PENDING_FINANCE'}),false);
 assert.equal(canAnalyzeApproval(user('finance'),{...base,status:'PENDING_FINANCE'}),true);
 assert.equal(canAnalyzeApproval(user('branch_director'),{...base,status:'PENDING_FINAL'}),true);
 assert.equal(canAnalyzeApproval(user('bod'),{...base,status:'PENDING_FINAL'}),false);
});
