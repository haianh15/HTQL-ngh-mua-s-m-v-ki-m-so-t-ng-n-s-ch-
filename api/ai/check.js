import {withAuth,deny} from '../../server/lib/handler.js';
import {send,limitedBody,requirePost,asText} from '../../server/lib/http.js';
import {table} from '../../server/lib/supabase.js';
import {normaliseDraft,findSimilar,validateReport,requestAmount} from '../../server/lib/analysis.js';
import {geminiJSON,REPORT_TASK} from '../../server/lib/gemini.js';

// Works with the existing Procure UI Supabase database (V11/V12).
// Do not depend on procure_v13_state unless the V13 database is installed.
export default withAuth(async(req,res,identity)=>{
  requirePost(req);
  if(identity.role==='admin')deny();
  const body=limitedBody(req);
  const draft=normaliseDraft(body.draft,identity);

  // Search only the user's own records to prevent disclosing another user's PR.
  // This query uses procure_ai_requests, already present in the original project.
  const rows=await table('procure_ai_requests',{
    select:'pr_id,title,items,status,owner_auth_uid',
    owner_auth_uid:`eq.${identity.authUid}`,
    branch_id:`eq.${identity.branch}`,
    department_id:`eq.${identity.dept}`,
    limit:'100',
  });
  const candidates=findSimilar(draft,rows,asText(body.excludePrId,120));
  const publicSimilar = identity.role==='requester'
    ? {similarCount:candidates.length}
    : {similar:candidates.map(({r,score})=>({id:r.pr_id,title:r.title,similarity:Number(score.toFixed(2))}))};

  const ai=await geminiJSON(
    REPORT_TASK+' Kiểm tra đủ thông tin, mô tả thông số, ngày cần, dấu hiệu trùng nhu cầu. Không mặc định thiếu báo giá là lỗi chặn. Không tự sửa dữ liệu.',
    {draft,amount:requestAmount(draft),...publicSimilar},
  );
  const report=validateReport(ai);
  if(candidates.length && !report.insights.some(x=>x.code==='SIMILAR_REQUEST')){
    report.insights.unshift({
      code:'SIMILAR_REQUEST',level:'warning',title:'Có đề nghị tương tự cần kiểm tra',
      explanation:identity.role==='requester'
        ? 'Bạn đã lập đề nghị có nội dung tương tự trước đó. Vui lòng kiểm tra để tránh gửi trùng.'
        : `Có ${candidates.length} đề nghị của chính bạn có nội dung tương tự.`,
    });
  }
  return send(res,200,{report});
});
