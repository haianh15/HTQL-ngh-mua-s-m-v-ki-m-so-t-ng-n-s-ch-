const test=require('node:test');
const assert=require('node:assert/strict');
const ai=require('../.ai-build/ai/insights.js');
const baseItem={id:'i1',name:'Laptop Dell',specification:'Core i5 RAM 16GB SSD 512GB',quantity:5,unit:'chiếc',unitPrice:13_888_889,taxRate:8,totalPrice:75_000_001};
const draft=(override={})=>({title:'Mua 5 laptop cho phòng IT',purpose:'Phục vụ xử lý công việc và dự án của phòng IT',needByDate:'15/11/2026',budgetId:'B01',departmentId:'IT',branchId:'HQ',items:[baseItem],attachments:[],...override});
const pr=(override={})=>({id:'PR-001',title:'Mua laptop cho nhân viên IT',purpose:'Phục vụ nhân viên',needByDate:'20/11/2026',budgetId:'B01',departmentId:'IT',branchId:'HQ',items:[baseItem],attachments:[],status:'PENDING_FINANCE',totalAmount:75_000_001,createdById:'u2',createdByName:'Hà',versions:[],currentVersion:1,...override});
const budget=(override={})=>({id:'B01',name:'Ngân sách CNTT',branchId:'HQ',departmentId:'IT',allocated:100_000_000,adjustments:0,held:80_000_000,committed:10_000_000,used:5_000_000,...override});
test('Cảnh báo yêu cầu thiếu bắt buộc nhưng không ngăn gửi hoặc đổi dữ liệu',()=>{
 const d=draft({title:'',purpose:'',budgetId:'',items:[]});const snapshot=JSON.stringify(d);
 const r=ai.analyzeDraft(d,[]);assert.ok(r.insights.some(x=>x.code==='MISSING_TITLE'));
 assert.ok(r.insights.some(x=>x.code==='MISSING_PURPOSE'));assert.ok(r.insights.some(x=>x.code==='MISSING_BUDGET'));
 assert.equal(JSON.stringify(d),snapshot);
});
test('Tìm đề nghị trùng cùng phòng ban, cùng chi nhánh từ hồ sơ được phép',()=>{
 const r=ai.analyzeDraft(draft(),[pr()]);assert.ok(r.insights.some(x=>x.code==='SIMILAR_PR-001'));
});
test('Không hiển thị đề nghị của phòng ban hoặc chi nhánh khác',()=>{
 const r=ai.analyzeDraft(draft(),[pr({departmentId:'SALE'}),pr({id:'PR-002',branchId:'BR_HN'})]);
 assert.ok(!r.insights.some(x=>x.code.startsWith('SIMILAR_')));
});
test('Không đưa ra hồ sơ trùng khi không có quyền đọc/candidate list rỗng',()=>{
 const r=ai.analyzeDraft(draft(),[]);assert.ok(!r.insights.some(x=>x.code.startsWith('SIMILAR_')));
});
test('Khung soạn thảo không bịa thông số, không sửa dữ liệu đầu vào',()=>{
 const d=draft();const before=JSON.stringify(d);const s=ai.suggestDraftWording(d,'Phòng Công nghệ');
 assert.ok(s.purpose.includes('[mô tả'));assert.ok(s.specifications[0].suggestion.includes('[Hãng/model'));
 assert.equal(JSON.stringify(d),before);
});
test('Người duyệt được tóm tắt 75 triệu và gợi ý kiểm tra cấp duyệt BOD',()=>{
 const r=ai.analyzeApproval(pr(),[]);assert.ok(r.details.some(t=>t.includes('75.000.001')));
 assert.ok(r.insights.some(x=>x.code==='HIGH_THRESHOLD'));
});
test('Tóm tắt cho trưởng phòng không rò rỉ số dư khả dụng của nguồn',()=>{
 const r=ai.analyzeApproval(pr(),[],budget(),false);
 assert.ok(!r.insights.some(x=>x.code==='PRELIM_BUDGET'));
 assert.ok(!r.details.some(t=>t.includes('100.000.000')));
});
test('Kiểm tra thiếu ngân sách sơ bộ chỉ dành cho người được xem',()=>{
 const r=ai.analyzeApproval(pr(),[],budget({held:90_000_000}),true);
 assert.ok(r.insights.some(x=>x.code==='PRELIM_BUDGET'));
});
test('Cảnh báo ngân sách gần cạn, giữ đúng công thức không trừ hai lần',()=>{
 const b=budget();const before=JSON.stringify(b);const r=ai.analyzeBudgets([b],[],[]);
 assert.ok(r.insights.some(x=>x.code==='LOW_B01'));
 assert.ok(r.details.some(x=>x.includes('5.000.000')));
 assert.equal(JSON.stringify(b),before);
});
test('Không dự báo/đoán nguyên nhân khi thiếu dữ liệu lịch sử',()=>{
 const r=ai.analyzeBudgets([budget()],[],[]);
 assert.ok(r.insights.some(x=>x.code==='INSUFFICIENT_HISTORY'));
});
test('Phát hiện khoản chi lớn bất thường khi có 4 đề nghị đủ điều kiện',()=>{
 const rs=[1_000_000,1_200_000,1_100_000,75_000_000].map((x,i)=>pr({id:'PR-'+i,totalAmount:x}));
 const r=ai.analyzeBudgets([budget()],[],rs);
 assert.ok(r.insights.some(x=>x.code==='OUTLIER_B01'));
});
test('Cảnh báo đề nghị hết hạn cần kiểm tra nhưng không tự sửa ngày',()=>{
 const d=draft({needByDate:'01/01/2020'});const r=ai.analyzeDraft(d,[],new Date(2026,9,28));
 assert.ok(r.insights.some(x=>x.code==='PAST_DATE'));assert.equal(d.needByDate,'01/01/2020');
});
test('Phân tích xu hướng dựa trên 3 tháng ghi nhận chi phí và không đoán nguyên nhân',()=>{
 const ledger=[['2026-07-12',1_000_000],['2026-08-12',1_200_000],['2026-09-12',3_500_000]]
   .map(([timestamp,amount])=>({budgetId:'B01',timestamp,amount,transactionType:'COMMIT_TO_USED'}));
 const r=ai.analyzeBudgets([budget()],ledger,[]);
 assert.ok(r.insights.some(x=>x.code==='SPENDING_TREND' && x.title.includes('tăng')));
 assert.ok(!r.insights.some(x=>x.code==='INSUFFICIENT_HISTORY'));
});
