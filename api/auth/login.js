import { ApiError, errorResponse, limitedBody, requirePost, send } from '../../server/lib/http.js';
import { table } from '../../server/lib/supabase.js';

// A single browser request: Supabase password authentication + profile lookup.
// Never accept user id, role, or department from the browser.
export default async function login(req, res) {
  try {
    requirePost(req);
    res.setHeader('Cache-Control', 'no-store, private');
    const { email, password } = limitedBody(req, 2_000);
    if (typeof email !== 'string' || email.trim().length > 254 || !/^\S+@\S+\.\S+$/.test(email.trim()) ||
        typeof password !== 'string' || password.length < 1 || password.length > 256)
      throw new ApiError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không hợp lệ.', 400);
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const anon = process.env.SUPABASE_ANON_KEY;
    if (!url || !anon || !process.env.SUPABASE_SERVICE_ROLE_KEY)
      throw new ApiError('SETUP_REQUIRED', 'Chưa cấu hình Supabase cho backend.', 503);

    let authRes;
    try {
      authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anon },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: AbortSignal.timeout(13_000),
      });
    } catch {
      throw new ApiError('AUTH_UNAVAILABLE', 'Máy chủ xác thực phản hồi quá lâu. Vui lòng thử lại.', 504);
    }
    if (authRes.status === 429)
      throw new ApiError('AUTH_RATE_LIMITED', 'Bạn đã đăng nhập quá nhiều lần. Vui lòng thử lại sau.', 429);
    if (!authRes.ok)
      throw new ApiError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.', 401);
    const auth = await authRes.json();
    const uid = auth.user?.id;
    const authenticatedEmail = auth.user?.email;
    if (!uid || !authenticatedEmail || !auth.access_token || !auth.refresh_token)
      throw new ApiError('INVALID_AUTH_RESPONSE', 'Không xác minh được tài khoản.', 502);

    // Only the server-service-role can access the private profiles table.
    const profiles = await table('procure_ai_profiles', {
      select: 'auth_uid,user_code,email,display_name,role,branch_id,department_id,active',
      auth_uid: `eq.${uid}`, limit: '1',
    });
    const profile = profiles[0];
    if (!profile?.active || profile.email?.toLowerCase() !== authenticatedEmail.toLowerCase())
      throw new ApiError('FORBIDDEN', 'Tài khoản chưa được phân vai trò hoặc đã khóa.', 403);
    return send(res, 200, {
      session: {
        access_token: auth.access_token,
        refresh_token: auth.refresh_token,
        expires_at: auth.expires_at,
        expires_in: auth.expires_in,
      },
      profile: {
        id: profile.user_code,
        name: profile.display_name,
        email: authenticatedEmail,
        roles: [profile.role],
        branchId: profile.branch_id,
        departmentId: profile.department_id,
        isActive: true,
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}
