import {withAuth,deny} from '../../server/lib/handler.js';
import {send,limitedBody,requirePost,asText} from '../../server/lib/http.js';
import {table} from '../../server/lib/supabase.js';
import {normaliseDraft,findSimilar,validateReport,requestAmount} from '../../server/lib/analysis.js';
import {geminiJSON,REPORT_TASK} from '../../server/lib/gemini.js';
export default withAuth(async(req,res,identity)=>{
  requirePost(req);if(identity.role==='admin')deny();
  const body=limitedBody(req);
  const draft=normaliseDraft(body.draft,identity);
  const rows=await table('procure_ai_requests',{select:'pr_id,title,items,status,owner_auth_uid',branch_id:`eq.${identity.branch}`,department_id:`eq.${identity.dept}`,limit: '100'});
  const candidates=findSimilar(draft,rows,asText(body.excludePrId,120));
  // Nhân viên chỉ được biết có trùng nhu cầu; KHÔNG trả mã/tên phiếu của đồng nghiệp.
  const publicSimilar = identity.role==='requester' ? {similarCount:candidates.length} : {similar:candidates.map(({r,score})=>({id:r.pr_id,title:r.title,similarity:Number(score.toFixed(2))}))};
  const ai=await geminiJSON(REPORT_TASK+' Kiểm tra đủ thông tin, mô tả thông số, ngày cần, dấu hiệu trùng nhu cầu. Không mặc định thiếu báo giá là lỗi chặn. Không tự sửa dữ liệu.', {draft,amount:requestAmount(draft),...publicSimilar});
  const report=validateReport(ai);
  if(candidates.length && !report.insights.some(x=>x.code==='SIMILAR_REQUEST')){
    report.insights.unshift({code:'SIMILAR_REQUEST',level:'warning',title:'Có đề nghị tương tự cần kiểm tra',explanation:identity.role==='requester' ? 'Đã phát hiện nhu cầu có nội dung tương tự trong cùng phòng ban. Liên hệ người quản lý để kiểm tra tránh mua trùng; thông tin người khác được bảo mật.' : `Có ${candidates.length} hồ sơ tương tự trong phòng ban, cần đối chiếu nội dung trước khi duyệt.`});
  }
  return send(res,200,{report});
});
