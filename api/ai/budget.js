import {withAuth,deny} from '../../server/lib/handler.js';
import {requirePost,send} from '../../server/lib/http.js';
import {table,canSeeBudgets} from '../../server/lib/supabase.js';
import {financialFacts,validateReport} from '../../server/lib/analysis.js';
import {geminiJSON,REPORT_TASK} from '../../server/lib/gemini.js';
export default withAuth(async(req,res,identity)=>{
  requirePost(req);if(!canSeeBudgets(identity))deny();
  const filter={select:'budget_id,name,branch_id,allocated,adjustments,held,committed,used,updated_at',limit:'300'};
  if(identity.role!=='bod')filter.branch_id=`eq.${identity.branch}`;
  const rows=await table('procure_ai_budgets',filter);
  if(rows.length===0)return send(res,200,{report:{headline:'Chưa có dữ liệu ngân sách trên máy chủ',details:['Tài chính cần đồng bộ ảnh chụp dữ liệu ngân sách vào khu vực được phân công trước khi phân tích.'],insights:[],limitations:'Không có dữ liệu để phân tích. AI không được suy đoán.',source:'none'}});
  const facts=financialFacts(rows);
  const ai=await geminiJSON(REPORT_TASK+' Phân tích mức sử dụng và nguồn gần hết. Không nói xu hướng theo thời gian nếu chỉ có một ảnh chụp, không khẳng định nguyên nhân. Ngân sách khả dụng và các số phải lấy nguyên từ dữ liệu chứ không được tính lại bằng AI.',{budgets:facts,updatedAt:rows.map(r=>r.updated_at)});
  const report=validateReport(ai);
  const availableTotal=facts.reduce((sum,b)=>sum+b.available,0);
  report.details.unshift(`Đã phân tích ${rows.length} nguồn ngân sách (${identity.role==='bod'?'toàn công ty':identity.branch}). Tổng khả dụng tính theo quy tắc: ${availableTotal.toLocaleString('vi-VN')} ₫.`);
  return send(res,200,{report});
});
