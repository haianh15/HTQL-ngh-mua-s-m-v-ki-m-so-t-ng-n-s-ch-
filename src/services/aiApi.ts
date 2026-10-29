import type { DraftInput, InsightReport, WritingSuggestion } from '../ai/insights';
import type { PurchaseRequest, BudgetPool, User } from '../types';
const KEY='procure-real-auth-v1';
type Token={access_token:string; refresh_token:string; expires_at?:number; expires_in?:number};
function cfg() {
  const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
  const anon=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;
  if(!url||!anon)throw Error('Chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY cho frontend.');
  return {url:url.replace(/\/$/,''),anon};
}
let liveToken: Token|null=null;
function readToken():Token|null {
  if(liveToken)return liveToken;
  try{ const raw=sessionStorage.getItem(KEY);liveToken=raw?JSON.parse(raw):null; }catch{liveToken=null;}
  return liveToken;
}
function saveToken(data:Token) {
  liveToken={...data,expires_at:data.expires_at ?? Math.floor(Date.now()/1000)+(data.expires_in||3600)};
  sessionStorage.setItem(KEY,JSON.stringify(liveToken));
}
export function clearAuth(){liveToken=null;try{sessionStorage.removeItem(KEY);}catch{}}
async function supa(path:string,body:unknown,access?:string){
  const {url,anon}=cfg();
  const res=await fetch(`${url}${path}`,{method:'POST',headers:{'Content-Type':'application/json',apikey:anon,...(access?{Authorization:`Bearer ${access}`}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)}).catch(e=>{
    if(e?.name==='TimeoutError')throw Error('Kết nối Supabase quá lâu (15 giây). Vui lòng thử lại.');
    throw e;
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.msg||data.error_description||data.message||'Lỗi xác thực từ máy chủ.');
  return data;
}
export async function getToken():Promise<string>{
  const token=readToken();if(!token)throw Error('Bạn cần đăng nhập tài khoản thật để sử dụng AI.');
  if((token.expires_at||0)*1000 > Date.now()+60_000)return token.access_token;
  try{const data=await supa('/auth/v1/token?grant_type=refresh_token',{refresh_token:token.refresh_token});saveToken(data);return data.access_token;}
  catch{clearAuth();throw Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');}
}
async function api<T>(path:string,body?:unknown,method='POST'):Promise<T>{
  const token=await getToken();
  const res=await fetch(path,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},...(method==='POST'?{body:JSON.stringify(body??{})}:{}),signal:AbortSignal.timeout(20000)}).catch(e=>{
    if(e?.name==='TimeoutError')throw Error('Máy chủ xác minh quyền phản hồi quá lâu (20 giây). Vui lòng thử lại.');
    throw e;
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.error?.message||`Lỗi API (${res.status}).`);
  return data;
}
export async function signInReal(email:string,password:string):Promise<User>{
  clearAuth();
  // One app request instead of: browser -> Supabase Auth -> Vercel /me -> Supabase Auth -> profiles.
  // Server validates the password with Supabase then returns the verified role and session together.
  const res=await fetch('/api/auth/login',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:email.trim(),password}),signal:AbortSignal.timeout(20000),
  }).catch(e=>{
    if(e?.name==='TimeoutError')throw Error('Máy chủ đăng nhập phản hồi quá lâu (20 giây). Vui lòng thử lại.');
    throw e;
  });
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(body.error?.message||`Không thể đăng nhập (HTTP ${res.status}).`);
  if(!body.session?.access_token||!body.session?.refresh_token||!body.profile?.id)
    throw Error('Phiên đăng nhập không hợp lệ. Vui lòng thử lại.');
  saveToken(body.session);
  return body.profile as User;
}
export async function restoreRealUser():Promise<User>{
  const {profile}=await api<{profile:User}>('/api/ai/me',undefined,'GET');return profile;
}
export async function signOutReal(){
  const token=readToken();clearAuth(); // Hủy phiên trên trình duyệt ngay, không chặn lần đăng nhập tiếp theo.
  if(token?.access_token){try{await supa('/auth/v1/logout',{},token.access_token);}catch{}}
}
export async function aiCheckDraft(draft:DraftInput):Promise<InsightReport>{
  return (await api<{report:InsightReport}>('/api/ai/check',{draft,excludePrId:draft.excludePrId})).report;
}
export async function aiAssistDraft(draft:DraftInput):Promise<WritingSuggestion>{
  return (await api<{suggestion:WritingSuggestion}>('/api/ai/assist',{draft})).suggestion;
}
export async function aiReviewRequest(prId:string):Promise<InsightReport>{
  return (await api<{report:InsightReport}>('/api/ai/approval',{prId})).report;
}
export async function aiAnalyzeBudgets():Promise<InsightReport>{
  return (await api<{report:InsightReport}>('/api/ai/budget',{})).report;
}
export async function aiSyncRequest(pr:PurchaseRequest){
  return api('/api/ai/sync-request',{request:{id:pr.id,title:pr.title,purpose:pr.purpose,needByDate:pr.needByDate,budgetId:pr.budgetId,items:pr.items,status:pr.status}});
}
export async function aiSyncBudgets(budgets:BudgetPool[]){
  return api('/api/ai/sync-budgets',{budgets:budgets.map(b=>({id:b.id,name:b.name,branchId:b.branchId,allocated:b.allocated,adjustments:b.adjustments,held:b.held,committed:b.committed,used:b.used}))});
}

// V13 business transactions; business data is NEVER written to localStorage.
export type LiveState = {
  users: User[];purchaseRequests:PurchaseRequest[];budgetPools:BudgetPool[];
  ledgerEntries: import('../types').BudgetLedgerEntry[];
  transfers: import('../types').BudgetTransferRequest[];
  delegations: import('../types').Delegation[];
  notifications: import('../types').NotificationItem[];
  auditLogs: import('../types').AuditLogItem[];
  accountingBatches: import('../types').AccountingImportBatch[];
};
export async function getLiveState():Promise<LiveState>{
  const {state}=await api<{state:LiveState}>('/api/ops/state',undefined,'GET');
  if(!state||!Array.isArray(state.purchaseRequests)||!Array.isArray(state.budgetPools))
    throw Error('Máy chủ chưa kích hoạt cơ sở dữ liệu nghiệp vụ V13. Không hiển thị dữ liệu demo.');
  return state;
}
export async function liveMutation(action:string,data:Record<string,unknown>):Promise<{ok:boolean;id?:string;status?:string}>{
  return api('/api/ops/mutate',{action,data});
}
