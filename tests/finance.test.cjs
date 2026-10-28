const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  availableBudget, reserveBudget, commitBudget, recognizeExpense, releaseHold,
  transferBudget, canApproveStep, canSeeBranch, heldForRequest, isValidPRItems,
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
