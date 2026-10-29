/**
 * Procure UI — offline, deterministic decision-support rules for the demo.
 * NOT an LLM call. Never authorizes, rejects, edits, or reserves a budget.
 * Caller MUST pass only records the currently logged-in user may read.
 */
import type { BudgetLedgerEntry, BudgetPool, PRAttachment, PRItem, PurchaseRequest } from '../types';

export type InsightLevel = 'warning' | 'info' | 'success';
export interface Insight { code: string; level: InsightLevel; title: string; explanation: string; }
export interface InsightReport { headline: string; details: string[]; insights: Insight[]; limitations: string; source?: 'gemini' | 'none'; }
export interface DraftInput {
  title: string;
  purpose: string;
  needByDate: string;
  budgetId: string;
  departmentId: string;
  branchId: string;
  items: PRItem[];
  attachments: PRAttachment[];
  excludePrId?: string;
}
export interface WritingSuggestion { purpose: string; specifications: { id: string; suggestion: string }[]; note: string; }

const currency = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;
const stopWords = new Set(['cua','cho','va','voi','trong','tai','theo','de','duoc','khi','the','may','bo','mot','cac','dung','su','lan','nhu','phuc','vu','nhan','vien','phong','ban','hang','hoa','thiet','bi']);
const standardized = (input: string) => input.toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  .replace(/laptop|notebook/g, ' may tinh xach tay ')
  .replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (value: string): Set<string> => new Set(standardized(value).split(/\s+/).filter(t => t.length > 1 && !stopWords.has(t)));
function jaccard(a: string, b: string) {
  const left = tokens(a), right = tokens(b);
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter(t => right.has(t)).length;
  return overlap / new Set([...left, ...right]).size;
}
const itemDescriptions = (items: PRItem[]) => items.map(i => `${i.name} ${i.specification}`).join(' ');

/** Duplicate candidates come solely from the *authorized* collection supplied by AppContext. */
export function findSimilarAuthorizedRequests(
  draft: DraftInput, authorizedRequests: PurchaseRequest[], maxResults = 3,
): { id: string; title: string; similarity: number }[] {
  const description = itemDescriptions(draft.items);
  return authorizedRequests
    .filter(pr => pr.id !== draft.excludePrId && pr.branchId === draft.branchId &&
      pr.departmentId === draft.departmentId && pr.status !== 'CANCELLED' && pr.status !== 'REJECTED')
    .map(pr => {
      const score = Math.max(
        jaccard(description, itemDescriptions(pr.items)),
        0.65 * jaccard(draft.title, pr.title) + 0.35 * jaccard(description, itemDescriptions(pr.items)),
      );
      return { id: pr.id, title: pr.title, similarity: score };
    })
    .filter(v => v.similarity >= 0.48)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}

function parseViDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const day = +match[1], month = +match[2], year = +match[3];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function analyzeDraft(draft: DraftInput, authorizedRequests: PurchaseRequest[], today = new Date()): InsightReport {
  const insights: Insight[] = [];
  if (!draft.title.trim()) insights.push({ code:'MISSING_TITLE', level:'warning', title:'Thiếu tên đề nghị', explanation:'Bổ sung tên đề nghị cụ thể trước khi gửi.' });
  if (!draft.purpose.trim()) insights.push({ code:'MISSING_PURPOSE', level:'warning', title:'Thiếu mục đích', explanation:'Mô tả nhu cầu sử dụng và lợi ích dự kiến.' });
  else if (draft.purpose.trim().length < 35) insights.push({ code:'PURPOSE_BRIEF', level:'info', title:'Mục đích còn ngắn', explanation:'Có thể bổ sung người sử dụng, lý do cần mua và kết quả mong đợi.' });
  if (!draft.budgetId) insights.push({ code:'MISSING_BUDGET', level:'warning', title:'Chưa chọn nguồn ngân sách', explanation:'Chọn nguồn ngân sách chịu phí; việc kiểm tra số dư do nghiệp vụ Tài chính thực hiện.' });
  const due = parseViDate(draft.needByDate);
  if (!due) insights.push({ code:'INVALID_DATE', level:'warning', title:'Ngày cần không hợp lệ', explanation:'Sử dụng định dạng dd/MM/yyyy.' });
  else {
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (due < todayOnly) insights.push({ code:'PAST_DATE', level:'warning', title:'Ngày cần đã qua', explanation:'Xem lại ngày cần hàng hóa hoặc nêu lý do.' });
  }
  if (!draft.items.length || draft.items.every(i => !i.name.trim())) insights.push({ code:'MISSING_ITEMS', level:'warning', title:'Chưa có hạng mục', explanation:'Nhập ít nhất một hàng hóa hoặc dịch vụ.' });
  draft.items.forEach((item, index) => {
    const label = `Hạng mục ${index + 1}`;
    if (!item.name.trim() || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0)
      insights.push({ code:`ITEM_${index + 1}_INVALID`, level:'warning', title:`${label} thiếu dữ liệu`, explanation:'Kiểm tra tên, số lượng và đơn giá dương.' });
    if (item.name.trim() && item.specification.trim().length < 10)
      insights.push({ code:`ITEM_${index + 1}_SPEC`, level:'info', title:`${label} chưa rõ thông số`, explanation:'Nêu model/tiêu chuẩn, kích thước, yêu cầu tương thích hoặc tiêu chí chất lượng phù hợp.' });
  });
  if (!draft.attachments.length) insights.push({ code:'NO_ATTACHMENT', level:'info', title:'Chưa đính kèm tài liệu', explanation:'Kiểm tra quy chế nội bộ để biết trường hợp nào cần báo giá/chứng từ. Đây không phải điều kiện từ chối tự động.' });
  const similarities = findSimilarAuthorizedRequests(draft, authorizedRequests);
  similarities.forEach(candidate => insights.push({
    code:`SIMILAR_${candidate.id}`, level:'warning', title:'Có đề nghị nội dung tương tự',
    explanation:`Hồ sơ ${candidate.id} – ${candidate.title}. Kiểm tra xem có trùng nhu cầu mua sắm hay không. Chỉ so sánh hồ sơ bạn có quyền đọc, không suy ra dữ liệu của người khác.`,
  }));
  const total = draft.items.reduce((sum, i) => sum + (Number.isFinite(i.totalPrice) ? i.totalPrice : 0), 0);
  return {
    headline: insights.some(i=>i.level==='warning') ? 'Có điểm cần người lập kiểm tra' : 'Không thấy cảnh báo bắt buộc trong bộ kiểm tra demo',
    details:[`${draft.items.length} hạng mục · tổng dự toán ${currency(total)}`, `Đã tìm ${similarities.length} hồ sơ tương tự trong phạm vi được phép xem.`],
    insights,
    limitations:'Phân tích minh họa bằng quy tắc, chưa kết nối mô hình AI. Không thay thế kiểm tra bắt buộc, không tự gửi hay từ chối hồ sơ.',
  };
}

export function suggestDraftWording(draft: DraftInput, departmentName: string): WritingSuggestion {
  const namedItems = draft.items.filter(i=>i.name.trim());
  const itemNames = namedItems.slice(0,3).map(i=>`${i.quantity} ${i.unit} ${i.name.trim()}`);
  const itemText = itemNames.length ? itemNames.join(', ') + (namedItems.length>3 ? ' và các hạng mục kèm theo' : '') : '[tên hàng hóa/dịch vụ]';
  const purpose = `Đề nghị mua sắm ${itemText} phục vụ nhu cầu công việc của ${departmentName || '[đơn vị sử dụng]'}. `+
    `Lý do cần mua: [mô tả tình trạng và nhu cầu thực tế]. `+
    `Kết quả mong đợi: [mô tả cách sử dụng, lợi ích và thời điểm cần đưa vào sử dụng].`;
  return {
    purpose,
    specifications: draft.items.map(i=>({ id:i.id, suggestion:
      `${i.specification.trim() ? i.specification.trim() + '. ' : ''}[Hãng/model hoặc tiêu chuẩn]; [thông số cấu hình/kích thước phù hợp]; [yêu cầu tương thích/chất lượng]; [bảo hành nếu áp dụng].` })),
    note:'Đây là khung gợi ý, các phần [trong ngoặc] phải do người lập xác minh. Không tự điền model, giá hay thông số kỹ thuật chưa được cung cấp.',
  };
}

