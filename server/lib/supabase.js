import { ApiError } from './http.js';
const API_TIMEOUT = 12_000;
function env() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anon) throw new ApiError('SETUP_REQUIRED','Chưa cấu hình Supabase cho backend.',503);
  return { url: url.replace(/\/$/, ''), serviceKey, anon };
}
async function parse(res) { const text = await res.text(); try {return text ? JSON.parse(text) : null;} catch {return {detail:'Lỗi định dạng phản hồi từ cơ sở dữ liệu.'};} }
export async function requireIdentity(req) {
  const header = req.headers.authorization || '';
  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(header);
  if (!match) throw new ApiError('UNAUTHORIZED', 'Bạn cần đăng nhập tài khoản thật để sử dụng AI.', 401);
  const {url, anon} = env();
  const res = await fetch(`${url}/auth/v1/user`, { headers: {apikey:anon, Authorization:`Bearer ${match[1]}`}, signal:AbortSignal.timeout(API_TIMEOUT) });
  if (!res.ok) throw new ApiError('UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.', 401);
  const auth = await parse(res);
  if (!auth?.id || !auth?.email) throw new ApiError('UNAUTHORIZED', 'Không xác minh được tài khoản.',401);
  const profiles = await table('procure_ai_profiles', {select:'auth_uid,user_code,email,display_name,role,branch_id,department_id,active', auth_uid:`eq.${auth.id}`, limit:'1'});
  const p = profiles[0];
  if (!p || !p.active || p.email?.toLowerCase() !== auth.email.toLowerCase()) throw new ApiError('FORBIDDEN', 'Tài khoản chưa được phân vai trò hoặc đã khóa.', 403);
  return { authUid: auth.id, code:p.user_code, email:auth.email, name:p.display_name, role:p.role, branch:p.branch_id, dept:p.department_id };
}
/** Supabase AI snapshot is not the official approval ledger; restrict analysis by current stage. */
export function canSeeRequest(identity, row) {
  if (identity.role === 'admin') return false;
  if (identity.role === 'requester') return row.owner_auth_uid === identity.authUid;
  if (row.owner_auth_uid === identity.authUid) return true;
  if (row.status === 'DRAFT') return false;
  if (identity.role !== 'bod' && identity.branch !== row.branch_id) return false;
  if (identity.role === 'procurement' || identity.role === 'accountant')
    return ['APPROVED','IN_PROGRESS','COMPLETED'].includes(row.status);
  if (identity.role === 'dept_head')
    return identity.dept === row.department_id && (row.status === 'PENDING_DEPT' ||
      (row.status === 'PENDING_FINAL' && Number(row.amount) < 10_000_000));
  if (identity.role === 'finance') return row.status === 'PENDING_FINANCE';
  if (identity.role === 'branch_director') return row.status === 'PENDING_FINAL' &&
    Number(row.amount) >= 10_000_000 && Number(row.amount) < 50_000_000;
  if (identity.role === 'bod') return row.status === 'PENDING_FINAL' && Number(row.amount) >= 50_000_000;
  return false;
}
export function canAnalyzeApproval(identity, row) {
  return ['dept_head','finance','branch_director','bod'].includes(identity.role) &&
    row.owner_auth_uid !== identity.authUid && canSeeRequest(identity,row);
}
export function canSeeBudgets(identity) { return ['finance','bod'].includes(identity.role); }
export async function table(name, query = {}, {method='GET', body, upsert=false} = {}) {
  const {url,serviceKey} = env();
  const p = new URL(`${url}/rest/v1/${name}`);
  Object.entries(query).forEach(([k,v])=>p.searchParams.set(k,String(v)));
  const res = await fetch(p.toString(), {
    method,
    headers: {
      apikey: serviceKey,
      // Supabase sb_secret_ keys are opaque (not JWT). Never send them as Bearer.
      // Legacy service_role JWTs still use Authorization for compatibility.
      ...(!serviceKey.startsWith('sb_secret_') ? { Authorization: `Bearer ${serviceKey}` } : {}),
      'Content-Type': 'application/json',
      Prefer: upsert ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
    },
    body:body === undefined ? undefined : JSON.stringify(body),signal:AbortSignal.timeout(API_TIMEOUT),
  });
  const data=await parse(res);
  if (!res.ok) {
    console.error('[Supabase]',name,res.status,data?.code || data?.message);
    // Only expose vetted, server-authored SQL business errors from V13 RPC.
    if (name==='rpc/procure_v13_mutate' && ['42501','23514','23503','23505','22023'].includes(data?.code)) {
      const http=data.code==='42501'?403:(data.code==='22023'?400:409);
      throw new ApiError('BUSINESS_RULE',String(data.message||'Không thể thực hiện nghiệp vụ.').slice(0,300),http);
    }
    throw new ApiError('DATABASE_ERROR','Không truy xuất được dữ liệu trên máy chủ.',503);
  }
  return data;
}
export async function takeRateSlot(uid) {
  const data = await table('rpc/procure_ai_take_slot', {}, {method:'POST', body:{p_uid:uid,p_max:10}});
  if (data !== true) throw new ApiError('RATE_LIMITED', 'Bạn đã sử dụng AI nhiều lần; vui lòng thử sau ít phút.',429);
}
