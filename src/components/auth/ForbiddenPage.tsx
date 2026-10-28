/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — 403 Forbidden Access Page (AUTH-06, UC-XT06)
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const ForbiddenPage: React.FC = () => {
  const { currentUser, navigateTo } = useApp();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-[#FDECEF] text-[#B42336] flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="text-sm font-bold tracking-widest uppercase text-[#B42336] mb-1">
        Lỗi 403 · Truy cập bị từ chối
      </div>

      <h1 className="text-2xl font-bold text-[#202039] mb-2">
        Bạn không có quyền truy cập chức năng này
      </h1>

      <p className="max-w-md text-sm text-[#62657A] mb-6">
        Tài khoản <strong>{currentUser?.name}</strong> (vai trò:{' '}
        <code className="text-[#5540C7] font-semibold">{currentUser?.roles.join(', ')}</code>) chưa được cấp quyền truy cập hoặc phạm vi chi nhánh không phù hợp với phân hệ này.
      </p>

      <div className="flex gap-3">
        <Button
          variant="primary"
          onClick={() => navigateTo('DASHBOARD')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Về trang Tổng quan của tôi
        </Button>
      </div>
    </div>
  );
};
