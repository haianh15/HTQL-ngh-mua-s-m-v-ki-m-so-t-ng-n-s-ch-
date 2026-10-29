import {withAuth} from '../../server/lib/handler.js';
import {send} from '../../server/lib/http.js';
export default withAuth(async(_req,res)=>send(res,410,{error:{code:'DEPRECATED',message:'Đề nghị V13 được ghi trực tiếp vào database nghiệp vụ. Không đồng bộ ảnh chụp demo.'}}),{rateLimit:false});
