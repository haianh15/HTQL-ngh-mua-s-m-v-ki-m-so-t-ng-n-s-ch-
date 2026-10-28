/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Forgot Password Screen (AUTH-03, UC-XT03)
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordModal: React.FC = () => {
  const { requestPasswordReset, navigateTo } = useApp();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      requestPasswordReset(email);
      setIsSubmitted(true);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-[0_4px_20px_rgba(32,32,57,0.06)] border border-[#DDE0EA] rounded-[16px] sm:px-10">
          <div className="w-12 h-12 rounded-full bg-[#F0EDFF] text-[#5540C7] flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-[#202039] text-center mb-1">
            Khôi phục mật khẩu
          </h2>
          <p className="text-xs text-[#62657A] text-center mb-6">
            Nhập email công vụ của bạn. Chúng tôi sẽ gửi đường dẫn đặt lại mật khẩu an toàn.
          </p>

          {isSubmitted ? (
            <div className="space-y-4 text-center">
              <Alert variant="green">
                <div className="flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 text-[#176B49] flex-shrink-0" />
                  <span>
                    Nếu email <strong>{email}</strong> tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hòm thư của bạn.
                  </span>
                </div>
              </Alert>

              <p className="text-xs text-[#62657A]">
                Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam) trong vòng 5 phút.
              </p>

              <Button
                variant="primary"
                className="w-full mt-4"
                onClick={() => navigateTo('AUTH_LOGIN')}
              >
                Quay lại trang Đăng nhập
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-semibold text-[#202039] mb-1">
                  Email công việc <span className="text-[#B42336]">*</span>
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten.nguoidung@procure.vn"
                  className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-[#DDE0EA] rounded-[10px] text-[#202039] focus:outline-none focus:border-[#5540C7]"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Gửi yêu cầu khôi phục
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigateTo('AUTH_LOGIN')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#62657A] hover:text-[#202039]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại trang Đăng nhập</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
