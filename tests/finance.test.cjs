const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  availableBudget, reserveBudget, commitBudget, recognizeExpense, releaseHold,
  transferBudget, canApproveStep, canSeeBranch, heldForRequest, isValidPRItems,
  canViewAllRegions, canViewDashboard, canReadRequest, canAccessScreen, defaultScreenFor, isRequesterRole, primaryRole,canManageBudget,canExecutePurchase,canReconcile,canManageUsers,canReadBudget,
} = require('../.test-build/domain/rules.js');
const pool=(id,allocated)=>({id,allocated,adjustments:0,held:0,committed:0,used:0,branchId:'HQ'});
test('A: 100M, reserve 70M -> 50M rejected (no negative)',()=>{
  let b=reserveBudget(pool('A',100_000_000),70_000_000);
  assert.equal(availableBudget(b),30_000_000);
  assert.throws(()=>reserveBudget(b,50_000_000),/Không đủ/);
  assert.equal(b.held,70_000_000);
});
test('C: 40M hold -> 35M committed -> 30M used; remainder held until finance releases',()=>{
  let b=reserveBudget(pool('C',100_000_000),40_000_000);
  assert.equal(availableBudget(b),60_000_000);
  b=commitBudget(b,35_000_000,40_000_000);
  assert.deepEqual([b.held,b.committed,b.used,availableBudget(b)], [5_000_000,35_000_000,0,60_000_000]);
  b=recognizeExpense(b,30_000_000,35_000_000);
  assert.deepEqual([b.held,b.committed,b.used,availableBudget(b)], [5_000_000,5_000_000,30_000_000,60_000_000]);
  b=releaseHold(b,5_000_000,5_000_000);
  assert.deepEqual([b.held,b.committed,b.used,availableBudget(b)], [0,5_000_000,30_000_000,65_000_000]);
});
test('Reject overcommit, over-release, over-recording, negatives',()=>{
  const b=reserveBudget(pool('A',100),40);
  assert.throws(()=>commitBudget(b,41,40));
  assert.throws(()=>releaseHold(b,41,40));
  assert.throws(()=>commitBudget(b,-1,40));
  const c=commitBudget(b,30,40);
  assert.throws(()=>recognizeExpense(c,31,30));
  assert.throws(()=>recognizeExpense(c,0,30));
});
test('Transfer must keep commitments and not exceed available',()=>{
  const a={...pool('A',100),held:40,committed:20,used:10};
  const b=pool('B',50);
  assert.throws(()=>transferBudget(a,b,31));
  const [from,to]=transferBudget(a,b,30);
  assert.equal(availableBudget(from),0);
  assert.equal(availableBudget(to),80);
  assert.deepEqual([from.held,from.committed,from.used],[40,20,10]);
});
test('Author cannot self-approve; wrong role and step rejected',()=>{
  const pr={createdById:'author',branchId:'HQ',departmentId:'D',status:'PENDING_DEPT',
    currentStepIndex:0,totalAmount:5_000_000,approvalTimeline:[{status:'PENDING',assignedRole:'dept_head'}]};
  const author={id:'author',isActive:true,roles:['dept_head'],branchId:'HQ',departmentId:'D'};
  const manager={...author,id:'manager'};
  assert.equal(canApproveStep(author,pr,[]),false);
  assert.equal(canApproveStep(manager,pr,[]),true);
  assert.equal(canApproveStep({...manager,departmentId:'OTHER'},pr,[]),false);
  assert.equal(canApproveStep({...manager,roles:['requester']},pr,[]),false);
  assert.equal(canApproveStep(manager,{...pr,status:'REJECTED'},[]),false);
});
test('Branch scope: requester cannot read other branch',()=>{
  const employee={id:'x',isActive:true,roles:['requester'],branchId:'BR_HP'};
  assert.equal(canSeeBranch(employee,'BR_HP'),true);
  assert.equal(canSeeBranch(employee,'BR_HCM'),false);
  assert.equal(canSeeBranch({...employee,roles:['bod']},'BR_HCM'),true);
});
test('Effective version remains separate during revision',()=>{
  const pr={effectiveVersion:1,totalAmount:70,versions:[{versionNumber:1,totalAmount:40,isEffective:true},{versionNumber:2,totalAmount:70,isEffective:false}],execution:{actualOrderedAmount:0,releasedAmount:0}};
  assert.equal(heldForRequest(pr),40);
});
test('Validate positive integer monetary items and tax calculation',()=>{
  assert.equal(isValidPRItems([{name:'Mouse',quantity:2,unitPrice:100,taxRate:10,totalPrice:220}]),true);
  assert.equal(isValidPRItems([{name:'Mouse',quantity:2,unitPrice:100,taxRate:10,totalPrice:200}]),false);
});

