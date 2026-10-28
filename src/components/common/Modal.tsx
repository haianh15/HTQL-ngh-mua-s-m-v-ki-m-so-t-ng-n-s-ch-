/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Accessible Modal and ConfirmDialog Component
 */

import React, { useEffect, useRef } from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-3xl',
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202039]/50 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className={`bg-white border border-[#DDE0EA] rounded-[16px] shadow-[0_8px_30px_rgba(32,32,57,0.12)] w-full ${maxWidthClasses} overflow-hidden max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDE0EA]">
          <h2 id="modal-title" className="text-lg font-bold text-[#202039] m-0">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#62657A] hover:text-[#202039] p-1.5 rounded-[6px] hover:bg-[#F7F8FC] cursor-pointer"
            aria-label="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  requiresReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonValue?: string;
  onReasonChange?: (val: string) => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  variant = 'danger',
  isLoading = false,
  requiresReason = false,
  reasonLabel = 'Lý do bắt buộc',
  reasonPlaceholder = 'Vui lòng nêu rõ lý do…',
  reasonValue = '',
  onReasonChange,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="space-y-4">
        <p className="text-sm text-[#62657A] m-0">{message}</p>

        {requiresReason && (
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#202039] block">
              {reasonLabel} <span className="text-[#B42336]">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reasonValue}
              onChange={(e) => onReasonChange?.(e.target.value)}
              placeholder={reasonPlaceholder}
              className="w-full text-sm border border-[#DDE0EA] rounded-[10px] p-3 focus:outline-none focus:border-[#5540C7]"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DDE0EA]">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={requiresReason && !reasonValue.trim()}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
