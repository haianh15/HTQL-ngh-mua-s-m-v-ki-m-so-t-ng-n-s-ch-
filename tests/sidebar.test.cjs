const test = require('node:test');
const assert = require('node:assert/strict');
const {sidebarByRole,sidebarActiveScreen} = require('../.nav-build/navigation/sidebar.js');
const {canAccessScreen,defaultScreenFor} = require('../.nav-build/domain/rules.js');
const staff=role=>({id:`usr_${role}`,name:role,email:`${role}@example.com`,isActive:true,roles:[role],branchId:'HQ',departmentId:'D'});
const expected={
 requester:['PR_LIST'],
 dept_head:['APPROVAL_QUEUE','PR_LIST'],
 finance:['DASHBOARD','APPROVAL_QUEUE','BUDGET_OVERVIEW'],
 procurement:['DASHBOARD','EXECUTION_LIST'],
 accountant:['DASHBOARD','RECONCILIATION_IMPORT'],
 branch_director:['DASHBOARD','APPROVAL_QUEUE'],
 bod:['DASHBOARD','APPROVAL_QUEUE','BUDGET_OVERVIEW'],
 admin:['ADMIN_MANAGEMENT'],
};
for (const [role,ids] of Object.entries(expected)) {
  test(`Menu ${role}: chỉ tác vụ thiết yếu, không mất quyền`,()=>{
    const entries=sidebarByRole[role].entries;
    assert.deepEqual(entries.map(x=>x.id),ids);
    assert.equal(new Set(ids).size,ids.length);
    assert.ok(ids.includes(defaultScreenFor(staff(role))), 'default page must be in sidebar');
    assert.ok(entries.every(x=>canAccessScreen(staff(role),x.id)), 'all sidebar links allowed');
    assert.ok(!entries.some(x=>['NOTIFICATIONS','PR_CREATE','BUDGET_TRANSFERS','REPORTS'].includes(x.id)));
  });
}
test('Màn hình thao tác thuộc đúng mục cha trong sidebar',()=>{
  assert.equal(sidebarActiveScreen('PR_CREATE'),'PR_LIST');
  assert.equal(sidebarActiveScreen('PR_EDIT'),'PR_LIST');
  assert.equal(sidebarActiveScreen('BUDGET_TRANSFERS'),'BUDGET_OVERVIEW');
  assert.equal(sidebarActiveScreen('BUDGET_WAITING_PR'),'BUDGET_OVERVIEW');
  assert.equal(sidebarActiveScreen('APPROVAL_QUEUE'),'APPROVAL_QUEUE');
});