const staff=(role,branch='BR_HCM',department='D1')=>({id:role,isActive:true,roles:[role],branchId:branch,departmentId:department});
const exampleRequest={branchId:'BR_HCM',departmentId:'D1',createdById:'requester'};
test('RBAC: only company director can select ALL and cross-branch data',()=>{
  for (const role of ['requester','dept_head','branch_director','finance','procurement','accountant','admin']) {
    const u=staff(role,'HQ');
    assert.equal(canViewAllRegions(u),false,role);
    assert.equal(canSeeBranch(u,'BR_HCM'),false,role);
  }
  assert.equal(canViewAllRegions(staff('bod','HQ')),true);
  assert.equal(canSeeBranch(staff('bod','HQ'),'BR_HCM'),true);
});
test('RBAC: requester only sees own requests, no dashboard or region reports',()=>{
  const u=staff('requester');
  assert.equal(defaultScreenFor(u),'PR_LIST');
  for(const sc of ['DASHBOARD','REPORTS','BUDGET_OVERVIEW','APPROVAL_QUEUE','ADMIN_MANAGEMENT']) assert.equal(canAccessScreen(u,sc),false);
  for(const sc of ['PR_LIST','PR_CREATE','PR_EDIT','PR_DETAIL']) assert.equal(canAccessScreen(u,sc),true);
  assert.equal(canAccessScreen(u,'NOTIFICATIONS'),false);
  assert.equal(canReadRequest(u,exampleRequest),true);
  assert.equal(canReadRequest(u,{...exampleRequest,createdById:'other'}),false);
});
test('RBAC: department head sees own dept requests and approval queue but not dashboard',()=>{
  const u=staff('dept_head');
  assert.equal(defaultScreenFor(u),'APPROVAL_QUEUE');
  assert.equal(canViewDashboard(u),false);
  assert.equal(canAccessScreen(u,'APPROVAL_QUEUE'),true);
  assert.equal(canReadRequest(u,exampleRequest),true);
  assert.equal(canReadRequest(u,{...exampleRequest,departmentId:'D2'}),false);
  assert.equal(canAccessScreen(u,'REPORTS'),false);
});
test('RBAC: regional finance/procurement/accountant see dashboard for assigned region only',()=>{
  for (const role of ['finance','procurement','accountant']) {
    const u=staff(role);
    assert.equal(canViewDashboard(u),true,role);
    assert.equal(canAccessScreen(u,'DASHBOARD'),true,role);
    assert.equal(canReadRequest(u,{...exampleRequest,status:'APPROVED',versions:[]}),true,role);
    assert.equal(canReadRequest(u,{...exampleRequest,branchId:'BR_DN'}),false,role);
  }
});
test('RBAC: branch director sees assigned branch, system admin only admin screens',()=>{
  const dir=staff('branch_director');
  assert.equal(canViewDashboard(dir),true);
  assert.equal(canSeeBranch(dir,'BR_DN'),false);
  const admin=staff('admin');
  assert.equal(defaultScreenFor(admin),'ADMIN_MANAGEMENT');
  assert.equal(canAccessScreen(admin,'DASHBOARD'),false);
  assert.equal(canAccessScreen(admin,'PR_DETAIL'),false);
  assert.equal(canAccessScreen(admin,'ADMIN_MANAGEMENT'),true);
});

test('RBAC: central HQ finance cannot approve request outside HQ, BOD can',()=>{
  const pr={createdById:'author',branchId:'BR_DN',departmentId:'DN',status:'PENDING_FINANCE',currentStepIndex:0,totalAmount:15_000_000,approvalTimeline:[{status:'PENDING',assignedRole:'finance'}]};
  assert.equal(canApproveStep(staff('finance','HQ','FIN'),pr,[]),false);
  assert.equal(canApproveStep(staff('finance','BR_DN','FIN'),pr,[]),true);
});

