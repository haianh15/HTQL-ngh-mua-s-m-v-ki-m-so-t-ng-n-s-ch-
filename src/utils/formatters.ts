/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Formatting utilities complying with Procure UI Design System
 */

import { PRStatus } from '../types';

/**
 * Định dạng tiền tệ chuẩn VND: không có phần lẻ, phân cách hàng nghìn bằng dấu chấm, ký hiệu ₫
 * Ví dụ: 24.000.000 ₫
 */
export function formatVND(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0 ₫';
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('vi-VN').format(rounded);
  return `${formatted} ₫`;
}

/**
 * Định dạng số thông thường
 */
export function formatNumber(n: number): string {
  if (isNaN(n) || n === null || n === undefined) return '0';
  return new Intl.NumberFormat('vi-VN').format(n);
}

/**
 * Tính toán dung lượng file dễ đọc
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Định dạng Badge theo trạng thái đề nghị mua sắm (SRS)
 */
export function getPRStatusBadgeInfo(status: PRStatus): {
  label: string;
  badgeClass: 'neutral' | 'amber' | 'blue' | 'green' | 'purple' | 'red';
} {
  switch (status) {
    case 'DRAFT':
      return { label: 'Bản nháp', badgeClass: 'neutral' };
    case 'PENDING_DEPT':
      return { label: 'Chờ xác nhận', badgeClass: 'amber' };
    case 'PENDING_FINANCE':
      return { label: 'Chờ Tài chính', badgeClass: 'amber' };
    case 'PENDING_FINAL':
      return { label: 'Chờ duyệt cuối', badgeClass: 'amber' };
    case 'REVISION_REQUESTED':
      return { label: 'Cần bổ sung', badgeClass: 'blue' };
    case 'WAITING_FUNDS':
      return { label: 'Chờ nguồn', badgeClass: 'red' };
    case 'APPROVED':
      return { label: 'Đã duyệt', badgeClass: 'green' };
    case 'IN_PROGRESS':
      return { label: 'Đang thực hiện', badgeClass: 'purple' };
    case 'REJECTED':
      return { label: 'Từ chối', badgeClass: 'red' };
    case 'CANCELLED':
      return { label: 'Đã hủy', badgeClass: 'neutral' };
    case 'COMPLETED':
      return { label: 'Hoàn tất', badgeClass: 'green' };
    default:
      return { label: status, badgeClass: 'neutral' };
  }
}
