/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — MFA / OTP Screen (AUTH-02, UC-XT02)
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { KeyRound, ArrowLeft } from 'lucide-react';

export const OTPModal: React.FC = () => {
  const { mfaPendingUser, verifyMfa, logout, addToast } = useApp();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(120);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  const handleDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    // Auto focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().slice(0, 6);
    if (/^\d+$/.test(pasted)) {
      const digits = pasted.split('');
      const newOtp = [...otp];
      digits.forEach((d, idx) => {
        if (idx < 6) newOtp[idx] = d;
      });
      setOtp(newOtp);
      const lastIdx = Math.min(digits.length, 5);
      document.getElementById(`otp-input-${lastIdx}`)?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otp.join('');
    if (fullCode.length !== 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã xác thực.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsLoading(false);
      const success = verifyMfa(fullCode);
      if (!success) {
        setErrorMsg('Mã OTP không chính xác hoặc đã hết hạn.');
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-input-0')?.focus();
      }
    }, 400);
  };

  const handleResend = () => {
    setCountdown(120);
    setOtp(['', '', '', '', '', '']);
    setErrorMsg('');
    addToast('Đã gửi lại mã OTP mới qua email công vụ (Mã thử nghiệm: 123456)', 'info');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-[0_4px_20px_rgba(32,32,57,0.06)] border border-[#DDE0EA] rounded-[16px] sm:px-10">
          <div className="w-12 h-12 rounded-full bg-[#F0EDFF] text-[#5540C7] flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-[#202039] text-center mb-1">
            Xác thực hai yếu tố (MFA / OTP)
          </h2>
          <p className="text-xs text-[#62657A] text-center mb-6">
            Vai trò quản lý / phê duyệt yêu cầu xác thực 2 lớp. Mã xác nhận đã gửi tới{' '}
            <strong className="text-[#202039]">{mfaPendingUser?.email}</strong> (demo: mã <code>123456</code>, không gửi email thực).
          </p>

          {errorMsg && (
            <Alert variant="red" className="mb-4">
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-between gap-2" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-12 h-14 text-center text-xl font-bold text-[#202039] bg-white border border-[#DDE0EA] rounded-[10px] focus:outline-none focus:border-[#5540C7] focus:ring-2 focus:ring-[#F0EDFF]"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-[#62657A]">
              <span>
                {countdown > 0 ? (
                  <>
                    Mã hết hạn sau: <strong className="text-[#5540C7]">{countdown}s</strong>
                  </>
                ) : (
                  <span className="text-[#B42336]">Mã đã hết hạn</span>
                )}
              </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 60}
                className="font-semibold text-[#5540C7] hover:underline disabled:opacity-40 disabled:no-underline"
              >
                Gửi lại mã
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
              disabled={otp.join('').length !== 6}
            >
              Xác nhận & Vào hệ thống
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#62657A] hover:text-[#202039]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại trang đăng nhập</span>
              </button>
            </div>
          </form>

          <div className="mt-6 p-3 rounded-[8px] bg-[#F7F8FC] border border-[#DDE0EA] text-[11px] text-[#62657A] text-center">
            💡 Gợi ý thử nghiệm: Nhập bất kỳ 6 chữ số nào (ví dụ <code className="font-bold text-[#5540C7]">123456</code>) để vượt qua xác thực MFA.
          </div>
        </div>
      </div>
    </div>
  );
};
