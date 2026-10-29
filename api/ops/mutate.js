import {withAuth} from '../../server/lib/handler.js';
import {limitedBody,requirePost,send,ApiError} from '../../server/lib/http.js';
import {table} from '../../server/lib/supabase.js';
const allowed=new Set(['PR_CREATE','PR_UPDATE','PR_SUBMIT','PR_REVISE','PR_CANCEL','BUDGET_RECHECK','APPROVAL','PROC_RECEIVE','PROC_ORDER','BUDGET_RELEASE','TRANSFER_REQUEST','TRANSFER_DECIDE','ACCOUNT_IMPORT','ACCOUNT_COMMIT','NOTIFICATION_READ','ADMIN_USER','DELEGATE','REVOKE_DELEGATION']);
export default withAuth(async(req,res,identity)=>{
  requirePost(req);
  const {action,data}=limitedBody(req,140_000);
  if(!allowed.has(action)||!data||typeof data!=='object'||Array.isArray(data))throw new ApiError('INVALID_ACTION','Nghiệp vụ không hợp lệ.',400);
  const result=await table('rpc/procure_v13_mutate',{}, {method:'POST',body:{p_uid:identity.authUid,p_action:action,p_data:data}});
  if(result?.ok===false) return send(res,409,{error:{code:'BUSINESS_RULE',message:result.message||'Không thể thực hiện nghiệp vụ.'}});
  return send(res,200,result);
},{rateLimit:false});
