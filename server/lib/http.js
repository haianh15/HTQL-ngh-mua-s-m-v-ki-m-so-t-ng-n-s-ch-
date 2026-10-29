export function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
}
export class ApiError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
export function requirePost(req) {
  if (req.method !== 'POST') throw new ApiError('METHOD_NOT_ALLOWED', 'Chỉ hỗ trợ POST.', 405);
}
export function limitedBody(req, maxBytes = 50_000) {
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > maxBytes) throw new ApiError('PAYLOAD_TOO_LARGE', 'Dữ liệu yêu cầu quá lớn.', 413);
  let data;
  try {data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;} catch {throw new ApiError('INVALID_JSON','JSON yêu cầu không hợp lệ.');}
  if (!data || typeof data !== 'object' || Array.isArray(data) || Buffer.byteLength(JSON.stringify(data), 'utf8') > maxBytes) {
    throw new ApiError('INVALID_BODY', 'Dữ liệu không hợp lệ hoặc quá lớn.', 400);
  }
  return data;
}
export function errorResponse(res, error) {
  const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
  const status = error instanceof ApiError ? error.status : 500;
  if (status >= 500) console.error('[AI API]', code, error?.message);
  return send(res, status, { error: { code, message: error instanceof ApiError ? error.message : 'Máy chủ không xử lý được yêu cầu.' } });
}
export function asText(v, length = 500) { return typeof v === 'string' ? v.trim().slice(0, length) : ''; }
export function money(v) { return Number.isSafeInteger(v) && v >= 0 && v <= 1_000_000_000_000 ? v : null; }
