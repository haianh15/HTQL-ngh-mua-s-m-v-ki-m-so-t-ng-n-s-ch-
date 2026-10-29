import {withAuth,deny} from '../../server/lib/handler.js';
import {limitedBody,requirePost,send,asText,ApiError} from '../../server/lib/http.js';
import {table,canAnalyzeApproval} from '../../server/lib/supabase.js';
import {validateReport} from '../../server/lib/analysis.js';
import {geminiJSON,REPORT_TASK} from '../../server/lib/gemini.js';
export default withAuth(async(req,res,identity)=>{
  requirePost(req);if(!['dept_head','finance','branch_director','bod'].includes(identity.role))deny();
  const {prId}=limitedBody(req);const id=asText(prId,120);
  if(!id)throw new ApiError('INVALID_PR','Mã đề nghị không hợp lệ.');
  const rows=await table('procure_ai_requests',{select:'*',pr_id:`eq.${id}`,limit:'1'});
  const row=rows[0];if(!row)throw new ApiError('NOT_FOUND','Chưa có hồ sơ trong dữ liệu AI; người lập cần đồng bộ đề nghị trước.',404);
  if(!canAnalyzeApproval(identity,row))deny('Không có quyền phân tích hồ sơ này hoặc người duyệt là người lập.');
  const ai=await geminiJSON(REPORT_TASK+' Tóm tắt hồ sơ, điều cần xác minh, giải thích sai lệch nếu có chứng cứ. Không xác nhận duyệt/từ chối. Không tự phân xử ngân sách.',{id:row.pr_id,title:row.title,purpose:row.purpose,items:row.items,amount:row.amount,status:row.status,needByDate:row.need_by,budgetId:row.budget_id,departmentId:row.department_id,sourceTrust:'Bản chụp từ frontend demo, chưa xác thực với giao dịch ngân sách chính thức'});
  return send(res,200,{report:validateReport(ai)});
});
