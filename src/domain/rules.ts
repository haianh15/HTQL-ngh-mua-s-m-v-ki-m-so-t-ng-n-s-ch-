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
    (user.branchId === pr.branchId || (user.branchId === 'HQ' && ['finance','bod','admin'].some(r => user.roles.includes(r as any)))) &&
    (step.assignedRole !== 'dept_head' || user.departmentId === pr.departmentId);
  return direct || eligibleDelegation(user, pr, step.assignedRole, ds);
}
export function canSeeBranch(user: User | null, branchId: string): boolean {
  if (!user || !user.isActive) return false;
  if (user.roles.includes('admin') || user.roles.includes('bod')) return true;
  if (user.branchId === 'HQ' && user.roles.some(r => ['finance','procurement','accountant'].includes(r))) return true;
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