// Regression: a stale/multi-role demo account must never regain dashboard, reports or finance data.
test('RBAC V4: requester denies dashboard and reports even with stale elevated roles',()=>{
  const u={...staff('requester'),roles:['requester','finance','bod','admin']};
  assert.equal(isRequesterRole(u),true);
  assert.equal(defaultScreenFor(u),'PR_LIST');
  assert.equal(canViewDashboard(u),false);
  assert.equal(canViewAllRegions(u),false);
  assert.equal(canSeeBranch(u,'BR_DN'),false);
  for(const sc of ['DASHBOARD','REPORTS','BUDGET_OVERVIEW','APPROVAL_QUEUE','EXECUTION_LIST','RECONCILIATION_IMPORT','NOTIFICATIONS','ADMIN_MANAGEMENT']) {
    assert.equal(canAccessScreen(u,sc),false,sc);
  }
  for(const sc of ['PR_LIST','PR_CREATE','PR_EDIT','PR_DETAIL']) assert.equal(canAccessScreen(u,sc),true,sc);
  assert.equal(canReadRequest(u,{...exampleRequest,createdById:u.id}),true);
  assert.equal(canReadRequest(u,{...exampleRequest,createdById:'someone-else'}),false);
});

test('RBAC V6: finance manages budgets but cannot execute purchasing', () => {
  const finance = staff('finance', 'BR_DN');
  for(const screen of ['DASHBOARD','APPROVAL_QUEUE','BUDGET_OVERVIEW','BUDGET_TRANSFERS','REPORTS','PR_LIST'])
    assert.equal(canAccessScreen(finance,screen),true,screen);
  assert.equal(canAccessScreen(finance,'EXECUTION_LIST'),false);
  assert.equal(canSeeBranch(finance,'BR_HN'),false);
  assert.equal(canViewAllRegions(finance),false);
});
test('RBAC V6: procurement executes orders but cannot manipulate budget sources', () => {
  const purchasing=staff('procurement','BR_DN');
  for(const screen of ['DASHBOARD','EXECUTION_LIST','REPORTS'])
    assert.equal(canAccessScreen(purchasing,screen),true,screen);
  for(const screen of ['BUDGET_OVERVIEW','BUDGET_TRANSFERS','BUDGET_WAITING_PR','APPROVAL_QUEUE','RECONCILIATION_IMPORT'])
    assert.equal(canAccessScreen(purchasing,screen),false,screen);
  assert.equal(canSeeBranch(purchasing,'BR_HN'),false);
  assert.equal(canViewAllRegions(purchasing),false);
});
test('RBAC V6: executive can see both business domains across branches', () => {
  const exec=staff('bod','HQ');
  for(const screen of ['DASHBOARD','BUDGET_OVERVIEW','BUDGET_TRANSFERS','REPORTS'])
    assert.equal(canAccessScreen(exec,screen),true,screen);
  assert.equal(canViewAllRegions(exec),true);
});

