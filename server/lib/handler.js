import {ApiError, errorResponse} from './http.js';
import {requireIdentity, takeRateSlot} from './supabase.js';
export function withAuth(handler,{rateLimit=true}={}) {return async(req,res)=>{try {
  res.setHeader('Cache-Control','no-store, private');
  if(req.method === 'OPTIONS')return res.status(405).end();
  const identity=await requireIdentity(req);
  if(rateLimit)await takeRateSlot(identity.authUid);
  return await handler(req,res,identity);
} catch (error) {return errorResponse(res,error);} };}
export function deny(message='Bạn không có quyền sử dụng chức năng này.') {throw new ApiError('FORBIDDEN',message,403);}
