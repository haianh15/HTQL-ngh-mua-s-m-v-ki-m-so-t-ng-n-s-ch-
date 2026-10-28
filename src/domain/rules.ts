/** Pure domain rules shared by the demo UI and executable regression tests.
 * This browser prototype is NOT a server-side financial transaction engine. */
import type { BudgetPool, PurchaseRequest, Delegation, User, PRItem } from '../types';
export const DEMO_PASSWORD = 'Procure@2026';
export const DEMO_OTP = '123456';
export const availableBudget = (b: BudgetPool): number =>
  b.allocated + (b.adjustments || 0) - b.held - b.committed - b.used;
export const roundMoney = (amount: number): number => Math.round(amount);
export function isValidAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0 && Number.isSafeInteger(value);
}
export function sumItems(items: PRItem[]): number {
  return items.reduce((sum, item) => sum + item.totalPrice, 0);
}
export function isValidPRItems(items: PRItem[]): boolean {
  return items.length > 0 && items.every((i) =>
    i.name.trim().length > 0 && Number.isSafeInteger(i.quantity) && i.quantity > 0 &&
    Number.isSafeInteger(i.unitPrice) && i.unitPrice > 0 &&
    Number.isFinite(i.taxRate) && i.taxRate >= 0 && i.taxRate <= 100 &&
    i.totalPrice === Math.round(i.quantity * i.unitPrice * (1 + i.taxRate / 100))
  );
}
export function heldForRequest(pr: PurchaseRequest): number {
  const committed = pr.execution?.actualOrderedAmount || 0;
  const released = pr.execution?.releasedAmount || 0;
  return Math.max(0, (pr.versions.find(v => v.versionNumber === pr.effectiveVersion)?.totalAmount ?? pr.totalAmount) - committed - released);
}
export function eligibleDelegation(user: User, pr: PurchaseRequest, role: string, ds: Delegation[], at = new Date()): boolean {
  const dateKey = (d: string) => {
    const parts = d.split('/');
    return parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}` : d.slice(0,10);
  };
  const today = at.toISOString().slice(0,10);
  return ds.some(d => d.isActive && d.toUserId === user.id && d.role === role &&
    dateKey(d.startDate) <= today && dateKey(d.endDate) >= today &&
    (!d.scopeBranchId || d.scopeBranchId === pr.branchId) &&
    (!d.scopeDeptId || d.scopeDeptId === pr.departmentId) &&
    (!d.maxAmountLimit || pr.totalAmount <= d.maxAmountLimit));
}
export function canApproveStep(user: User | null, pr: PurchaseRequest, ds: Delegation[]): boolean {
  if (!user || !user.isActive || user.id === pr.createdById) return false;
  if (!['PENDING_DEPT','PENDING_FINANCE','PENDING_FINAL'].includes(pr.status)) return false;
  const step = pr.approvalTimeline[pr.currentStepIndex];
  if (!step || step.status !== 'PENDING') return false;
  const direct = user.roles.includes(step.assignedRole) &&
    (user.branchId === pr.branchId || user.roles.includes('bod')) &&
    (step.assignedRole !== 'dept_head' || user.departmentId === pr.departmentId);
  return direct || eligibleDelegation(user, pr, step.assignedRole, ds);
}
export function canSeeBranch(user: User | null, branchId: string): boolean {
  if (!user || !user.isActive) return false;
  if (user.roles.includes('bod')) return true;
  return user.branchId === branchId;
}
export function reserveBudget(budget: BudgetPool, amount: number): BudgetPool {
  if (!isValidAmount(amount) || availableBudget(budget) < amount) throw new Error('Không đủ ngân sách khả dụng.');
  return { ...budget, held: budget.held + amount };
}
/** Convert one part of the hold to a commitment. Any remaining hold stays held. */
export function commitBudget(budget: BudgetPool, amount: number, remainingHeldForPR: number): BudgetPool {
  if (!isValidAmount(amount) || amount > remainingHeldForPR || amount > budget.held)
    throw new Error('Giá trị cam kết vượt phần ngân sách đang giữ.');
  return { ...budget, held: budget.held - amount, committed: budget.committed + amount };
}
export function recognizeExpense(budget: BudgetPool, amount: number, remainingCommitment: number): BudgetPool {
  if (!isValidAmount(amount) || amount > remainingCommitment || amount > budget.committed)
    throw new Error('Số tiền kế toán vượt cam kết chưa ghi nhận.');
  return { ...budget, committed: budget.committed - amount, used: budget.used + amount };
}
export function releaseHold(budget: BudgetPool, amount: number, remainingHeldForPR: number): BudgetPool {
  if (!isValidAmount(amount) || amount > remainingHeldForPR || amount > budget.held)
    throw new Error('Số tiền giải phóng vượt phần đang giữ của hồ sơ.');
  return { ...budget, held: budget.held - amount };
}
export function transferBudget(from: BudgetPool, to: BudgetPool, amount: number): [BudgetPool, BudgetPool] {
  if (from.id === to.id || !isValidAmount(amount) || availableBudget(from) < amount)
    throw new Error('Nguồn chuyển không hợp lệ hoặc không đủ khả dụng.');
  return [
    { ...from, adjustments: (from.adjustments || 0) - amount },
    { ...to, adjustments: (to.adjustments || 0) + amount },
  ];
}

// Các quyền hiển thị là quy định tách biệt với bước phê duyệt nghiệp vụ.
// Chỉ BOD/Tổng Giám đốc được xem toàn bộ HQ và năm chi nhánh.
export function canViewAllRegions(user: User | null): boolean {
  return !!user?.isActive && user.roles.includes('bod');
}
export function canViewDashboard(user: User | null): boolean {
  return !!user?.isActive && user.roles.some(r =>
    ['bod', 'branch_director', 'finance', 'procurement', 'accountant'].includes(r)
  );
}
export function canReadRequest(user: User | null, pr: PurchaseRequest): boolean {
  if (!user?.isActive || !canSeeBranch(user, pr.branchId)) return false;
  if (user.roles.includes('bod')) return true;
  if (user.roles.includes('branch_director')) return true; // Chỉ chi nhánh được giao
  if (user.roles.some(r => ['finance', 'procurement', 'accountant'].includes(r))) return true;
  if (user.roles.includes('dept_head')) return pr.departmentId === user.departmentId || pr.createdById === user.id;
  if (user.roles.includes('requester')) return pr.createdById === user.id;
  return false; // admin không được tự động đọc hồ sơ của nhân viên
}
export type ProtectedScreen =
  | 'DASHBOARD' | 'PR_LIST' | 'PR_CREATE' | 'PR_EDIT' | 'PR_DETAIL'
  | 'APPROVAL_QUEUE' | 'EXECUTION_LIST' | 'BUDGET_OVERVIEW' | 'BUDGET_TRANSFERS'
  | 'BUDGET_WAITING_PR' | 'RECONCILIATION_IMPORT' | 'REPORTS' | 'NOTIFICATIONS'
  | 'ADMIN_MANAGEMENT' | 'FORBIDDEN_403' | 'AUTH_LOGIN' | 'AUTH_MFA' | 'AUTH_FORGOT_PW';
export function canAccessScreen(user: User | null, screen: ProtectedScreen): boolean {
  if (!user?.isActive) return false;
  if (screen === 'FORBIDDEN_403' || screen === 'NOTIFICATIONS') return true;
  if (screen === 'ADMIN_MANAGEMENT') return user.roles.includes('admin');
  if (screen === 'DASHBOARD') return canViewDashboard(user);
  if (['BUDGET_OVERVIEW', 'BUDGET_TRANSFERS', 'BUDGET_WAITING_PR'].includes(screen))
    return user.roles.some(r => ['bod', 'finance'].includes(r));
  if (screen === 'REPORTS') return user.roles.some(r => ['bod', 'finance', 'accountant', 'procurement', 'branch_director'].includes(r));
  if (screen === 'EXECUTION_LIST') return user.roles.some(r => ['procurement', 'finance', 'bod'].includes(r));
  if (screen === 'RECONCILIATION_IMPORT') return user.roles.some(r => ['accountant', 'finance', 'bod'].includes(r));
  if (screen === 'APPROVAL_QUEUE') return user.roles.some(r => ['dept_head', 'branch_director', 'finance', 'bod'].includes(r));
  if (['PR_LIST', 'PR_DETAIL'].includes(screen)) return !user.roles.every(r => r === 'admin');
  if (['PR_CREATE', 'PR_EDIT'].includes(screen)) return user.roles.some(r =>
    ['requester', 'dept_head', 'branch_director', 'finance', 'procurement', 'accountant', 'bod'].includes(r)
  );
  return false;
}
export function defaultScreenFor(user: User): ProtectedScreen {
  if (user.roles.includes('admin') && user.roles.length === 1) return 'ADMIN_MANAGEMENT';
  if (user.roles.includes('requester') && user.roles.length === 1) return 'PR_LIST';
  if (user.roles.includes('dept_head') && !user.roles.some(r => ['bod','branch_director','finance'].includes(r))) return 'APPROVAL_QUEUE';
  return canViewDashboard(user) ? 'DASHBOARD' : 'PR_LIST';
}
