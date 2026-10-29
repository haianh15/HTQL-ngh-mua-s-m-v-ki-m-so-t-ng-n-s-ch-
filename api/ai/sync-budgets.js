import {withAuth} from '../../server/lib/handler.js';
import {send} from '../../server/lib/http.js';
export default withAuth(async(_req,res)=>send(res,410,{error:{code:'DEPRECATED',message:'Ngân sách V13 chỉ thay đổi qua giao dịch nghiệp vụ trên máy chủ.'}}),{rateLimit:false});
