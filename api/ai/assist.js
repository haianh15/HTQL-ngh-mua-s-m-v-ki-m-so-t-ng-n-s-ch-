import {withAuth,deny} from '../../server/lib/handler.js';
import {limitedBody,requirePost,send,asText} from '../../server/lib/http.js';
import {normaliseDraft} from '../../server/lib/analysis.js';
import {geminiJSON} from '../../server/lib/gemini.js';
export default withAuth(async(req,res,identity)=>{
  requirePost(req);if(!['requester','dept_head','finance','branch_director','bod'].includes(identity.role))deny();
  const body=limitedBody(req);const draft=normaliseDraft(body.draft,identity);
  const output=await geminiJSON('Đề xuất câu viết mục đích và thông số hàng hóa dựa trên dữ liệu. Không bịa model, thông số, báo giá, công suất, số liệu chưa được cung cấp. Trả đúng JSON object: {"purpose":"...","specifications":[{"id":"item-id","suggestion":"..."}],"note":"..."}. Không quyết định thay người dùng.',{draft,department:identity.dept});
  const result={purpose:asText(output?.purpose,1600), specifications:Array.isArray(output?.specifications)?output.specifications.slice(0,draft.items.length).map((s,i)=>({id:asText(body.draft.items[i]?.id,100)||`item-${i+1}`,suggestion:asText(s.suggestion,800)})):[],note:asText(output?.note,400)||'Chỉ là gợi ý AI; kiểm tra trước khi chèn.',source:'gemini'};
  return send(res,200,{suggestion:result});
});
