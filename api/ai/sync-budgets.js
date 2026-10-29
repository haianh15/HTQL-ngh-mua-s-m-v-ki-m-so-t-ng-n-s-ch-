import {withAuth,deny} from '../../server/lib/handler.js';
import {limitedBody,requirePost,send,asText,money,ApiError} from '../../server/lib/http.js';
import {table} from '../../server/lib/supabase.js';
export default withAuth(async(req,res,identity)=>{
  requirePost(req);if(identity.role!=='finance')deny('Chỉ Tài chính được đồng bộ ảnh chụp ngân sách.');
  const {budgets}=limitedBody(req,70_000);
  if(!Array.isArray(budgets)||budgets.length>200)throw new ApiError('INVALID_BUDGETS','Danh sách nguồn không hợp lệ.');
  const rows=budgets.map(b=>{
    if(b.branchId!==identity.branch)deny('Không được đồng bộ ngân sách ngoài chi nhánh của mình.');
    const [allocated,adjustments,held,committed,used]=[b.allocated,b.adjustments,b.held,b.committed,b.used].map(Number);
    if([allocated,held,committed,used].some(v=>money(v)===null)||!Number.isSafeInteger(adjustments)||Math.abs(adjustments)>1e12) throw new ApiError('INVALID_BUDGET','Giá trị ngân sách không hợp lệ.');
    if(allocated+adjustments-held-committed-used<0)throw new ApiError('INVALID_BUDGET','Dữ liệu ngân sách có số khả dụng âm.');
    return {budget_id:asText(b.id,120),name:asText(b.name,200),branch_id:identity.branch,allocated,adjustments,held,committed,used,updated_at:new Date().toISOString()};
  });
  if(rows.some(r=>!r.budget_id||!r.name))throw new ApiError('INVALID_BUDGET','Thiếu mã hoặc tên nguồn.');
  for(const r of rows){
    const old=await table('procure_ai_budgets',{select:'branch_id',budget_id:`eq.${r.budget_id}`,limit:'1'});
    if(old[0]&&old[0].branch_id!==identity.branch)deny('Nguồn ngân sách này thuộc chi nhánh khác.');
  }
  if(rows.length)await table('procure_ai_budgets',{on_conflict:'budget_id'},{method:'POST',upsert:true,body:rows});
  return send(res,200,{ok:true,count:rows.length,note:'Chỉ đồng bộ bản chụp để phân tích AI, KHÔNG ghi nhận quyết định tài chính.'});
});
