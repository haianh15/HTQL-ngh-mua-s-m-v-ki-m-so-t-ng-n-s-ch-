import {withAuth} from '../../server/lib/handler.js';
import {send} from '../../server/lib/http.js';
export default withAuth(async(req,res,identity)=>{
  if(req.method !=='GET')return send(res,405,{error:{code:'METHOD_NOT_ALLOWED',message:'Chỉ hỗ trợ GET.'}});
  return send(res,200,{profile:{id:identity.code,name:identity.name,email:identity.email,roles:[identity.role],branchId:identity.branch,departmentId:identity.dept,isActive:true}});
},{rateLimit:false});
