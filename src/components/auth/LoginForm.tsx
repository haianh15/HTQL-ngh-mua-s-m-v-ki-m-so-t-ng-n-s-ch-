/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Login Screen (AUTH-01, UC-XT01)
 * Tuân thủ Design System: #5540C7, #F7F8FC, không gradient tối, phông Inter
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { Eye, EyeOff, Lock, Mail, ShieldAlert } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { login, navigateTo } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();setErrorMessage('');setIsLoading(true);
    try {const res=await login(email,password);
      if(!res.success){setErrorMessage(res.error||'Đăng nhập không thành công.');setPassword('');}
    }catch{setErrorMessage('Không kết nối được dịch vụ đăng nhập.');}
    finally{setIsLoading(false);}
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand */}
        <div className="text-3xl font-extrabold tracking-tight text-[#202039] select-none">
          procure<span className="text-[#5540C7]"> UI</span>
        </div>
        <div className="text-xs font-semibold text-[#62657A] tracking-wider uppercase mt-1">
          Hệ thống Quản lý Đề nghị Mua sắm & Kiểm soát Ngân sách
        </div>
        <p className="mt-2 text-xs text-[#62657A]">
          Áp dụng cho 01 Trụ sở chính & 05 Chi nhánh (600 CBNV)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-[0_4px_20px_rgba(32,32,57,0.06)] border border-[#DDE0EA] rounded-[16px] sm:px-10">
          <h2 className="text-xl font-bold text-[#202039] mb-1">Đăng nhập hệ thống</h2>
          <p className="text-xs text-[#62657A] mb-6">
            Nhập tài khoản email công ty và mật khẩu để tiếp tục.
          </p>

          {errorMessage && (
            <Alert variant="red" className="mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#B42336] flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-[#202039] mb-1">
                Email công việc <span className="text-[#B42336]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#62657A]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten.nguoidung@procure.vn"
                  className="w-full min-h-[44px] pl-10 pr-3 py-2 text-sm bg-white border border-[#DDE0EA] rounded-[10px] text-[#202039] focus:outline-none focus:border-[#5540C7] focus:ring-1 focus:ring-[#5540C7]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-sm font-semibold text-[#202039]">
                  Mật khẩu <span className="text-[#B42336]">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigateTo('AUTH_FORGOT_PW')}
                  className="text-xs font-semibold text-[#5540C7] hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#62657A]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] pl-10 pr-10 py-2 text-sm bg-white border border-[#DDE0EA] rounded-[10px] text-[#202039] focus:outline-none focus:border-[#5540C7] focus:ring-1 focus:ring-[#5540C7]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#62657A] hover:text-[#202039]"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Đăng nhập hệ thống
            </Button>
          </form>

          <div className="text-xs rounded-[10px] bg-[#EBF2FF] text-[#2459AB] p-3 mt-4">
            <strong>Đăng nhập máy chủ:</strong> Dùng tài khoản đã được tạo trong Supabase Auth và được gán quyền tại bảng <code>procure_ai_profiles</code>. Mật khẩu demo cũ không còn hoạt động.
          </div>
        </div>
      </div>
    </div>
  );
};
