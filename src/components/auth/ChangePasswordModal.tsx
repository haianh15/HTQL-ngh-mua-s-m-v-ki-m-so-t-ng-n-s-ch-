/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Change Password Modal (AUTH-04, UC-XT04)
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { changePassword } = useApp();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPw.length < 12) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 12 ký tự.');
      return;
    }
    if (newPw !== confirmPw) {
      setErrorMsg('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    if (newPw === currentPw) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (changePassword(currentPw, newPw)) onClose();
      else setErrorMsg('Demo chưa có máy chủ xác thực, không thể đổi mật khẩu thật.');
    }, 400);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đổi mật khẩu tài khoản" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && <Alert variant="red">{errorMsg}</Alert>}

        <div>
          <label className="block text-sm font-semibold text-[#202039] mb-1">
            Mật khẩu hiện tại <span className="text-[#B42336]">*</span>
          </label>
          <input
            type="password"
            required
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 text-sm border border-[#DDE0EA] rounded-[10px] focus:outline-none focus:border-[#5540C7]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#202039] mb-1">
            Mật khẩu mới <span className="text-[#B42336]">*</span>
          </label>
          <input
            type="password"
            required
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 text-sm border border-[#DDE0EA] rounded-[10px] focus:outline-none focus:border-[#5540C7]"
          />
          <span className="text-xs text-[#62657A] mt-1 block">
            Tối thiểu 12 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
          </span>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#202039] mb-1">
            Xác nhận mật khẩu mới <span className="text-[#B42336]">*</span>
          </label>
          <input
            type="password"
            required
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 text-sm border border-[#DDE0EA] rounded-[10px] focus:outline-none focus:border-[#5540C7]"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DDE0EA]">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Hủy bỏ
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Cập nhật mật khẩu
          </Button>
        </div>
      </form>
    </Modal>
  );
};
