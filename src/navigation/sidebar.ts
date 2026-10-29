/**
 * Điều hướng gọn theo nghiệp vụ. Không thay đổi quyền truy cập thực tế:
 * canAccessScreen() vẫn kiểm soát mọi màn hình và API/backend phải xác thực độc lập.
 */
import type { ActiveScreen } from '../types';

export type SidebarRole =
  | 'requester' | 'dept_head' | 'finance' | 'procurement'
  | 'accountant' | 'branch_director' | 'bod' | 'admin';
export type SidebarEntry = { id: ActiveScreen; label: string };
export type SidebarGroup = { group: string; entries: readonly SidebarEntry[] };

// Chỉ đặt các không gian làm việc thường xuyên lên thanh bên.
// Tạo đề nghị, báo cáo, chuyển nguồn, nhật ký và thông báo là hành động / trang con.
export const sidebarByRole: Record<SidebarRole, SidebarGroup> = {
  requester: { group: 'Công việc của tôi', entries: [
    { id: 'PR_LIST', label: 'Đề nghị của tôi' },
  ] },
  dept_head: { group: 'Phê duyệt', entries: [
    { id: 'APPROVAL_QUEUE', label: 'Chờ tôi duyệt' },
    { id: 'PR_LIST', label: 'Đề nghị liên quan' },
  ] },
  finance: { group: 'Tài chính – Ngân sách', entries: [
    { id: 'DASHBOARD', label: 'Tổng quan' },
    { id: 'APPROVAL_QUEUE', label: 'Chờ kiểm tra' },
    { id: 'BUDGET_OVERVIEW', label: 'Ngân sách' },
  ] },
  procurement: { group: 'Mua hàng', entries: [
    { id: 'DASHBOARD', label: 'Tổng quan' },
    { id: 'EXECUTION_LIST', label: 'Thực hiện mua sắm' },
  ] },
  accountant: { group: 'Kế toán', entries: [
    { id: 'DASHBOARD', label: 'Tổng quan' },
    { id: 'RECONCILIATION_IMPORT', label: 'Đối soát chứng từ' },
  ] },
  branch_director: { group: 'Điều hành chi nhánh', entries: [
    { id: 'DASHBOARD', label: 'Tổng quan' },
    { id: 'APPROVAL_QUEUE', label: 'Chờ tôi duyệt' },
  ] },
  bod: { group: 'Điều hành', entries: [
    { id: 'DASHBOARD', label: 'Tổng quan' },
    { id: 'APPROVAL_QUEUE', label: 'Chờ tôi duyệt' },
    { id: 'BUDGET_OVERVIEW', label: 'Ngân sách' },
  ] },
  admin: { group: 'Quản trị', entries: [
    { id: 'ADMIN_MANAGEMENT', label: 'Quản trị hệ thống' },
  ] },
};

/** Màn hình con được làm nổi bật theo không gian làm việc gần nhất. */
export function sidebarActiveScreen(screen: ActiveScreen): ActiveScreen {
  if (screen === 'PR_CREATE' || screen === 'PR_EDIT') return 'PR_LIST';
  if (screen === 'BUDGET_TRANSFERS' || screen === 'BUDGET_WAITING_PR') return 'BUDGET_OVERVIEW';
  return screen;
}
