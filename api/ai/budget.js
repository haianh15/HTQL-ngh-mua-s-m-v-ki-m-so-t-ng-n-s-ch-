import {withAuth,deny} from '../../server/lib/handler.js';
import {requirePost,send} from '../../server/lib/http.js';
import {table,canSeeBudgets} from '../../server/lib/supabase.js';
import {financialFacts,validateReport} from '../../server/lib/analysis.js';
import {geminiJSON,REPORT_TASK} from '../../server/lib/gemini.js';
export default withAuth(async(req,res,identity)=>{
  requirePost(req);if(!canSeeBudgets(identity))deny();
  const state=await table('rpc/procure_v13_state',{}, {method:'POST',body:{p_uid:identity.authUid}});
  const rows=(state.budgetPools||[]).map(b=>({budget_id:b.id,name:b.name,branch_id:b.branchId,allocated:b.allocated,adjustments:b.adjustments,held:b.held,committed:b.committed,used:b.used,updated_at:'live'}));
  if(!rows.length)return send(res,200,{report:{headline:'Chưa có ngân sách được cấp',details:['Cần nhập hạn mức chính thức vào database V13 trước khi phân tích.'],insights:[]}});
  const facts=financialFacts(rows);
  const ai=await geminiJSON(REPORT_TASK+' Phân tích mức sử dụng và nguồn gần hết. Không nói xu hướng theo thời gian nếu chỉ có một ảnh chụp, không khẳng định nguyên nhân. Ngân sách khả dụng và các số phải lấy nguyên từ dữ liệu chứ không được tính lại bằng AI.',{budgets:facts,updatedAt:rows.map(r=>r.updated_at)});
  const report=validateReport(ai);
  const availableTotal=facts.reduce((sum,b)=>sum+b.available,0);
  report.details.unshift(`Đã phân tích ${rows.length} nguồn ngân sách (${identity.role==='bod'?'toàn công ty':identity.branch}). Tổng khả dụng tính theo quy tắc: ${availableTotal.toLocaleString('vi-VN')} ₫.`);
  return send(res,200,{report});
});
