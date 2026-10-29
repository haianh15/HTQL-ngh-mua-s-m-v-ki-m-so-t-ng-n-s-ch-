import {withAuth} from '../../server/lib/handler.js';
import {requirePost,send} from '../../server/lib/http.js';
import {table} from '../../server/lib/supabase.js';
export default withAuth(async(req,res,identity)=>{
  if(req.method!=='GET')requirePost(req);
  const data=await table('rpc/procure_v13_state',{}, {method:'POST',body:{p_uid:identity.authUid}});
  return send(res,200,{state:data});
},{rateLimit:false});
