/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Badge and Alert Components
 */

import React from 'react';

export type BadgeVariant = 'neutral' | 'purple' | 'green' | 'amber' | 'red' | 'blue';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = '',
}) => {
  const styles: Record<BadgeVariant, string> = {
    neutral: 'bg-[#EFF0F5] text-[#55586B]',
    purple: 'bg-[#F0EDFF] text-[#5540C7]',
    green: 'bg-[#E8F6EE] text-[#176B49]',
    amber: 'bg-[#FFF3D6] text-[#875000]',
    red: 'bg-[#FDECEF] text-[#B42336]',
    blue: 'bg-[#EBF2FF] text-[#2459AB]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold whitespace-nowrap ${styles[variant]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      {children}
    </span>
  );
};

interface AlertProps {
  variant?: 'green' | 'amber' | 'red' | 'blue';
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'amber',
  title,
  children,
  className = '',
  onClose,
}) => {
  const styles: Record<'green' | 'amber' | 'red' | 'blue', { border: string; bg: string; text: string }> = {
    green: {
      border: 'border-[#176B49]',
      bg: 'bg-[#E8F6EE]',
      text: 'text-[#176B49]',
    },
    amber: {
      border: 'border-[#875000]',
      bg: 'bg-[#FFF3D6]',
      text: 'text-[#875000]',
    },
    red: {
      border: 'border-[#B42336]',
      bg: 'bg-[#FDECEF]',
      text: 'text-[#B42336]',
    },
    blue: {
      border: 'border-[#2459AB]',
      bg: 'bg-[#EBF2FF]',
      text: 'text-[#2459AB]',
    },
  };

  const current = styles[variant];

  return (
    <div
      role={variant === 'red' ? 'alert' : 'status'}
      className={`border ${current.border} ${current.bg} ${current.text} rounded-[10px] p-3.5 mb-3 text-sm flex items-start justify-between gap-3 ${className}`}
    >
      <div className="flex-1">
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-current opacity-70 hover:opacity-100 p-0.5 text-xs font-bold"
          aria-label="Đóng thông báo"
        >
          ✕
        </button>
      )}
    </div>
  );
};
