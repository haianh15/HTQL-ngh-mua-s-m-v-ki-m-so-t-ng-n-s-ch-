/** Pure domain rules shared by the demo UI and executable regression tests.
 * This browser prototype is NOT a server-side financial transaction engine. */
import type { BudgetPool, PurchaseRequest, Delegation, User, PRItem, ApprovalDecision } from '../types';
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
  const step = pr.approvalTimeline[pr.currentStepIndex];
  if (!step || step.assignedRole !== role) return false;
  return ds.some(d => d.isActive && d.toUserId === user.id && d.role === role &&
    // Ủy quyền phải đúng từ người được phân công phiếu này, không phải bất kỳ ai cùng vai trò.
    (step.assignedToUserId ? d.fromUserId === step.assignedToUserId :
      !!step.assignedToName && d.fromUserName?.trim() === step.assignedToName.trim()) &&
    dateKey(d.startDate) <= today && dateKey(d.endDate) >= today &&
    (!d.scopeBranchId || d.scopeBranchId === pr.branchId) &&
    (!d.scopeDeptId || d.scopeDeptId === pr.departmentId) &&
    (!d.maxAmountLimit || pr.totalAmount <= d.maxAmountLimit));
}
export function canApproveStep(user: User | null, pr: PurchaseRequest, ds: Delegation[]): boolean {
  if (!user || !canAccessScreen(user,'APPROVAL_QUEUE') || !canSeeBranch(user,pr.branchId) || user.id === pr.createdById) return false;
  if (!['PENDING_DEPT','PENDING_FINANCE','PENDING_FINAL'].includes(pr.status)) return false;
  const step = pr.approvalTimeline[pr.currentStepIndex];
  if (!step || step.status !== 'PENDING') return false;
  // Không cho tất cả người giữ cùng vai trò xem/duyệt một hồ sơ được giao cho người khác.
  // Với dữ liệu cũ chưa có ID, chỉ chấp nhận tên đã phân công; không phân công thì không mở rộng quyền.
  const assignedToMe = step.assignedToUserId
    ? step.assignedToUserId === user.id
    : step.assignedToEmail
      ? step.assignedToEmail.toLowerCase() === user.email?.toLowerCase()
      : step.assignedToName
        ? !step.assignedToName.includes('chờ phân công') &&
          step.assignedToName.trim().toLocaleLowerCase('vi') === user.name?.trim().toLocaleLowerCase('vi')
        : false; // Chưa có người được phân công thì không tự mở rộng quyền.
  const direct = primaryRole(user) === step.assignedRole &&
    canSeeBranch(user,pr.branchId) && assignedToMe &&
    (step.assignedRole !== 'dept_head' || user.departmentId === pr.departmentId);
  return direct || eligibleDelegation(user, pr, step.assignedRole, ds);
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

// Một không gian tác nghiệp chính cho mỗi phiên. Deny-by-default cho tài khoản
// bị trùng vai trò; requester/admin không được kế thừa quyền tài chính do dữ liệu demo cũ.
export type ActorRole = User['roles'][number];
export function primaryRole(user: User | null): ActorRole | null {
  if (!user?.isActive || !Array.isArray(user.roles) || !user.roles.length) return null;
  if (user.roles.includes('requester')) return 'requester';
  if (user.roles.includes('admin')) return 'admin';
  for (const r of ['bod','branch_director','finance','procurement','accountant','dept_head'] as ActorRole[])
    if (user.roles.includes(r)) return r;
  return null;
}
export function isRequesterRole(user: User | null): boolean { return primaryRole(user) === 'requester'; }
export function canViewAllRegions(user: User | null): boolean { return primaryRole(user) === 'bod'; }
export function canSeeBranch(user: User | null, branchId: string): boolean {
  return !!branchId && (primaryRole(user)==='bod' || (!!primaryRole(user) && user!.branchId===branchId));
}
export function canViewDashboard(user: User | null): boolean {
  return ['bod','branch_director','finance','procurement','accountant'].includes(primaryRole(user) || '');
}
export function canSeeFinancialFigures(user: User | null): boolean {
  return ['bod','branch_director','finance','accountant'].includes(primaryRole(user) || '');
}
export function canReadBudget(user: User | null, budget: BudgetPool): boolean {
  return canSeeFinancialFigures(user) && canSeeBranch(user,budget.branchId);
}
/** Quyền xem đề nghị của người duyệt luôn đi cùng bước duyệt hiện tại, không theo chức vụ chung. */
export function canReadRequest(user: User | null, pr: PurchaseRequest, delegations: Delegation[] = []): boolean {
  const role = primaryRole(user);
  if (!role || role === 'admin') return false;
  if (pr.createdById === user!.id) return true; // Người tạo theo dõi phiếu của chính mình.
  if (role === 'requester' || pr.status === 'DRAFT') return false;
  if (!canSeeBranch(user, pr.branchId)) return false;
  if (['dept_head', 'finance', 'branch_director', 'bod'].includes(role))
    return canApproveStep(user, pr, delegations);
  // Mua hàng, kế toán chỉ xử lý phiếu đã duyệt ở chi nhánh được phân công.
  if (role === 'procurement' || role === 'accountant')
    return ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(pr.status);
  return false;
}
/** Tuyến duyệt theo tác nhân lập phiếu. Không lặp bước Trưởng phòng cho cấp khác. */
export function buildApprovalTimeline(creator: User, amount: number, users: User[]): ApprovalDecision[] {
  const role = primaryRole(creator);
  if (!role || !['requester','finance','branch_director','bod'].includes(role))
    throw new Error('Vai trò này không được cấp quyền lập đề nghị.');
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Giá trị đề nghị không hợp lệ.');

  const steps: ApprovalDecision[] = [];
  const available = (r: ActorRole, sameBranch = true) => users.find(u =>
    u.isActive && u.id !== creator.id && primaryRole(u) === r &&
    (!sameBranch || u.branchId === creator.branchId) &&
    (r !== 'dept_head' || u.departmentId === creator.departmentId));

  if (role === 'requester') {
    const head = available('dept_head');
    steps.push({ step:'DEPT_CONFIRMATION', stepName:'Trưởng phòng xác nhận nhu cầu',
      assignedRole:'dept_head', assignedToUserId:head?.id, assignedToEmail:head?.email,
      assignedToName:head?.name || 'Trưởng phòng (chờ phân công)', status:'PENDING' });
  }

  const finance = available('finance');
  steps.push({ step:'FINANCE_CHECK', stepName: role === 'finance'
      ? 'Tài chính khác kiểm tra, duyệt đề nghị (không tự duyệt)'
      : 'Tài chính kiểm tra nguồn ngân sách',
    assignedRole:'finance', assignedToUserId:finance?.id, assignedToEmail:finance?.email,
    assignedToName:finance?.name || 'Tài chính khu vực (chờ phân công)', status:'PENDING' });

  // Ngưỡng duyệt cuối; dưới 10 triệu, phiếu do cấp khác lập kết thúc ở Tài chính,
  // không quay ngược lại Trưởng phòng. Phiếu nhân viên vẫn theo hạn mức BRD.
  let finalRole: ActorRole | null = amount >= 50_000_000 ? 'bod'
    : amount >= 10_000_000 ? 'branch_director'
    : role === 'requester' ? 'dept_head' : null;
  // Giám đốc chi nhánh tự lập phiếu: chuyển cấp cao hơn, không tự duyệt.
  if (finalRole === 'branch_director' && !available('branch_director'))
    finalRole = 'bod'; // Chưa có giám đốc vùng phù hợp hoặc người lập chính là người duyệt duy nhất: chuyển cấp cao hơn.
  if (finalRole) {
    const reviewer = available(finalRole, finalRole !== 'bod');
    steps.push({ step:'FINAL_APPROVAL',
      stepName: finalRole === 'bod' ? 'Ban Giám đốc phê duyệt'
        : finalRole === 'branch_director' ? 'Giám đốc chi nhánh / đơn vị phê duyệt'
        : 'Trưởng đơn vị phê duyệt theo hạn mức dưới 10 triệu',
      assignedRole: finalRole, assignedToUserId: reviewer?.id, assignedToEmail: reviewer?.email,
      assignedToName: reviewer?.name || `${finalRole} (chờ phân công người khác)`,
      status:'PENDING' });
  }
  return steps;
}

/** Trạng thái ứng với bước đang chờ thực sự, không dựa trên chỉ số cố định. */
export function statusForApprovalStep(steps: ApprovalDecision[], index = 0): PurchaseRequest['status'] {
  const step=steps[index];
  if (!step) throw new Error('Không có bước duyệt hợp lệ.');
  if (step.step === 'FINANCE_CHECK') return 'PENDING_FINANCE';
  if (step.step === 'DEPT_CONFIRMATION') return 'PENDING_DEPT';
  return 'PENDING_FINAL';
}

export function canManageBudget(user:User|null):boolean {return primaryRole(user)==='finance';}
export function canExecutePurchase(user:User|null):boolean {return primaryRole(user)==='procurement';}
export function canReconcile(user:User|null):boolean {return primaryRole(user)==='accountant';}
export function canManageUsers(user:User|null):boolean {return primaryRole(user)==='admin';}
export type ProtectedScreen =
  | 'DASHBOARD' | 'PR_LIST' | 'PR_CREATE' | 'PR_EDIT' | 'PR_DETAIL'
  | 'APPROVAL_QUEUE' | 'EXECUTION_LIST' | 'BUDGET_OVERVIEW' | 'BUDGET_TRANSFERS'
  | 'BUDGET_WAITING_PR' | 'RECONCILIATION_IMPORT' | 'REPORTS' | 'NOTIFICATIONS'
  | 'ADMIN_MANAGEMENT' | 'FORBIDDEN_403' | 'AUTH_LOGIN' | 'AUTH_MFA' | 'AUTH_FORGOT_PW';
// Quyền màn hình là nguồn duy nhất cho sidebar, router và các thao tác.
const ROLE_SCREENS: Record<ActorRole, readonly ProtectedScreen[]> = {
  requester:['PR_LIST','PR_CREATE','PR_EDIT','PR_DETAIL'],
  dept_head:['PR_LIST','PR_DETAIL','APPROVAL_QUEUE','NOTIFICATIONS'],
  finance:['DASHBOARD','PR_LIST','PR_CREATE','PR_EDIT','PR_DETAIL','APPROVAL_QUEUE','BUDGET_OVERVIEW','BUDGET_TRANSFERS','BUDGET_WAITING_PR','REPORTS','NOTIFICATIONS'],
  procurement:['DASHBOARD','PR_LIST','PR_DETAIL','EXECUTION_LIST','REPORTS','NOTIFICATIONS'],
  accountant:['DASHBOARD','PR_LIST','PR_DETAIL','RECONCILIATION_IMPORT','REPORTS','NOTIFICATIONS'],
  branch_director:['DASHBOARD','PR_LIST','PR_CREATE','PR_EDIT','PR_DETAIL','APPROVAL_QUEUE','REPORTS','NOTIFICATIONS'],
  bod:['DASHBOARD','PR_LIST','PR_CREATE','PR_EDIT','PR_DETAIL','APPROVAL_QUEUE','BUDGET_OVERVIEW','BUDGET_TRANSFERS','BUDGET_WAITING_PR','REPORTS','NOTIFICATIONS'],
  admin:['ADMIN_MANAGEMENT'],
};
export function canAccessScreen(user: User|null, screen:ProtectedScreen):boolean {
  const role=primaryRole(user);
  return !!role && (screen==='FORBIDDEN_403' || ROLE_SCREENS[role].includes(screen));
}
export function defaultScreenFor(user:User):ProtectedScreen {
  const role=primaryRole(user);
  if (role==='requester' || role==='dept_head') return role==='requester'?'PR_LIST':'APPROVAL_QUEUE';
  if (role==='admin') return 'ADMIN_MANAGEMENT';
  return canViewDashboard(user)?'DASHBOARD':'FORBIDDEN_403';
}
