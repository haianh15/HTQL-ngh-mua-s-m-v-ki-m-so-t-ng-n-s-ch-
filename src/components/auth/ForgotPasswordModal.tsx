import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldAlert } from 'lucide-react';

export const ForgotPasswordModal: React.FC = () => {
  const { navigateTo } = useApp();
  return (
    <main className="min-h-screen bg-[#F7F8FC] flex items-center justify-center p-4">
      <section className="bg-white border border-[#DDE0EA] rounded-[16px] shadow-sm max-w-md w-full p-8 text-center space-y-4">
        <ShieldAlert className="w-9 h-9 text-[#5540C7] mx-auto" aria-hidden="true" />
        <h1 className="text-xl font-bold text-[#202039]">Khôi phục tài khoản</h1>
        <p className="text-sm text-[#62657A]">Vui lòng liên hệ quản trị viên hệ thống để được hỗ trợ đặt lại mật khẩu.</p>
        <button type="button" onClick={()=>navigateTo('AUTH_LOGIN')} className="px-4 py-2 rounded-[8px] bg-[#5540C7] text-white text-sm font-semibold">Quay lại đăng nhập</button>
      </section>
    </main>
  );
};