export function analyzeApproval(
  pr: PurchaseRequest, authorizedRequests: PurchaseRequest[],
  budget?: BudgetPool, canViewFinancialFigures = false,
): InsightReport {
  const insights: Insight[] = [];
  if (!pr.purpose.trim() || pr.purpose.trim().length < 35)
    insights.push({ code:'BRIEF_JUSTIFICATION', level:'info', title:'Mục đích cần xem xét', explanation:'Mô tả nhu cầu còn ngắn; người duyệt nên xem mục đích sử dụng và tính cần thiết.' });
  if (!pr.attachments.length)
    insights.push({ code:'NO_EVIDENCE', level:'info', title:'Chưa có tài liệu kèm theo', explanation:'Kiểm tra yêu cầu chứng từ theo quy chế, không tự từ chối.' });
  if (pr.items.some(i=>!i.specification.trim()))
    insights.push({ code:'UNSPECIFIED_ITEM', level:'warning', title:'Hạng mục thiếu thông số', explanation:'Kiểm tra thông số/chất lượng của các hạng mục trước khi duyệt.' });
  if (pr.totalAmount >= 50_000_000)
    insights.push({ code:'HIGH_THRESHOLD', level:'info', title:'Hồ sơ từ 50 triệu đồng', explanation:'Cấp duyệt cuối theo quy chế là Ban Giám đốc; không cho người lập tự duyệt.' });
  else if (pr.totalAmount >= 10_000_000)
    insights.push({ code:'MID_THRESHOLD', level:'info', title:'Hồ sơ từ 10 đến dưới 50 triệu', explanation:'Kiểm tra cấp duyệt cuối tại chi nhánh/trụ sở theo thẩm quyền.' });
  if (canViewFinancialFigures && budget) {
    const available = budget.allocated + (budget.adjustments||0) - budget.held - budget.committed - budget.used;
    if (pr.totalAmount > available && ['PENDING_DEPT','PENDING_FINANCE','PENDING_FINAL'].includes(pr.status))
      insights.push({ code:'PRELIM_BUDGET', level:'warning', title:'Cần kiểm tra lại ngân sách', explanation:'Dự toán lớn hơn số khả dụng hiện tại. Số dư chỉ là ảnh chụp; kiểm tra và giữ ngân sách cuối cùng do giao dịch nghiệp vụ quyết định.' });
  }
  const similar = findSimilarAuthorizedRequests({ title:pr.title, purpose:pr.purpose, needByDate:pr.needByDate,
    budgetId:pr.budgetId, departmentId:pr.departmentId, branchId:pr.branchId, items:pr.items,
    attachments:pr.attachments, excludePrId:pr.id },authorizedRequests);
  similar.forEach(s=>insights.push({ code:`SIMILAR_${s.id}`, level:'warning', title:'Đề nghị có nội dung tương tự',
    explanation:`Nên đối chiếu với hồ sơ ${s.id} – ${s.title} để loại trừ việc đề nghị trùng nhu cầu.` }));
  return {
    headline:`Tóm tắt ${pr.id}: ${pr.title}`,
    details:[`Người lập: ${pr.createdByName} · ${pr.departmentName}`, `Giá trị gồm thuế: ${currency(pr.totalAmount)} · ${pr.items.length} hạng mục`,
      `Ngày cần: ${pr.needByDate} · ${pr.attachments.length} tài liệu đính kèm`, `Trạng thái: ${pr.status} · phiên bản v${pr.currentVersion}`],
    insights,
    limitations:'Chỉ là hỗ trợ đọc/đối chiếu theo quy tắc demo. Người duyệt chịu trách nhiệm quyết định; không có thao tác duyệt/từ chối tự động.',
  };
}

