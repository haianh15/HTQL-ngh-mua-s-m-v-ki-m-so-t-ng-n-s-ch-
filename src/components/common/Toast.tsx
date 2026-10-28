/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Toast Component
 */

import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-[420px] w-[calc(100%-32px)] pointer-events-none"
      role="region"
      aria-label="Thông báo hệ thống"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: () => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const borderLeft = {
    info: 'border-l-4 border-l-[#2459AB]',
    success: 'border-l-4 border-l-[#176B49]',
    warning: 'border-l-4 border-l-[#875000]',
    error: 'border-l-4 border-l-[#B42336]',
  }[toast.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto bg-[#202039] text-white text-sm px-4 py-3.5 rounded-[10px] shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex items-start justify-between gap-3 ${borderLeft}`}
    >
      <div className="flex-1 leading-snug">{toast.text}</div>
      <button
        onClick={onDismiss}
        className="text-[#DDE0EA] hover:text-white p-0.5 text-xs font-semibold cursor-pointer"
        aria-label="Đóng thông báo"
      >
        ✕
      </button>
    </div>
  );
};
