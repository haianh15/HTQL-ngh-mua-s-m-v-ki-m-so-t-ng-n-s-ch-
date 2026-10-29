import {withAuth,deny} from '../../server/lib/handler.js';
import {limitedBody,requirePost,send,asText,ApiError} from '../../server/lib/http.js';
import {table} from '../../server/lib/supabase.js';
import {normaliseDraft,requestAmount} from '../../server/lib/analysis.js';
export default withAuth(async(req,res,identity)=>{
  requirePost(req);if(!['requester','dept_head','finance','branch_director','bod'].includes(identity.role))deny();
  const body=limitedBody(req);const pr=body.request;const id=asText(pr?.id,120);
  if(!/^[A-Za-z0-9_-]{4,120}$/.test(id))throw new ApiError('INVALID_PR','Mã phiếu không hợp lệ.');
  const draft=normaliseDraft({...pr,needByDate:pr.needByDate},identity);
  const existing=await table('procure_ai_requests',{select:'owner_auth_uid',pr_id:`eq.${id}`,limit:'1'});
  if(existing[0]&&existing[0].owner_auth_uid!==identity.authUid)deny('Hồ sơ này thuộc tài khoản khác.');
  if(!['DRAFT','PENDING_DEPT','PENDING_FINANCE','PENDING_FINAL','REVISION_REQUESTED','WAITING_FUNDS','APPROVED','IN_PROGRESS','COMPLETED','REJECTED','CANCELLED'].includes(pr.status))throw new ApiError('INVALID_STATUS','Trạng thái đề nghị không hợp lệ.');
  await table('procure_ai_requests', {on_conflict:'pr_id'}, {method:'POST',upsert:true,body:{pr_id:id,owner_auth_uid:identity.authUid,owner_code:identity.code,branch_id:identity.branch,department_id:identity.dept,title:draft.title,purpose:draft.purpose,need_by:draft.needByDate,budget_id:draft.budgetId,items:draft.items,amount:requestAmount(draft),status:asText(pr.status,30)||'DRAFT',updated_at:new Date().toISOString()}});
  return send(res,200,{ok:true,id});
});