export function analyzeBudgets(budgets: BudgetPool[], ledger: BudgetLedgerEntry[], requests: PurchaseRequest[]): InsightReport {
  const insights: Insight[] = [];
  const allocated = budgets.reduce((n,b)=>n+b.allocated+(b.adjustments||0),0);
  const used = budgets.reduce((n,b)=>n+b.used,0);
  const committed = budgets.reduce((n,b)=>n+b.committed,0);
  const held = budgets.reduce((n,b)=>n+b.held,0);
  for (const b of budgets) {
    const ceiling = b.allocated+(b.adjustments||0);
    const available = ceiling-b.held-b.committed-b.used;
    if (ceiling > 0 && available / ceiling < 0.15)
      insights.push({ code:`LOW_${b.id}`,level:'warning',title:`Nguồn ${b.name} gần hết khả dụng`,
        explanation:`Khả dụng ${currency(available)} trên hạn mức ${currency(ceiling)}. Xem xét các khoản đã giữ, cam kết và sử dụng trước khi có đề nghị mới.` });
  }
  for (const b of budgets) {
    const values = requests.filter(pr=>pr.budgetId===b.id && pr.status!=='DRAFT' && pr.status!=='REJECTED' && pr.status!=='CANCELLED')
      .map(pr=>pr.totalAmount).filter(n=>Number.isSafeInteger(n)&&n>0).sort((a,c)=>a-c);
    if(values.length < 4) continue;
    const midpoint=Math.floor(values.length/2);
    const median=values.length%2?values[midpoint]:(values[midpoint-1]+values[midpoint])/2;
    const largest=values[values.length-1];
    if (median>0 && largest >= 10_000_000 && largest >= median * 2.5)
      insights.push({ code:`OUTLIER_${b.id}`,level:'info',title:`Giá trị đề nghị nổi bật tại ${b.name}`,
        explanation:`Có đề nghị ${currency(largest)}, cao hơn khoảng ${(largest/median).toFixed(1)} lần trung vị ${currency(median)} của ${values.length} đề nghị trong phạm vi dữ liệu. Đây không phải kết luận sai phạm; cần kiểm tra mục đích và kỳ mua sắm.` });
  }
  // Chỉ dùng bút toán ghi nhận chi phí (Used), không coi các khoản mới giữ/đặt hàng là đã chi.
  const spendingByMonth = new Map<string, number>();
  for (const entry of ledger.filter(e=>e.transactionType==='COMMIT_TO_USED' && Number.isFinite(e.amount) && e.amount>0)) {
    const date=entry.timestamp||'';
    const vi=date.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    const iso=date.match(/\b(\d{4})-(\d{2})-\d{2}\b/);
    const key=vi?`${vi[3]}-${vi[2].padStart(2,'0')}`:iso?`${iso[1]}-${iso[2]}`:'';
    if(key) spendingByMonth.set(key,(spendingByMonth.get(key)||0)+entry.amount);
  }
  const periods=[...spendingByMonth].sort((a,b)=>a[0].localeCompare(b[0]));
  const lastThree=periods.slice(-3);
  const monthNumber=(key:string)=>Number(key.slice(0,4))*12+Number(key.slice(5,7));
  const consecutive=lastThree.length===3 && monthNumber(lastThree[1][0])-monthNumber(lastThree[0][0])===1 &&
    monthNumber(lastThree[2][0])-monthNumber(lastThree[1][0])===1;
  if (!consecutive) insights.push({ code:'INSUFFICIENT_HISTORY',level:'info',title:'Chưa đủ dữ liệu lịch sử để kết luận xu hướng',
    explanation:'Cần ít nhất ba tháng liên tiếp có bút toán chi phí đã đối soát. Không đưa ra dự báo hay gán nguyên nhân khi chưa có bằng chứng.' });
  else {
    const baseline=(lastThree[0][1]+lastThree[1][1])/2;
    const last=lastThree[2][1];
    const direction=baseline>0?(last>baseline*1.25?'tăng':last<baseline*0.75?'giảm':'tương đối ổn định'):'chưa xác định';
    insights.push({ code:'SPENDING_TREND',level: direction==='tăng'?'warning':'info',title:`Chi phí ghi nhận ${direction} trong kỳ ${lastThree[2][0]}`,
      explanation:`Chi phí tháng gần nhất ${currency(last)} so với trung bình hai tháng trước ${currency(baseline)}. Kiểm tra kỳ mua sắm, số lượng thực hiện và thời điểm hạch toán để tìm nguyên nhân; dữ liệu hiện tại chưa chứng minh nguyên nhân cụ thể.` });
  }
  return {
    headline:`Tổng quan ${budgets.length} nguồn ngân sách trong phạm vi được phép`,
    details:[`Hạn mức điều chỉnh: ${currency(allocated)}`, `Đang giữ: ${currency(held)} · cam kết: ${currency(committed)}`,
      `Đã sử dụng: ${currency(used)} · còn khả dụng: ${currency(allocated-held-committed-used)}`],
    insights,
    limitations:'Phân tích dựa trên quy tắc và dữ liệu được phép xem tại trình duyệt; không phải kết luận AI hoặc dự báo được huấn luyện. Không tác động số dư.',
  };
}
