/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Button Component
 */

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'normal' | 'small';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'normal',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-semibold transition-colors select-none focus-visible:outline-2 focus-visible:outline-[#2459AB] focus-visible:outline-offset-2';

  const sizeClasses =
    size === 'small'
      ? 'min-h-[32px] px-3 py-1 text-xs rounded-[8px]'
      : 'min-h-[40px] px-4 py-2 text-sm rounded-[10px]';

  let variantClasses = '';
  switch (variant) {
    case 'primary':
      variantClasses =
        'bg-[#5540C7] text-white hover:bg-[#4430AA] active:bg-[#382696] shadow-sm disabled:bg-[#5540C7]/40';
      break;
    case 'secondary':
      variantClasses =
        'bg-white text-[#202039] border border-[#DDE0EA] hover:bg-[#F7F8FC] active:bg-[#EFF0F5] disabled:opacity-45';
      break;
    case 'ghost':
      variantClasses =
        'bg-transparent text-[#5540C7] hover:bg-[#F0EDFF] active:bg-[#E4DDFB] disabled:opacity-45';
      break;
    case 'danger':
      variantClasses =
        'bg-[#B42336] text-white hover:bg-[#971b2c] active:bg-[#801423] disabled:opacity-45';
      break;
  }

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${
        disabled || isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          <span>Đang xử lý…</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