// Full actor-by-actor deny/allow regression suite.
const allScreens = ['DASHBOARD','PR_LIST','PR_CREATE','PR_EDIT','PR_DETAIL','APPROVAL_QUEUE','EXECUTION_LIST','BUDGET_OVERVIEW','BUDGET_TRANSFERS','BUDGET_WAITING_PR','RECONCILIATION_IMPORT','REPORTS','NOTIFICATIONS','ADMIN_MANAGEMENT'];
const expected = {
 requester:['PR_LIST','PR_CREATE','PR_EDIT','PR_DETAIL'],
 dept_head:['PR_LIST','PR_DETAIL','APPROVAL_QUEUE','NOTIFICATIONS'],
 finance:['DASHBOARD','PR_LIST','PR_DETAIL','APPROVAL_QUEUE','BUDGET_OVERVIEW','BUDGET_TRANSFERS','BUDGET_WAITING_PR','REPORTS','NOTIFICATIONS'],
 procurement:['DASHBOARD','PR_LIST','PR_DETAIL','EXECUTION_LIST','REPORTS','NOTIFICATIONS'],
 accountant:['DASHBOARD','PR_LIST','PR_DETAIL','RECONCILIATION_IMPORT','REPORTS','NOTIFICATIONS'],
 branch_director:['DASHBOARD','PR_LIST','PR_DETAIL','APPROVAL_QUEUE','REPORTS','NOTIFICATIONS'],
 bod:['DASHBOARD','PR_LIST','PR_DETAIL','APPROVAL_QUEUE','BUDGET_OVERVIEW','BUDGET_TRANSFERS','BUDGET_WAITING_PR','REPORTS','NOTIFICATIONS'],
 admin:['ADMIN_MANAGEMENT'],
};
for (const [role,screens] of Object.entries(expected)) {
 test(`V7: ${role} only has its approved set of screen permissions`,()=>{
   const u=staff(role);
   assert.equal(primaryRole(u),role);
   for(const screen of allScreens) assert.equal(canAccessScreen(u,screen),screens.includes(screen),`${role}: ${screen}`);
 });
}
test('V7: budget figures only visible to permitted finance-related actors, always branch-scoped',()=>{
 const b={...pool('a',100),departmentId:'DEP',branchId:'BR_HCM'};
 for(const role of ['requester','dept_head','procurement','admin']) assert.equal(canReadBudget(staff(role),b),false,role);
 for(const role of ['finance','accountant','branch_director','bod']) assert.equal(canReadBudget(staff(role),b),true,role);
 assert.equal(canReadBudget(staff('finance','HQ'),b),false);
});
test('V7: the three separated financial duties cannot be used by other actors',()=>{
 for(const role of Object.keys(expected)){
   const u=staff(role);
   assert.equal(canManageBudget(u),role==='finance',role);
   assert.equal(canExecutePurchase(u),role==='procurement',role);
   assert.equal(canReconcile(u),role==='accountant',role);
   assert.equal(canManageUsers(u),role==='admin',role);
 }
});
test('V7: other branches, deactivated users and an unknown role cannot open any function',()=>{
 const inactive={...staff('bod'),isActive:false};
 const unknown={...staff('requester'),roles:[]};
 for(const u of [inactive,unknown]) for(const screen of allScreens) assert.equal(canAccessScreen(u,screen),false);
 assert.equal(canReadRequest(staff('dept_head','BR_HCM','D1'),{...exampleRequest,departmentId:'D2'}),false);
 assert.equal(canReadRequest(staff('branch_director','BR_HCM'),{...exampleRequest,branchId:'BR_DN'}),false);
 assert.equal(canReadRequest(staff('finance','HQ'),{...exampleRequest,status:'PENDING_FINANCE',versions:[]}),false);
});
test('V7: procurement/accountant cannot see pending approvals or private drafts',()=>{
 for(const role of ['procurement','accountant']){
   const u=staff(role);
   assert.equal(canReadRequest(u,{...exampleRequest,status:'DRAFT',versions:[]}),false);
   assert.equal(canReadRequest(u,{...exampleRequest,status:'PENDING_FINAL',versions:[]}),false);
   assert.equal(canReadRequest(u,{...exampleRequest,status:'APPROVED',versions:[]}),true);
 }
});
test('V7: stale multirole requester/admin cannot inherit business permissions',()=>{
 for(const roles of [['requester','bod','finance'],['admin','bod','finance']]){
   const u={...staff('bod'),roles};
   assert.equal(canAccessScreen(u,'DASHBOARD'),false);
   assert.equal(canViewAllRegions(u),false);
   assert.equal(canManageBudget(u),false);
 }
});
test('V7: only authorized approval step, no self approval or cross-department',()=>{
 const pr={...exampleRequest,createdById:'x',status:'PENDING_FINAL',currentStepIndex:0,approvalTimeline:[{status:'PENDING',assignedRole:'branch_director'}]};
 assert.equal(canApproveStep(staff('branch_director','BR_HCM'),pr,[]),true);
 assert.equal(canApproveStep(staff('dept_head','BR_HCM'),pr,[]),false);
 assert.equal(canApproveStep(staff('branch_director','BR_DN'),pr,[]),false);
 assert.equal(canApproveStep({...staff('branch_director','BR_HCM'),id:'x'},pr,[]),false);
});

test('V7: draft requests remain private even for manager, director and BOD',()=>{
 const draft={...exampleRequest,status:'DRAFT',versions:[]};
 assert.equal(canReadRequest(staff('requester'),draft),true);
 for(const role of ['dept_head','finance','branch_director','bod','procurement','accountant','admin'])
   assert.equal(canReadRequest(staff(role),draft),false,role);
});
