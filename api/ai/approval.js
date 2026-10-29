import {withAuth,deny} from '../../server/lib/handler.js';
import {limitedBody,requirePost,send,asText,ApiError} from '../../server/lib/http.js';
import {table} from '../../server/lib/supabase.js';
import {validateReport} from '../../server/lib/analysis.js';
import {geminiJSON,REPORT_TASK} from '../../server/lib/gemini.js';
export default withAuth(async(req,res,identity)=>{
  requirePost(req);if(!['dept_head','finance','branch_director','bod'].includes(identity.role))deny();
  const {prId}=limitedBody(req);const id=asText(prId,120);
  if(!id)throw new ApiError('INVALID_PR','Mã đề nghị không hợp lệ.');
  const state=await table('rpc/procure_v13_state',{}, {method:'POST',body:{p_uid:identity.authUid}});
  const row=(state?.purchaseRequests||[]).find(r=>r.id===id);
  if(!row)throw new ApiError('NOT_FOUND','Không có quyền xem hồ sơ hoặc hồ sơ không tồn tại.',404);
  const step=row.approvalTimeline?.[row.currentStepIndex];
  if(!['PENDING_DEPT','PENDING_FINANCE','PENDING_FINAL'].includes(row.status) || step?.assignedRole!==identity.role || row.createdByEmail?.toLowerCase()===identity.email?.toLowerCase())deny('Hồ sơ không thuộc hàng chờ của bạn.');
  const ai=await geminiJSON(REPORT_TASK+' Tóm tắt hồ sơ, điều cần xác minh, giải thích sai lệch nếu có chứng cứ. Không xác nhận duyệt/từ chối. Không tự phân xử ngân sách.',{id:row.id,title:row.title,purpose:row.purpose,items:row.items,amount:row.totalAmount,status:row.status,needByDate:row.needByDate,budgetId:row.budgetId,departmentId:row.departmentId,sourceTrust:'Dữ liệu nghiệp vụ lưu trên máy chủ V13'});
  return send(res,200,{report:validateReport(ai)});
});
