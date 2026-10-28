/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Complete Application State Management
 * Implements TO-BE 01, 02, 03, BR01-BR12, SRS 34 Use Cases + AUTH-01..07
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  User,
  BranchCode,
  PurchaseRequest,
  BudgetPool,
  BudgetLedgerEntry,
  BudgetTransferRequest,
  Delegation,
  NotificationItem,
  AuditLogItem,
  ActiveScreen,
  AccountingImportBatch,
  AccountingImportRow,
  PRItem,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_BRANCHES,
  INITIAL_DEPARTMENTS,
  INITIAL_BUDGET_POOLS,
  INITIAL_PURCHASE_REQUESTS,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_TRANSFERS,
  INITIAL_DELEGATIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from '../data/initialData';
import { ToastMessage } from '../components/common/Toast';
import { DEMO_PASSWORD, DEMO_OTP, availableBudget, canSeeBranch, canApproveStep, canViewAllRegions, canReadRequest, canAccessScreen, defaultScreenFor, isValidPRItems, isValidAmount, reserveBudget, commitBudget, recognizeExpense, releaseHold, transferBudget, heldForRequest } from '../domain/rules';

interface AppContextType {
  // Auth state
  currentUser: User | null;
  isAuthenticated: boolean;
  mfaPendingUser: User | null;
  activeScreen: ActiveScreen;
  selectedPrId: string | null;
  currentBranchScope: BranchCode | 'ALL';
  isSessionExpired: boolean;

  // Data collections
  users: User[];
  budgetPools: BudgetPool[];
  purchaseRequests: PurchaseRequest[];
  ledgerEntries: BudgetLedgerEntry[];
  transfers: BudgetTransferRequest[];
  delegations: Delegation[];
  notifications: NotificationItem[];
  auditLogs: AuditLogItem[];
  accountingBatches: AccountingImportBatch[];

  // Toasts
  toasts: ToastMessage[];
  addToast: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  dismissToast: (id: string) => void;

  // Navigation
  navigateTo: (screen: ActiveScreen, prId?: string | null) => void;
  setBranchScope: (scope: BranchCode | 'ALL') => void;

  // Auth actions
  login: (email: string, password: string) => { success: boolean; requiresMfa?: boolean; error?: string };
  verifyMfa: (code: string) => boolean;
  logout: () => void;
  switchUserDemo: (userId: string) => void;
  requestPasswordReset: (email: string) => boolean;
  changePassword: (oldPw: string, newPw: string) => boolean;
  toggleUserActive: (userId: string) => void;
  updateUserRolesAndScope: (userId: string, roles: User['roles'], branchId: BranchCode) => void;

  // PR Actions (TO-BE 01)
  createPurchaseRequest: (data: Partial<PurchaseRequest>, items: PRItem[], isDraft?: boolean) => string;
  updateDraftPR: (prId: string, data: Partial<PurchaseRequest>, items: PRItem[], submitNow?: boolean) => boolean;
  submitDraftPR: (prId: string) => boolean;
  createPRRevision: (prId: string, newItems: PRItem[], changeSummary: string) => boolean;
  requestPRCancel: (prId: string, reason: string) => boolean;

  // Approval Actions (TO-BE 01)
  processApprovalDecision: (
    prId: string,
    stepIndex: number,
    decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
    comments?: string,
    reasonCode?: string
  ) => { success: boolean; error?: string };

  // Procurement Execution (TO-BE 02)
  receivePRForProcurement: (prId: string) => void;
  recordActualPOOrder: (
    prId: string,
    actualAmount: number,
    poRef: string,
    supplierName: string
  ) => void;
  releaseUncommittedRemainder: (prId: string, releaseAmount: number, reason: string) => void;

  // Accounting Import & Reconciliation (TO-BE 02, UI-08)
  importAccountingFile: (fileName: string, rows: AccountingImportRow[]) => string;
  commitAccountingBatch: (batchId: string) => void;

  // Budget Actions (TO-BE 03)
  requestBudgetTransfer: (
    fromBudgetId: string,
    toBudgetId: string,
    amount: number,
    reason: string,
    docName?: string
  ) => boolean;
  approveBudgetTransfer: (transferId: string) => void;
  rejectBudgetTransfer: (transferId: string, reason: string) => void;

  // Delegation Actions
  createDelegation: (delegation: Omit<Delegation, 'id' | 'isActive'>) => void;
  revokeDelegation: (delegationId: string) => void;

  // Notifications
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;

  // Test Runner for Scenarios A-G
  runTestScenario: (scenarioKey: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G') => {
    title: string;
    steps: string[];
    result: string;
    status: 'SUCCESS' | 'WARNING';
  };
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const loadDemo = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem('procure-demo-v2-' + key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
};
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Users and Auth State
  const [users, setUsers] = useState<User[]>(() => loadDemo('users', INITIAL_USERS));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [mfaPendingUser, setMfaPendingUser] = useState<User | null>(null);
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('DASHBOARD');
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);
  const [currentBranchScope, setCurrentBranchScope] = useState<BranchCode | 'ALL'>('HQ');
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);

  // Core Data
  const [budgetPools, setBudgetPools] = useState<BudgetPool[]>(() => loadDemo('budgetPools', INITIAL_BUDGET_POOLS));
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>(() => loadDemo('purchaseRequests', INITIAL_PURCHASE_REQUESTS));
  const [ledgerEntries, setLedgerEntries] = useState<BudgetLedgerEntry[]>(() => loadDemo('ledgerEntries', INITIAL_LEDGER_ENTRIES));
  const [transfers, setTransfers] = useState<BudgetTransferRequest[]>(() => loadDemo('transfers', INITIAL_TRANSFERS));
  const [delegations, setDelegations] = useState<Delegation[]>(() => loadDemo('delegations', INITIAL_DELEGATIONS));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadDemo('notifications', INITIAL_NOTIFICATIONS));
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => loadDemo('auditLogs', INITIAL_AUDIT_LOGS));
  const [accountingBatches, setAccountingBatches] = useState<AccountingImportBatch[]>(() => loadDemo('accountingBatches', []));

  // DEMO ONLY: store non-secret business data in this browser. No server, no shared transactions.
  useEffect(() => {
    const values = { users, budgetPools, purchaseRequests, ledgerEntries, transfers, delegations, notifications, auditLogs, accountingBatches };
    Object.entries(values).forEach(([key, value]) => {
      try { localStorage.setItem('procure-demo-v2-' + key, JSON.stringify(value)); } catch { /* storage quota */ }
    });
  }, [users, budgetPools, purchaseRequests, ledgerEntries, transfers, delegations, notifications, auditLogs, accountingBatches]);

  // Timeout UI session after 30 minutes of inactivity (not server-side authentication).
  useEffect(() => {
    if (!isAuthenticated) return;
    let activityAt = Date.now();
    const onActivity = () => { activityAt = Date.now(); };
    ['pointerdown','keydown'].forEach(ev => window.addEventListener(ev, onActivity));
    const timer = window.setInterval(() => {
      if (Date.now() - activityAt >= 30 * 60 * 1000) {
        setCurrentUser(null); setIsAuthenticated(false); setMfaPendingUser(null);
        setIsSessionExpired(true); setActiveScreen('AUTH_LOGIN');
      }
    }, 30_000);
    return () => {
      window.clearInterval(timer);
      ['pointerdown','keydown'].forEach(ev => window.removeEventListener(ev, onActivity));
    };
  }, [isAuthenticated]);

  // Bộ lọc dữ liệu cốt lõi: áp dụng cho bảng, biểu đồ, tìm kiếm, export, không chỉ menu.
  const permittedBudgetPools = budgetPools.filter(b =>
    canSeeBranch(currentUser, b.branchId) &&
    (currentUser?.roles.some(r => ['bod','branch_director','finance','procurement','accountant'].includes(r)) ||
      (currentUser?.roles.some(r => ['dept_head','requester'].includes(r)) && b.departmentId === currentUser.departmentId))
  );
  const permittedPRs = purchaseRequests.filter(pr => canReadRequest(currentUser, pr));

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addAuditLog = (
    action: string,
    targetEntity: AuditLogItem['targetEntity'],
    targetId: string,
    details: string
  ) => {
    const newLog: AuditLogItem = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('vi-VN'),
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Hệ thống',
      userRole: currentUser?.roles[0] || 'admin',
      action,
      targetEntity,
      targetId,
      details,
      ipAddress: '192.168.1.50',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const navigateTo = (screen: ActiveScreen, prId: string | null = null) => {
    if (isAuthenticated && !canAccessScreen(currentUser, screen)) {
      addToast('Bạn không có quyền truy cập chức năng này.', 'error');
      setActiveScreen('FORBIDDEN_403');
      return;
    }
    if (prId !== undefined) {
      setSelectedPrId(prId);
    }
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setBranchScope = (scope: BranchCode | 'ALL') => {
    if (scope === 'ALL' && !canViewAllRegions(currentUser)) {
      addToast('Tài khoản không có quyền xem toàn công ty.', 'error');
      return;
    }
    if (scope !== 'ALL' && !canSeeBranch(currentUser, scope)) {
      addToast('Bạn không có quyền xem dữ liệu chi nhánh này.', 'error');
      return;
    }
    setCurrentBranchScope(scope);
    addToast(`Đã chuyển phạm vi dữ liệu: ${scope === 'ALL' ? 'Toàn công ty' : scope}`, 'info');
  };

  // Auth Operations
  const login = (email: string, password: string) => {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, error: 'Email hoặc mật khẩu không chính xác.' };
    }
    if (!user.isActive) {
      return { success: false, error: 'Tài khoản đã bị vô hiệu hóa bởi Quản trị viên.' };
    }
    // DEMO ONLY: fixed credential, not a real authentication service.
    if (password !== DEMO_PASSWORD) {
      return { success: false, error: 'Email hoặc mật khẩu không chính xác.' };
    }

    if (user.requiresMfa) {
      setMfaPendingUser(user);
      setActiveScreen('AUTH_MFA');
      return { success: true, requiresMfa: true };
    }

    setCurrentUser(user);
    setIsSessionExpired(false);
    setIsAuthenticated(true);
    setMfaPendingUser(null);
    setCurrentBranchScope(canViewAllRegions(user) ? 'ALL' : user.branchId);
    setActiveScreen(defaultScreenFor(user));
    addAuditLog('USER_LOGIN', 'USER', user.id, `Đăng nhập thành công (${user.name})`);
    addToast(`Chào mừng ${user.name} đã quay trở lại hệ thống Procure UI`, 'success');
    return { success: true, requiresMfa: false };
  };

  const verifyMfa = (code: string) => {
    if (!mfaPendingUser) return false;
    if (code.trim() !== DEMO_OTP) return false;

    setCurrentUser(mfaPendingUser);
    setIsSessionExpired(false);
    setIsAuthenticated(true);
    setMfaPendingUser(null);
    setCurrentBranchScope(canViewAllRegions(mfaPendingUser) ? 'ALL' : mfaPendingUser.branchId);
    setActiveScreen(defaultScreenFor(mfaPendingUser));
    addAuditLog('USER_MFA_VERIFIED', 'USER', mfaPendingUser.id, 'Xác thực OTP/MFA 6 chữ số thành công');
    addToast(`Xác thực bổ sung thành công. Chào mừng ${mfaPendingUser.name}!`, 'success');
    return true;
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog('USER_LOGOUT', 'USER', currentUser.id, `Đăng xuất khỏi hệ thống (${currentUser.name})`);
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    setMfaPendingUser(null);
    setSelectedPrId(null);
    setActiveScreen('AUTH_LOGIN');
    addToast('Đã đăng xuất an toàn. Phiên làm việc đã bị hủy.', 'info');
  };

  const switchUserDemo = (_userId: string) => {
    addToast('Để đổi vai trò, vui lòng đăng xuất rồi đăng nhập tài khoản kiểm thử tương ứng.', 'warning');
  };

  const requestPasswordReset = (email: string) => {
    addToast('Chức năng khôi phục mật khẩu chỉ hoạt động khi kết nối máy chủ gửi email.', 'warning');
    return false;
  };

  const changePassword = (_oldPw: string, _newPw: string) => {
    if (!currentUser) return false;
    addToast('Bản demo chưa hỗ trợ đổi mật khẩu thật. Cần dịch vụ xác thực backend.', 'warning');
    return false;
  };

  const toggleUserActive = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!currentUser?.roles.includes('admin') || currentUser.id === userId || !target ||
        target.branchId !== currentUser.branchId) {
      addToast('Chỉ quản trị viên có thể cập nhật tài khoản khác.', 'error'); return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
    );
    const nextStatus = target ? !target.isActive : false;
    addAuditLog(
      'UPDATE_USER_STATUS',
      'USER',
      userId,
      `Chuyển trạng thái người dùng thành: ${nextStatus ? 'Hoạt động' : 'Vô hiệu hóa'}`
    );
    addToast(`Đã cập nhật trạng thái tài khoản.`, 'info');
  };

  const updateUserRolesAndScope = (userId: string, roles: User['roles'], branchId: BranchCode) => {
    const target = users.find(u => u.id === userId);
    if (!currentUser?.roles.includes('admin') || !target ||
        target.branchId !== currentUser.branchId || branchId !== currentUser.branchId ||
        roles.some(r => ['bod', 'admin'].includes(r))) {
      addToast('Không có quyền thay đổi tài khoản ngoài khu vực hoặc cấp quyền lãnh đạo/quản trị.', 'error'); return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, roles, branchId } : u))
    );
    addAuditLog('UPDATE_USER_PERMISSIONS', 'USER', userId, `Cập nhật quyền: [${roles.join(', ')}] tại ${branchId}`);
    addToast('Đã cập nhật phân quyền và phạm vi dữ liệu thành công.', 'success');
  };

  // PR CRUD
  const createPurchaseRequest = (data: Partial<PurchaseRequest>, items: PRItem[], isDraft = false): string => {
    if (!currentUser || !currentUser.isActive || !canAccessScreen(currentUser,'PR_CREATE')) { addToast('Bạn không có quyền tạo đề nghị.', 'error'); return ''; }
    if (!isDraft && !isValidPRItems(items)) { addToast('Danh sách hạng mục chưa hợp lệ.', 'error'); return ''; }
    if (data.budgetId && !budgetPools.some(b => b.id === data.budgetId && b.branchId === currentUser.branchId &&
      (b.departmentId === currentUser.departmentId || currentUser.roles.some(r => ['finance','bod','branch_director'].includes(r))))) {
      addToast('Nguồn ngân sách không thuộc phạm vi được phép.', 'error'); return '';
    }
    const prNumber = Math.max(43, ...purchaseRequests.map(pr=>Number(pr.id.match(/PR-2026-(\d+)/)?.[1] || 0))) + 1;
    const newPrId = `PR-2026-${String(prNumber).padStart(3,'0')}`;
    const totalAmount = items.reduce((sum, it) => sum + it.totalPrice, 0);

    const budget = budgetPools.find((b) => b.id === data.budgetId) || budgetPools[0];
    const available = budget.allocated + (budget.adjustments || 0) - budget.held - budget.committed - budget.used;

    // Xác định cấp duyệt cuối theo BRD:
    // < 10M: Trưởng đơn vị
    // 10M - < 50M: Giám đốc chi nhánh / Trụ sở
    // >= 50M: Ban Giám đốc (BOD)
    let finalStepName = 'Phê duyệt cấp Trưởng đơn vị (< 10.000.000 ₫)';
    let finalRole: User['roles'][0] = 'dept_head';
    let finalAssignee = 'Trần Văn Bình';

    if (totalAmount >= 50000000) {
      finalStepName = 'Ban Giám đốc phê duyệt (Hạn mức ≥ 50.000.000 ₫)';
      finalRole = 'bod';
      finalAssignee = 'Vũ Đình Trọng';
    } else if (totalAmount >= 10000000) {
      finalStepName = 'Giám đốc chi nhánh / Đơn vị phê duyệt (10M - 50M)';
      finalRole = 'branch_director';
      finalAssignee = 'Lê Thị Cúc';
    }

    const initialVersion = {
      versionNumber: 1,
      createdAt: new Date().toLocaleString('vi-VN'),
      createdBy: currentUser?.id || 'usr_requester',
      createdByName: currentUser?.name || 'Nguyễn Minh Anh',
      changeSummary: isDraft ? 'Bản nháp ban đầu' : 'Khởi tạo và gửi duyệt đề nghị mua sắm',
      items,
      subtotal: Math.round(totalAmount / 1.1),
      totalTax: Math.round(totalAmount - totalAmount / 1.1),
      totalAmount,
      isEffective: false,
    };

    const newPr: PurchaseRequest = {
      id: newPrId,
      title: data.title || 'Đề nghị mua sắm mới',
      purpose: data.purpose || '',
      needByDate: data.needByDate || '15/11/2026',
      branchId: currentUser?.branchId || 'HQ',
      departmentId: currentUser?.departmentId || 'DEP_PROD_HQ',
      departmentName: currentUser?.departmentName || 'Phòng Sản phẩm',
      budgetId: budget.id,
      budgetName: budget.name,
      status: isDraft ? 'DRAFT' : 'PENDING_DEPT',
      currentVersion: 1,
      effectiveVersion: 1,
      versions: [initialVersion],
      items,
      totalAmount,
      attachments: data.attachments || [],
      approvalTimeline: [
        {
          step: 'DEPT_CONFIRMATION',
          stepName: 'Trưởng phòng xác nhận nhu cầu',
          assignedRole: 'dept_head',
          assignedToName: 'Trần Văn Bình',
          status: 'PENDING',
        },
        {
          step: 'FINANCE_CHECK',
          stepName: 'Tài chính kiểm tra nguồn ngân sách',
          assignedRole: 'finance',
          assignedToName: 'Phạm Hoàng Dũng',
          status: 'PENDING',
        },
        {
          step: 'FINAL_APPROVAL',
          stepName: finalStepName,
          assignedRole: finalRole,
          assignedToName: finalAssignee,
          status: 'PENDING',
        },
      ],
      currentStepIndex: 0,
      currentAssigneeRole: 'dept_head',
      currentAssigneeName: 'Trần Văn Bình',
      createdById: currentUser?.id || 'usr_requester',
      createdByName: currentUser?.name || 'Nguyễn Minh Anh',
      createdByEmail: currentUser?.email || 'minhanh.nguyen@procure.vn',
      createdAt: new Date().toLocaleString('vi-VN'),
      updatedAt: new Date().toLocaleString('vi-VN'),
    };

    setPurchaseRequests((prev) => [newPr, ...prev]);

    if (!isDraft) {
      addNotification(
        'usr_dept_head',
        'Đề nghị mua sắm mới cần xác nhận',
        `${currentUser?.name} vừa gửi hồ sơ ${newPrId} (${totalAmount.toLocaleString('vi-VN')} ₫) cần bạn duyệt.`,
        'TASK_TURN',
        newPrId,
        'HIGH'
      );

      // Cảnh báo ngân sách sơ bộ nếu thiếu nguồn ngay khi nộp (nhưng KHÔNG giữ tiền ngay khi nộp - đúng TO-BE 01)
      if (available < totalAmount) {
        addToast(
          `Cảnh báo sơ bộ: Nguồn ngân sách hiện chỉ còn ${available.toLocaleString('vi-VN')} ₫ (thiếu ${(totalAmount - available).toLocaleString('vi-VN')} ₫). Hồ sơ vẫn được gửi duyệt nhưng cần Tài chính bổ sung nguồn trước khi duyệt cuối!`,
          'warning'
        );
      } else {
        addToast(`Đã gửi duyệt hồ sơ ${newPrId} thành công.`, 'success');
      }
    } else {
      addToast(`Đã lưu bản nháp ${newPrId}.`, 'info');
    }

    addAuditLog(
      isDraft ? 'CREATE_DRAFT_PR' : 'CREATE_AND_SUBMIT_PR',
      'PURCHASE_REQUEST',
      newPrId,
      `Tạo đề nghị ${newPrId}: "${newPr.title}" - Tổng: ${totalAmount.toLocaleString('vi-VN')} ₫`
    );

    return newPrId;
  };

  const updateDraftPR = (prId: string, data: Partial<PurchaseRequest>, items: PRItem[], submitNow = false) => {
    const pr = purchaseRequests.find(p => p.id === prId);
    if (!pr || pr.createdById !== currentUser?.id || pr.status !== 'DRAFT') {
      addToast('Chỉ người tạo mới được sửa hồ sơ đang ở trạng thái Nháp.', 'error'); return false;
    }
    const totalAmount = items.reduce((sum, it) => sum + it.totalPrice, 0);
    setPurchaseRequests(prev => prev.map(p => p.id !== prId ? p : {
      ...p, title: data.title ?? p.title, purpose: data.purpose ?? p.purpose,
      needByDate: data.needByDate ?? p.needByDate,
      attachments: data.attachments ?? p.attachments, items, totalAmount,
      versions: p.versions.map(v => v.versionNumber === p.currentVersion ?
        { ...v, items, totalAmount, subtotal: items.reduce((a,i) => a+i.quantity*i.unitPrice,0), totalTax: totalAmount-items.reduce((a,i)=>a+i.quantity*i.unitPrice,0) } : v),
      updatedAt: new Date().toLocaleString('vi-VN'),
    }));
    addToast(submitNow ? `Đã gửi ${prId} đi phê duyệt.` : `Đã lưu bản nháp ${prId}`, 'success'); return true;
  };

  const submitDraftPR = (prId: string): boolean => {
    const pr = purchaseRequests.find(p => p.id === prId);
    if (!pr || pr.status !== 'DRAFT' || pr.createdById !== currentUser?.id || !isValidPRItems(pr.items) ||
        !pr.title.trim() || !pr.purpose.trim() || !pr.budgetId) {
      addToast('Hồ sơ nháp thiếu thông tin hoặc bạn không có quyền gửi.', 'error'); return false;
    }
    const finalRole: User['roles'][0] = pr.totalAmount >= 50_000_000 ? 'bod' : pr.totalAmount >= 10_000_000 ? 'branch_director' : 'dept_head';
    const finalName = finalRole === 'bod' ? 'Vũ Đình Trọng' : finalRole === 'branch_director' ? 'Lê Thị Cúc' : 'Trần Văn Bình';
    setPurchaseRequests(prev => prev.map(p => p.id !== prId ? p : ({
      ...p, status: 'PENDING_DEPT', currentStepIndex: 0, currentAssigneeRole: 'dept_head',
      currentAssigneeName: 'Trần Văn Bình', updatedAt: new Date().toLocaleString('vi-VN'),
      approvalTimeline: p.approvalTimeline.map((step, index) => index === 2 ?
        {...step, assignedRole: finalRole, assignedToName: finalName} : {...step, status: 'PENDING'}),
    })));
    addAuditLog('SUBMIT_DRAFT_PR','PURCHASE_REQUEST',prId,'Gửi bản nháp đi phê duyệt');
    addToast(`Đã gửi ${prId} đi phê duyệt.`, 'success'); return true;
  };

  // TO-BE 01 / TO-BE 02: Phiên bản sửa sau duyệt hoặc sau yêu cầu bổ sung
  const createPRRevision = (prId: string, newItems: PRItem[], changeSummary: string) => {
    const pr = purchaseRequests.find((p) => p.id === prId);
    if (!pr || pr.createdById !== currentUser?.id ||
        !['APPROVED', 'REVISION_REQUESTED'].includes(pr.status) ||
        pr.execution?.actualOrderedAmount) return false;
    if (!changeSummary.trim() || !isValidPRItems(newItems)) return false;

    const newTotal = newItems.reduce((sum, it) => sum + it.totalPrice, 0);
    const nextVer = pr.currentVersion + 1;

    const newVersion = {
      versionNumber: nextVer,
      createdAt: new Date().toLocaleString('vi-VN'),
      createdBy: currentUser?.id || 'usr_requester',
      createdByName: currentUser?.name || 'Nguyễn Minh Anh',
      changeSummary,
      items: newItems,
      subtotal: Math.round(newTotal / 1.1),
      totalTax: Math.round(newTotal - newTotal / 1.1),
      totalAmount: newTotal,
      isEffective: false, // Giữ nguyên bản v1 có hiệu lực tới khi phê duyệt lại.
    };

    setPurchaseRequests((prev) =>
      prev.map((p) => {
        if (p.id !== prId) return p;
        return {
          ...p,
          currentVersion: nextVer,
          versions: [...p.versions, newVersion],
          items: newItems,
          totalAmount: newTotal,
          status: 'PENDING_DEPT', // Trình duyệt lại
          currentStepIndex: 0,
          currentAssigneeRole: 'dept_head',
          approvalTimeline: p.approvalTimeline.map((step, idx) => ({
            ...step,
            status: 'PENDING',
            decidedAt: undefined,
            decidedByName: undefined,
            comments: idx === 0 ? `Phiên bản v${nextVer} gửi duyệt lại: ${changeSummary}` : undefined,
          })),
          updatedAt: new Date().toLocaleString('vi-VN'),
        };
      })
    );

    addAuditLog(
      'CREATE_PR_REVISION',
      'PURCHASE_REQUEST',
      prId,
      `Tạo phiên bản v${nextVer} cho ${prId}. Lý do: ${changeSummary}`
    );
    addToast(`Đã tạo phiên bản v${nextVer} và gửi trình duyệt lại cho ${prId}.`, 'success');
    return true;
  };

  const requestPRCancel = (prId: string, reason: string) => {
    const pr = purchaseRequests.find((p) => p.id === prId);
    if (!pr || pr.createdById !== currentUser?.id || !reason.trim() ||
        !['DRAFT','REVISION_REQUESTED','WAITING_FUNDS'].includes(pr.status)) return false;
    if (pr.execution?.actualOrderedAmount || pr.execution?.actualRecordedAmount ||
        pr.versions.some(v => v.isEffective && pr.status !== 'APPROVED') ||
        ['IN_PROGRESS','COMPLETED'].includes(pr.status)) {
      addToast('Đã phát sinh nghĩa vụ mua hàng: cần xác nhận của Mua hàng và Tài chính trước khi hủy.', 'error');
      return false;
    }

    // Nếu hồ sơ đã APPROVED và đang giữ tiền, giải phóng ngân sách
    if (pr.status === 'APPROVED' || pr.status === 'PENDING_FINAL') {
      const budget = budgetPools.find((b) => b.id === pr.budgetId);
      if (budget && pr.status === 'APPROVED') {
        const heldAmount = heldForRequest(pr);
        setBudgetPools((prev) =>
          prev.map((b) =>
            b.id === budget.id ? { ...b, held: Math.max(0, b.held - heldAmount) } : b
          )
        );
        addLedgerEntry(
          budget.id,
          budget.name,
          'RELEASE_REMAINING',
          heldAmount,
          pr.id,
          `Giải phóng số tiền giữ ${heldAmount.toLocaleString('vi-VN')} ₫ do hồ sơ bị hủy: ${reason}`
        );
      }
    }

    setPurchaseRequests((prev) =>
      prev.map((p) => (p.id === prId ? { ...p, status: 'CANCELLED' } : p))
    );

    addAuditLog('CANCEL_PR', 'PURCHASE_REQUEST', prId, `Hủy hồ sơ ${prId}. Lý do: ${reason}`);
    addToast(`Đã hủy hồ sơ ${prId}.`, 'info');
    return true;
  };

  // TO-BE 01: Demo approval; production MUST use server atomic transaction
  const processApprovalDecision = (
    prId: string,
    stepIndex: number,
    decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
    comments?: string,
    reasonCode?: string
  ): { success: boolean; error?: string } => {
    const pr = purchaseRequests.find((p) => p.id === prId);
    if (!pr) return { success: false, error: 'Không tìm thấy hồ sơ.' };

    // BR01: Người tạo không được tự phê duyệt hồ sơ của mình!
    if (currentUser?.id === pr.createdById) {
      addToast('Quy tắc BR01: Người lập đề nghị không được tự phê duyệt hồ sơ của chính mình!', 'error');
      return { success: false, error: 'Người tạo không được tự phê duyệt hồ sơ của chính mình.' };
    }

    const currentStep = pr.approvalTimeline[stepIndex];
    if (!currentStep || stepIndex !== pr.currentStepIndex || !canApproveStep(currentUser, pr, delegations)) {
      return { success: false, error: 'Bạn không có quyền xử lý bước duyệt này hoặc hồ sơ đã thay đổi trạng thái.' };
    }

    const budget = budgetPools.find((b) => b.id === pr.budgetId);
    if (!budget) return { success: false, error: 'Không tìm thấy nguồn ngân sách.' };

    const currentLimit = budget.allocated + (budget.adjustments || 0);
    const available = currentLimit - budget.held - budget.committed - budget.used;

    // Kịch bản Từ chối: Bắt buộc có lý do
    if (decision === 'REJECTED') {
      if (!comments?.trim()) {
        return { success: false, error: 'Bắt buộc phải nhập lý do từ chối.' };
      }

      setPurchaseRequests((prev) =>
        prev.map((p) => {
          if (p.id !== prId) return p;
          const updatedTimeline = [...p.approvalTimeline];
          updatedTimeline[stepIndex] = {
            ...updatedTimeline[stepIndex],
            status: 'REJECTED',
            decidedAt: new Date().toLocaleString('vi-VN'),
            decidedByName: currentUser?.name || 'Người duyệt',
            comments,
            reasonCode,
          };
          return {
            ...p,
            status: 'REJECTED',
            approvalTimeline: updatedTimeline,
            updatedAt: new Date().toLocaleString('vi-VN'),
          };
        })
      );

      addNotification(
        pr.createdById,
        'Hồ sơ đã bị từ chối',
        `Đề nghị ${pr.id} đã bị từ chối bởi ${currentUser?.name}. Lý do: ${comments}`,
        'RESULT',
        pr.id,
        'HIGH'
      );
      addAuditLog('REJECT_PR', 'PURCHASE_REQUEST', prId, `Từ chối ${prId}. Lý do: ${comments}`);
      addToast(`Đã từ chối hồ sơ ${prId}.`, 'error');
      return { success: true };
    }

    // Kịch bản Yêu cầu bổ sung: Bắt buộc có lý do
    if (decision === 'REVISION_REQUESTED') {
      if (!comments?.trim()) {
        return { success: false, error: 'Bắt buộc phải nêu rõ nội dung cần bổ sung.' };
      }

      setPurchaseRequests((prev) =>
        prev.map((p) => {
          if (p.id !== prId) return p;
          const updatedTimeline = [...p.approvalTimeline];
          updatedTimeline[stepIndex] = {
            ...updatedTimeline[stepIndex],
            status: 'REVISION_REQUESTED',
            decidedAt: new Date().toLocaleString('vi-VN'),
            decidedByName: currentUser?.name || 'Người duyệt',
            comments,
            reasonCode,
          };
          return {
            ...p,
            status: 'REVISION_REQUESTED',
            currentAssigneeRole: 'requester',
            currentAssigneeName: pr.createdByName,
            approvalTimeline: updatedTimeline,
            updatedAt: new Date().toLocaleString('vi-VN'),
          };
        })
      );

      addNotification(
        pr.createdById,
        'Hồ sơ cần bổ sung thông tin',
        `${currentUser?.name} yêu cầu bổ sung thông tin cho hồ sơ ${pr.id}. Nội dung: ${comments}`,
        'MISSING_INFO',
        pr.id,
        'HIGH'
      );
      addAuditLog('REQUEST_REVISION_PR', 'PURCHASE_REQUEST', prId, `Yêu cầu bổ sung ${prId}. Ghi chú: ${comments}`);
      addToast(`Đã gửi yêu cầu bổ sung cho ${pr.createdByName}.`, 'info');
      return { success: true };
    }

    // Quyết định: Phê duyệt (APPROVED)
    const isFinalStep = stepIndex === pr.approvalTimeline.length - 1;

    // NẾU LÀ BƯỚC DUYỆT CUỐI: THỰC HIỆN KIỂM TRA LẠI & GIỮ NGÂN SÁCH AN TOÀN (ATOMIC HOLD)
    if (isFinalStep) {
      const previousEffective = pr.currentVersion > 1 ? pr.versions.find(v => v.versionNumber === pr.effectiveVersion && v.isEffective) : undefined;
      const reservedBefore = previousEffective && !pr.execution?.actualOrderedAmount ? previousEffective.totalAmount : 0;
      const extraHold = Math.max(0, pr.totalAmount - reservedBefore);
      if (available < extraHold) {
        // KHÔNG ĐỦ NGÂN SÁCH: Chuyển sang CHỜ NGUỒN, không đánh dấu đã duyệt!
        setPurchaseRequests((prev) =>
          prev.map((p) => {
            if (p.id !== prId) return p;
            return {
              ...p,
              status: 'WAITING_FUNDS',
              updatedAt: new Date().toLocaleString('vi-VN'),
            };
          })
        );

        addNotification(
          'usr_finance',
          'Cảnh báo thiếu ngân sách khả dụng',
          `Hồ sơ ${pr.id} (${pr.totalAmount.toLocaleString('vi-VN')} ₫) không thể hoàn tất duyệt do nguồn ${budget.name} chỉ còn ${available.toLocaleString('vi-VN')} ₫ khả dụng.`,
          'WAITING_FUNDS',
          pr.id,
          'CRITICAL'
        );

        addAuditLog(
          'HOLD_BUDGET_FAILED',
          'PURCHASE_REQUEST',
          prId,
          `Thất bại khi giữ ngân sách cho ${prId}. Cần: ${pr.totalAmount.toLocaleString('vi-VN')} ₫, Khả dụng: ${available.toLocaleString('vi-VN')} ₫. Hồ sơ vào trạng thái Chờ nguồn.`
        );

        addToast(
          `Ngân sách khả dụng không đủ (${available.toLocaleString('vi-VN')} ₫ < ${pr.totalAmount.toLocaleString('vi-VN')} ₫). Hồ sơ đã chuyển sang "Chờ nguồn".`,
          'warning'
        );

        return {
          success: false,
          error: `Ngân sách khả dụng không đủ (${available.toLocaleString('vi-VN')} ₫). Hồ sơ chuyển sang Chờ nguồn.`,
        };
      }

      // DEMO ONLY: frontend state; not atomic across users/devices
      setBudgetPools((prev) =>
        prev.map((b) =>
          b.id === budget.id ? { ...b, held: b.held + extraHold - Math.max(0, reservedBefore - pr.totalAmount) } : b
        )
      );

      // Khóa phiên bản có hiệu lực & bàn giao Mua hàng
      setPurchaseRequests((prev) =>
        prev.map((p) => {
          if (p.id !== prId) return p;
          const updatedTimeline = [...p.approvalTimeline];
          updatedTimeline[stepIndex] = {
            ...updatedTimeline[stepIndex],
            status: 'APPROVED',
            decidedAt: new Date().toLocaleString('vi-VN'),
            decidedByName: currentUser?.name || 'Cấp duyệt cuối',
            comments: comments || 'Đã phê duyệt và ghi nhận giữ ngân sách trong bản demo.',
          };
          return {
            ...p,
            status: 'APPROVED',
            effectiveVersion: p.currentVersion,
            versions: p.versions.map(v => ({...v,isEffective: v.versionNumber === p.currentVersion})),
            currentStepIndex: stepIndex + 1,
            currentAssigneeRole: 'procurement',
            currentAssigneeName: 'Hoàng Thị Mai (Mua hàng)',
            approvalTimeline: updatedTimeline,
            execution: {
              status: 'NOT_RECEIVED',
              actualOrderedAmount: 0,
              actualRecordedAmount: 0,
              releasedAmount: 0,
            },
            updatedAt: new Date().toLocaleString('vi-VN'),
          };
        })
      );

      // Bút toán Ledger
      addLedgerEntry(
        budget.id,
        budget.name,
        'HOLD_PR',
        extraHold,
        pr.id,
        `Giữ ngân sách bổ sung cho hồ sơ ${pr.id} (Phiên bản v${pr.currentVersion})`
      );

      addNotification(
        'usr_procurement',
        'Hồ sơ đã duyệt sẵn sàng tiếp nhận',
        `Hồ sơ ${pr.id} (${pr.totalAmount.toLocaleString('vi-VN')} ₫) đã duyệt xong toàn bộ và chuyển sang Mua hàng thực hiện.`,
        'TASK_TURN',
        pr.id,
        'HIGH'
      );

      addNotification(
        pr.createdById,
        'Hồ sơ đã được phê duyệt',
        `Chúc mừng! Đề nghị mua sắm ${pr.id} của bạn đã được phê duyệt hoàn tất và giữ ngân sách thành công.`,
        'RESULT',
        pr.id,
        'NORMAL'
      );

      addAuditLog(
        'FINAL_APPROVE_AND_HOLD',
        'PURCHASE_REQUEST',
        prId,
        `Duyệt bước cuối & giữ an toàn ${pr.totalAmount.toLocaleString('vi-VN')} ₫ từ nguồn ${budget.name}.`
      );

      addToast(`Đã duyệt bước cuối thành công. Ngân sách ${pr.totalAmount.toLocaleString('vi-VN')} ₫ đã được giữ an toàn.`, 'success');
      return { success: true };
    }

    // Các bước duyệt trung gian (Trưởng phòng, Tài chính)
    const nextStepIndex = stepIndex + 1;
    const nextStep = pr.approvalTimeline[nextStepIndex];

    setPurchaseRequests((prev) =>
      prev.map((p) => {
        if (p.id !== prId) return p;
        const updatedTimeline = [...p.approvalTimeline];
        updatedTimeline[stepIndex] = {
          ...updatedTimeline[stepIndex],
          status: 'APPROVED',
          decidedAt: new Date().toLocaleString('vi-VN'),
          decidedByName: currentUser?.name || 'Người duyệt',
          comments: comments || 'Đã xác nhận.',
        };

        const nextStatus = nextStepIndex === 1 ? 'PENDING_FINANCE' : 'PENDING_FINAL';

        return {
          ...p,
          status: nextStatus,
          currentStepIndex: nextStepIndex,
          currentAssigneeRole: nextStep.assignedRole,
          currentAssigneeName: nextStep.assignedToName,
          approvalTimeline: updatedTimeline,
          updatedAt: new Date().toLocaleString('vi-VN'),
        };
      })
    );

    addAuditLog(
      'APPROVE_STEP',
      'PURCHASE_REQUEST',
      prId,
      `Duyệt bước ${currentStep.stepName} cho ${prId}. Chuyển tiếp tới: ${nextStep.assignedToName}`
    );

    addToast(`Đã duyệt bước "${currentStep.stepName}". Hồ sơ đã chuyển tiếp tới ${nextStep.assignedToName}.`, 'success');
    return { success: true };
  };

  // TO-BE 02: Mua hàng tiếp nhận & ghi nhận đặt hàng
  const receivePRForProcurement = (prId: string) => {
    const pr = purchaseRequests.find(p => p.id === prId);
    if (!pr || !currentUser?.roles.includes('procurement') || !canSeeBranch(currentUser,pr.branchId) || !['APPROVED','IN_PROGRESS'].includes(pr.status)) {
      addToast('Chỉ Mua hàng được tiếp nhận hồ sơ có bản duyệt hợp lệ.', 'error'); return;
    }
    setPurchaseRequests(prev => prev.map(p => p.id !== prId ? p : {
      ...p, status: 'IN_PROGRESS', execution: {
        ...p.execution!, receivedAt: new Date().toLocaleString('vi-VN'),
        receivedBy: currentUser.name, status: p.execution?.status || 'NOT_RECEIVED',
        actualOrderedAmount: p.execution?.actualOrderedAmount || 0,
        actualRecordedAmount: p.execution?.actualRecordedAmount || 0,
        releasedAmount: p.execution?.releasedAmount || 0,
      }, updatedAt: new Date().toLocaleString('vi-VN'),
    }));
    addToast(`Đã tiếp nhận ${prId}.`, 'success');
  };

  // actualAmount = TOTAL cumulative ordered amount for this PR; only delta is converted.
  const recordActualPOOrder = (prId: string, actualAmount: number, poRef: string, supplierName: string) => {
    const pr = purchaseRequests.find(p => p.id === prId);
    const budget = budgetPools.find(b => b.id === pr?.budgetId);
    if (!pr || !budget || !currentUser?.roles.includes('procurement') || !canSeeBranch(currentUser,pr.branchId) ||
        !['APPROVED','IN_PROGRESS'].includes(pr.status) || !isValidAmount(actualAmount) ||
        !poRef.trim() || !supplierName.trim()) { addToast('Không đủ quyền hoặc thông tin đặt hàng không hợp lệ.', 'error'); return; }
    const previous = pr.execution?.actualOrderedAmount || 0;
    const delta = actualAmount - previous;
    if (delta <= 0) { addToast('Giá trị đặt tích lũy phải lớn hơn số đã ghi nhận trước đó.', 'error'); return; }
    try {
      const next = commitBudget(budget, delta, heldForRequest(pr));
      setBudgetPools(prev => prev.map(b => b.id === budget.id ? next : b));
    } catch (err) { addToast((err as Error).message + ' Cần phê duyệt lại nếu giá trị tăng vượt hạn mức.', 'error'); return; }
    setPurchaseRequests(prev => prev.map(p => p.id !== prId ? p : {
      ...p, status: 'IN_PROGRESS', updatedAt: new Date().toLocaleString('vi-VN'),
      execution: { ...p.execution!, status: 'ORDERED', actualOrderedAmount: actualAmount,
        actualRecordedAmount: p.execution?.actualRecordedAmount || 0,
        releasedAmount: p.execution?.releasedAmount || 0,
        poReference: poRef, supplierName }
    }));
    addLedgerEntry(budget.id, budget.name, 'HOLD_TO_COMMIT', delta, prId, `Chuyển ${delta.toLocaleString('vi-VN')} ₫ sang cam kết theo ${poRef}`);
    addAuditLog('PO_COMMITTED', 'PURCHASE_REQUEST', prId, `Đặt hàng tích lũy ${actualAmount.toLocaleString('vi-VN')} ₫`);
    addToast(`Đã chuyển ${delta.toLocaleString('vi-VN')} ₫ từ giữ sang cam kết; tiền giữ còn lại chưa giải phóng.`, 'success');
  };

  const releaseUncommittedRemainder = (prId: string, releaseAmount: number, reason: string) => {
    const pr = purchaseRequests.find(p => p.id === prId);
    const budget = budgetPools.find(b => b.id === pr?.budgetId);
    if (!pr || !budget || !currentUser?.roles.includes('finance') || !canSeeBranch(currentUser,pr.branchId) || !reason.trim() ||
        !['APPROVED','IN_PROGRESS'].includes(pr.status)) {
      addToast('Chỉ Tài chính có thể xác nhận giải phóng phần không còn nghĩa vụ.', 'error'); return;
    }
    try {
      const next = releaseHold(budget, releaseAmount, heldForRequest(pr));
      setBudgetPools(prev => prev.map(b => b.id === budget.id ? next : b));
    } catch (err) { addToast((err as Error).message, 'error'); return; }
    setPurchaseRequests(prev => prev.map(p => p.id !== prId ? p : {
      ...p, updatedAt: new Date().toLocaleString('vi-VN'),
      execution: { ...p.execution!, releasedAmount: (p.execution?.releasedAmount || 0) + releaseAmount, releaseReason: reason }
    }));
    addLedgerEntry(budget.id, budget.name, 'RELEASE_UNCOMMITTED', releaseAmount, prId, reason);
    addAuditLog('RELEASE_FUNDS', 'PURCHASE_REQUEST', prId, `Tài chính giải phóng ${releaseAmount.toLocaleString('vi-VN')} ₫: ${reason}`);
    addToast(`Đã giải phóng ${releaseAmount.toLocaleString('vi-VN')} ₫.`, 'success');
  };

  // TO-BE 02: Kế toán đối soát & Nhập file
  // Import is a local preview; revalidates every row against recorded obligations.
  const importAccountingFile = (fileName: string, rows: AccountingImportRow[]) => {
    if (!currentUser?.roles.some(role => ['accountant','finance'].includes(role))) {
      addToast('Không có quyền nhập chứng từ kế toán.', 'error'); return '';
    }
    const knownInvoices = new Set(accountingBatches.filter(b => b.status === 'COMMITTED')
      .flatMap(b => b.rows.filter(r => r.validationStatus === 'VALID').map(r => r.invoiceNo.trim().toUpperCase())));
    const seen = new Set<string>();
    const cumulative = new Map<string, number>();
    const checked = rows.map((r, index): AccountingImportRow => {
      const inv = r.invoiceNo.trim().toUpperCase();
      let validationStatus: AccountingImportRow['validationStatus'] = 'VALID';
      let validationMessage = 'Đã kiểm tra hồ sơ, nguồn và số tiền cam kết.';
      const pr = purchaseRequests.find(p => p.id === r.prId);
      if (!inv || seen.has(inv) || knownInvoices.has(inv)) {
        validationStatus = 'DUPLICATE'; validationMessage = 'Số hóa đơn đã tồn tại trong tệp hoặc đợt nhập trước.';
      } else if (!pr || !budgetPools.some(b => b.id === r.budgetId) || pr.budgetId !== r.budgetId ||
        !canSeeBranch(currentUser, pr.branchId)) {
        validationStatus = 'NOT_FOUND'; validationMessage = 'Mã đề nghị hoặc nguồn ngân sách không hợp lệ.';
      } else {
        const committedRemaining = (pr.execution?.actualOrderedAmount || 0) - (pr.execution?.actualRecordedAmount || 0);
        const already = cumulative.get(pr.id) || 0;
        if (!isValidAmount(r.amount) || r.amount + already > committedRemaining) {
          validationStatus = 'AMOUNT_MISMATCH'; validationMessage = 'Giá trị lớn hơn phần cam kết còn lại hoặc số tiền không hợp lệ.';
        } else cumulative.set(pr.id, already + r.amount);
      }
      seen.add(inv);
      return { ...r, rowId: index + 1, validationStatus, validationMessage };
    });
    const batch: AccountingImportBatch = {
      id: `BATCH-${Date.now()}`, fileName,
      importedAt: new Date().toLocaleString('vi-VN'), importedBy: currentUser.name,
      totalRows: checked.length,
      validRows: checked.filter(r=>r.validationStatus==='VALID').length,
      duplicateRows: checked.filter(r=>r.validationStatus==='DUPLICATE').length,
      errorRows: checked.filter(r=>!['VALID','DUPLICATE'].includes(r.validationStatus)).length,
      totalAmount: checked.filter(r=>r.validationStatus==='VALID').reduce((sum,r)=>sum+r.amount,0),
      status: 'PREVIEW', rows: checked,
    };
    setAccountingBatches(prev => [batch, ...prev]);
    addToast(`Đã đọc ${fileName}: ${batch.validRows} dòng hợp lệ, ${batch.duplicateRows} trùng, ${batch.errorRows} lỗi.`, 'info');
    return batch.id;
  };

  const commitAccountingBatch = (batchId: string) => {
    if (!currentUser?.roles.some(r => ['accountant','finance'].includes(r))) {
      addToast('Không có quyền xác nhận đối soát.', 'error'); return;
    }
    const batch = accountingBatches.find(b=>b.id === batchId);
    if (!batch || batch.status !== 'PREVIEW') return;
    const validRows = batch.rows.filter(r=>r.validationStatus==='VALID');
    const byPR = new Map<string, number>();
    for (const row of validRows) byPR.set(row.prId, (byPR.get(row.prId) || 0) + row.amount);
    // Perform all-or-none preflight before any React state mutation.
    const changes = new Map<string, BudgetPool>();
    try {
      byPR.forEach((amount, prId) => {
        const pr = purchaseRequests.find(p=>p.id===prId);
        if (!pr) throw new Error(`Không tồn tại hồ sơ ${prId}`);
        const pool = changes.get(pr.budgetId) || budgetPools.find(b=>b.id === pr.budgetId);
        if (!pool) throw new Error(`Không tồn tại nguồn ngân sách ${pr.budgetId}`);
        const pending = (pr.execution?.actualOrderedAmount || 0) - (pr.execution?.actualRecordedAmount || 0);
        changes.set(pool.id, recognizeExpense(pool, amount, pending));
      });
    } catch (err) { addToast(`Dữ liệu đã thay đổi; không ghi nhận: ${(err as Error).message}`, 'error'); return; }
    setBudgetPools(prev => prev.map(pool => changes.get(pool.id) || pool));
    setPurchaseRequests(prev => prev.map(pr => {
      const amount = byPR.get(pr.id);
      if (!amount) return pr;
      const ordered = pr.execution?.actualOrderedAmount || 0;
      const recorded = (pr.execution?.actualRecordedAmount || 0) + amount;
      const completed = ordered > 0 && recorded >= ordered && heldForRequest(pr) === 0;
      return { ...pr, status: completed ? 'COMPLETED' : 'IN_PROGRESS',
        execution: {...pr.execution!, actualRecordedAmount: recorded,
          status: completed ? 'FULLY_INVOICED' : 'PARTIAL_INVOICED' },
        updatedAt: new Date().toLocaleString('vi-VN') };
    }));
    for (const row of validRows) {
      const pool = budgetPools.find(b=>b.id===row.budgetId);
      if (pool) addLedgerEntry(pool.id, pool.name, 'COMMIT_TO_USED', row.amount, row.prId,
        `Ghi nhận hóa đơn ${row.invoiceNo}; chuyển Cam kết sang Sử dụng.`);
    }
    setAccountingBatches(prev => prev.map(b=>b.id===batchId?{...b,status:'COMMITTED'}:b));
    addAuditLog('COMMIT_ACCOUNTING_BATCH', 'IMPORT', batchId, `Ghi nhận ${validRows.length} dòng đối soát hợp lệ.`);
    addToast(`Đã ghi nhận ${validRows.length} dòng hợp lệ. Các dòng trùng/lỗi không được áp dụng.`, 'success');
  };

  // TO-BE 03: Điều chỉnh & Chuyển nguồn ngân sách
  const requestBudgetTransfer = (
    fromBudgetId: string,
    toBudgetId: string,
    amount: number,
    reason: string,
    docName?: string
  ): boolean => {
    const from = budgetPools.find((b) => b.id === fromBudgetId);
    const to = budgetPools.find((b) => b.id === toBudgetId);
    if (!from || !to || fromBudgetId === toBudgetId || !isValidAmount(amount) || !reason.trim() || !currentUser?.roles.includes('finance') || !canSeeBranch(currentUser,from.branchId) || !canSeeBranch(currentUser,to.branchId)) return false;

    const fromAvailable = from.allocated + (from.adjustments || 0) - from.held - from.committed - from.used;
    if (fromAvailable < amount) {
      addToast(`Nguồn chuyển không đủ khả dụng (${fromAvailable.toLocaleString('vi-VN')} ₫ < ${amount.toLocaleString('vi-VN')} ₫). Không thể chuyển từ phần đang giữ/cam kết/đã chi!`, 'error');
      return false;
    }

    const trfId = `TRF-2026-00${transfers.length + 5}`;
    const newTransfer: BudgetTransferRequest = {
      id: trfId,
      fiscalYear: 2026,
      fromBudgetId,
      fromBudgetName: from.name,
      toBudgetId,
      toBudgetName: to.name,
      amount,
      reason,
      effectiveDate: new Date().toLocaleDateString('vi-VN'),
      supportingDocName: docName || 'To_trinh_dieu_chuyen.pdf',
      createdBy: currentUser?.id || 'usr_finance',
      createdByName: currentUser?.name || 'Phạm Hoàng Dũng',
      createdAt: new Date().toLocaleString('vi-VN'),
      status: 'PENDING_APPROVAL',
    };

    setTransfers((prev) => [newTransfer, ...prev]);
    addNotification(
      'usr_bod',
      'Đề nghị điều chuyển ngân sách mới',
      `Tài chính trình đề nghị chuyển ${amount.toLocaleString('vi-VN')} ₫ từ ${from.name} sang ${to.name}.`,
      'TASK_TURN',
      trfId,
      'HIGH'
    );
    addAuditLog('REQUEST_TRANSFER', 'TRANSFER', trfId, `Đề nghị chuyển ${amount.toLocaleString('vi-VN')} ₫: ${from.name} -> ${to.name}`);
    addToast(`Đã tạo đề nghị điều chuyển ${trfId} trình Ban Giám đốc phê duyệt.`, 'success');
    return true;
  };

  const approveBudgetTransfer = (transferId: string) => {
    const trf = transfers.find((t) => t.id === transferId);
    if (!trf || trf.status !== 'PENDING_APPROVAL' || !currentUser?.roles.includes('bod')) return;
    const fromPool = budgetPools.find(b => b.id === trf.fromBudgetId);
    const toPool = budgetPools.find(b => b.id === trf.toBudgetId);
    if (!fromPool || !toPool) return;
    try { transferBudget(fromPool, toPool, trf.amount); }
    catch (e) { addToast('Không duyệt được: nguồn ngân sách đã thay đổi hoặc không đủ khả dụng.', 'error'); return; }

    // Cập nhật bút toán 2 nguồn (nguồn đi -amount, nguồn đến +amount)
    setBudgetPools((prev) =>
      prev.map((b) => {
        if (b.id === trf.fromBudgetId) return { ...b, adjustments: (b.adjustments || 0) - trf.amount };
        if (b.id === trf.toBudgetId) return { ...b, adjustments: (b.adjustments || 0) + trf.amount };
        return b;
      })
    );

    // Ghi 2 dòng nhật ký biến động
    addLedgerEntry(
      trf.fromBudgetId,
      trf.fromBudgetName,
      'TRANSFER_OUT',
      trf.amount,
      undefined,
      `Chuyển nguồn sang ${trf.toBudgetName} theo Quyết định ${trf.id}: ${trf.reason}`
    );

    addLedgerEntry(
      trf.toBudgetId,
      trf.toBudgetName,
      'TRANSFER_IN',
      trf.amount,
      undefined,
      `Nhận chuyển nguồn từ ${trf.fromBudgetName} theo Quyết định ${trf.id}: ${trf.reason}`
    );

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              status: 'APPROVED',
              decidedBy: currentUser?.name || 'Vũ Đình Trọng',
              decidedAt: new Date().toLocaleString('vi-VN'),
            }
          : t
      )
    );

    addAuditLog('APPROVE_TRANSFER', 'TRANSFER', transferId, `Duyệt điều chuyển ${trf.amount.toLocaleString('vi-VN')} ₫`);
    addToast(`Đã duyệt đề nghị điều chuyển ngân sách ${transferId}. Hạn mức 2 nguồn đã cập nhật.`, 'success');
  };

  const rejectBudgetTransfer = (transferId: string, reason: string) => {
    if (!currentUser?.roles.includes('bod') || !reason.trim()) { addToast('Cần quyền Ban Giám đốc và lý do từ chối.', 'error'); return; }
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              status: 'REJECTED',
              decidedBy: currentUser?.name || 'Vũ Đình Trọng',
              decidedAt: new Date().toLocaleString('vi-VN'),
              decisionNotes: reason,
            }
          : t
      )
    );
    addAuditLog('REJECT_TRANSFER', 'TRANSFER', transferId, `Từ chối chuyển nguồn. Lý do: ${reason}`);
    addToast(`Đã từ chối đề nghị điều chuyển ${transferId}.`, 'error');
  };

  // Helper additions
  const addLedgerEntry = (
    budgetId: string,
    budgetName: string,
    transactionType: BudgetLedgerEntry['transactionType'],
    amount: number,
    referencePrId?: string,
    notes: string = ''
  ) => {
    const newEntry: BudgetLedgerEntry = {
      id: `LED-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('vi-VN'),
      budgetId,
      budgetName,
      transactionType,
      amount,
      referencePrId,
      performedBy: currentUser?.name || 'Hệ thống',
      notes,
      balanceBefore: 0,
      balanceAfter: 0,
    };
    setLedgerEntries((prev) => [newEntry, ...prev]);
  };

  const addNotification = (
    userId: string,
    title: string,
    message: string,
    type: NotificationItem['type'],
    targetPrId?: string,
    priority: NotificationItem['priority'] = 'NORMAL'
  ) => {
    const newNotif: NotificationItem = {
      id: `NOTIF-${Date.now().toString().slice(-4)}`,
      userId,
      title,
      message,
      type,
      targetPrId,
      createdAt: new Date().toLocaleString('vi-VN'),
      isRead: false,
      priority,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId && n.userId === currentUser?.id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => n.userId === currentUser?.id ? { ...n, isRead: true } : n));
    addToast('Đã đánh dấu đã đọc tất cả thông báo.', 'info');
  };

  const createDelegation = (del: Omit<Delegation, 'id' | 'isActive'>) => {
    if (!currentUser || (del.fromUserId !== currentUser.id && !currentUser.roles.includes('admin')) ||
        del.fromUserId === del.toUserId || !del.reason.trim() ||
        !users.some(u=>u.id===del.toUserId && u.isActive)) {
      addToast('Thông tin hoặc quyền ủy quyền không hợp lệ.', 'error'); return;
    }
    const newDel: Delegation = {
      ...del,
      id: `DEL-${Date.now().toString().slice(-4)}`,
      isActive: true,
    };
    setDelegations((prev) => [newDel, ...prev]);
    addAuditLog('CREATE_DELEGATION', 'DELEGATION', newDel.id, `Ủy quyền duyệt cho ${del.toUserName}`);
    addToast(`Đã thiết lập ủy quyền phê duyệt cho ${del.toUserName}.`, 'success');
  };

  const revokeDelegation = (delId: string) => {
    const del = delegations.find(d=>d.id===delId);
    if (!del || (!currentUser?.roles.includes('admin') && del.fromUserId !== currentUser?.id)) {
      addToast('Không có quyền thu hồi ủy quyền.', 'error'); return;
    }
    setDelegations((prev) =>
      prev.map((d) => (d.id === delId ? { ...d, isActive: false } : d))
    );
    addAuditLog('REVOKE_DELEGATION', 'DELEGATION', delId, `Thu hồi ủy quyền`);
    addToast('Đã hủy bỏ ủy quyền thành công.', 'info');
  };

  // Test Runner Scenarios A - G
  const runTestScenario = (
    scenarioKey: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  ): {
    title: string;
    steps: string[];
    result: string;
    status: 'SUCCESS' | 'WARNING';
  } => {
    switch (scenarioKey) {
      case 'A': {
        // Kịch bản A: Nguồn còn 100M; 2 đề nghị 70M và 50M.
        // Hồ sơ 1 giữ 70M thành công -> khả dụng còn 30M.
        // Hồ sơ 2 (50M) cố duyệt cuối -> không đủ khả dụng -> Atomic check chặn -> chuyển sang WAITING_FUNDS!
        const testBudget: BudgetPool = {
          id: 'BG-SCENARIO-A',
          name: 'Nguồn kiểm thử Kịch bản A · Q4/2026',
          fiscalYear: 2026,
          branchId: 'HQ',
          departmentId: 'DEP_TECH_HQ',
          departmentName: 'Phòng CNTT',
          category: 'IT_EQUIPMENT',
          categoryName: 'Máy chủ',
          allocated: 100000000, // 100M
          adjustments: 0,
          held: 0,
          committed: 0,
          used: 0,
        };

        setBudgetPools((prev) => [testBudget, ...prev.filter((b) => b.id !== testBudget.id)]);

        // 1. Hồ sơ A 70M
        const prAId = 'PR-TEST-A-70M';
        const prBId = 'PR-TEST-B-50M';

        const prA: PurchaseRequest = {
          id: prAId,
          title: 'Hồ sơ A (70.000.000 ₫) - Tranh chấp nguồn',
          purpose: 'Mua sắm thiết bị Kịch bản A',
          needByDate: '10/11/2026',
          branchId: 'HQ',
          departmentId: 'DEP_TECH_HQ',
          departmentName: 'Phòng CNTT',
          budgetId: 'BG-SCENARIO-A',
          budgetName: testBudget.name,
          status: 'PENDING_FINAL',
          currentVersion: 1,
          effectiveVersion: 1,
          versions: [],
          items: [{ id: '1', name: 'Server A', specification: '', quantity: 1, unit: 'Bộ', unitPrice: 70000000, taxRate: 0, totalPrice: 70000000 }],
          totalAmount: 70000000,
          attachments: [],
          approvalTimeline: [
            { step: 'DEPT_CONFIRMATION', stepName: 'Trưởng phòng', assignedRole: 'dept_head', status: 'APPROVED' },
            { step: 'FINANCE_CHECK', stepName: 'Tài chính', assignedRole: 'finance', status: 'APPROVED' },
            { step: 'FINAL_APPROVAL', stepName: 'BOD Duyệt cuối', assignedRole: 'bod', status: 'PENDING' },
          ],
          currentStepIndex: 2,
          currentAssigneeRole: 'bod',
          createdById: 'usr_requester',
          createdByName: 'Nguyễn Minh Anh',
          createdByEmail: 'minhanh.nguyen@procure.vn',
          createdAt: new Date().toLocaleString('vi-VN'),
          updatedAt: new Date().toLocaleString('vi-VN'),
        };

        const prB: PurchaseRequest = {
          id: prBId,
          title: 'Hồ sơ B (50.000.000 ₫) - Đến sau trong lúc nguồn không đủ',
          purpose: 'Mua sắm thiết bị Kịch bản A',
          needByDate: '10/11/2026',
          branchId: 'HQ',
          departmentId: 'DEP_TECH_HQ',
          departmentName: 'Phòng CNTT',
          budgetId: 'BG-SCENARIO-A',
          budgetName: testBudget.name,
          status: 'PENDING_FINAL',
          currentVersion: 1,
          effectiveVersion: 1,
          versions: [],
          items: [{ id: '2', name: 'Switch B', specification: '', quantity: 1, unit: 'Bộ', unitPrice: 50000000, taxRate: 0, totalPrice: 50000000 }],
          totalAmount: 50000000,
          attachments: [],
          approvalTimeline: [
            { step: 'DEPT_CONFIRMATION', stepName: 'Trưởng phòng', assignedRole: 'dept_head', status: 'APPROVED' },
            { step: 'FINANCE_CHECK', stepName: 'Tài chính', assignedRole: 'finance', status: 'APPROVED' },
            { step: 'FINAL_APPROVAL', stepName: 'BOD Duyệt cuối', assignedRole: 'bod', status: 'PENDING' },
          ],
          currentStepIndex: 2,
          currentAssigneeRole: 'bod',
          createdById: 'usr_admin',
          createdByName: 'Lê Hải Long',
          createdByEmail: 'long.le@procure.vn',
          createdAt: new Date().toLocaleString('vi-VN'),
          updatedAt: new Date().toLocaleString('vi-VN'),
        };

        // Giả lập duyệt A thành công:
        testBudget.held = 70000000;
        prA.status = 'APPROVED';
        prA.approvalTimeline[2].status = 'APPROVED';

        // Hồ sơ B: nguồn chỉ còn 30M -> không thể duyệt -> chuyển sang WAITING_FUNDS
        prB.status = 'WAITING_FUNDS';

        setPurchaseRequests((prev) => [prB, prA, ...prev.filter((p) => p.id !== prAId && p.id !== prBId)]);

        addLedgerEntry('BG-SCENARIO-A', testBudget.name, 'HOLD_PR', 70000000, prAId, 'Kịch bản A: Giữ an toàn 70M cho Hồ sơ A');
        addAuditLog('SCENARIO_A_RUN', 'BUDGET_POOL', 'BG-SCENARIO-A', 'Chạy Kịch bản A: A giữ 70M, B thiếu nguồn vào Chờ nguồn');

        return {
          title: 'Kịch bản A: Xử lý cạnh tranh giữ ngân sách',
          steps: [
            '1. Khởi tạo nguồn 100.000.000 ₫ khả dụng.',
            '2. Hồ sơ A (70.000.000 ₫) thực hiện phê duyệt cuối -> Giữ thành công 70M (Khả dụng còn 30M).',
            '3. Hồ sơ B (50.000.000 ₫) yêu cầu phê duyệt cuối -> Hệ thống kiểm tra: 30M < 50M -> Từ chối duyệt và tự động chuyển sang "Chờ nguồn".',
            '4. Thông báo khẩn gửi tới Tài chính để xử lý bổ sung hoặc điều chuyển.',
          ],
          result: 'Mô phỏng minh họa, không phải kết quả kiểm thử tự động: Luồng phải chặn hồ sơ B nếu nguồn còn 30 triệu.',
          status: 'WARNING',
        };
      }

      case 'B': {
        // Kịch bản B: Mua 5 màn hình đã duyệt -> sửa thành 7 màn hình.
        // Mua hàng chỉ thấy bản 5 màn hình có hiệu lực. Bản 7 màn hình phải lập v2 và duyệt lại.
        return {
          title: 'Kịch bản B: Quản lý phiên bản và khóa bản duyệt',
          steps: [
            '1. Hồ sơ PR-2026-041 đã được phê duyệt ở Phiên bản 1 (Effective Version = 1).',
            '2. Khi tạo đề nghị sửa đổi (5 -> 7 chiếc), hệ thống tạo Phiên bản v2 và chuyển trạng thái về Trình duyệt lại.',
            '3. Phòng Mua hàng tiếp tục theo dõi Bản có hiệu lực (v1) cho đến khi Bản v2 được phê duyệt đầy đủ.',
            '4. Chặn ghi đè dữ liệu lịch sử.',
          ],
          result: 'Mô phỏng minh họa, không phải kết quả kiểm thử tự động: Khóa phiên bản đảm bảo phòng Mua hàng không thực hiện hàng hóa chưa qua phê duyệt.',
          status: 'WARNING',
        };
      }

      case 'C': {
        // Kịch bản C: Giữ 40M -> đặt 35M -> hóa đơn 30M -> giải phóng phần dôi dư
        return {
          title: 'Kịch bản C: Vòng đời chuyển trạng thái ngân sách và giải phóng',
          steps: [
            '1. Hồ sơ giữ ban đầu: 40.000.000 ₫ (Khả dụng giảm 40M).',
            '2. Mua hàng ghi nhận PO thực tế: 35.000.000 ₫ -> Chuyển Đang giữ -> Đã cam kết (Không trừ khả dụng lần hai!).',
            '3. Kế toán nhập chứng từ: 30.000.000 ₫ -> Chuyển Đã cam kết -> Đã sử dụng (Không trừ lần hai!).',
            '4. Phần 5M giữ dôi dư và 5M cam kết tồn được giữ nguyên nghĩa vụ cho đến khi Mua hàng & Tài chính xác nhận giải phóng.',
          ],
          result: 'Mô phỏng minh họa, không phải kết quả kiểm thử tự động: Tuân thủ tuyệt đối quy tắc các nhóm ngân sách không chồng lặp và không trừ 2 lần.',
          status: 'WARNING',
        };
      }

      case 'D': {
        // Kịch bản D: Ủy quyền người vắng mặt
        return {
          title: 'Kịch bản D: Ủy quyền phê duyệt & Xử lý người vắng mặt',
          steps: [
            '1. Trưởng phòng Trần Văn Bình nghỉ công tác 5 ngày.',
            '2. Thiết lập ủy quyền cho Phó phòng Nguyễn Thu Hằng trong hạn mức 10.000.000 ₫.',
            '3. Hồ sơ hiển thị thông tin người được ủy quyền trên tiến trình duyệt.',
            '4. Quy tắc BR01 tiếp tục có hiệu lực: Người nhận ủy quyền không được tự duyệt đề nghị do chính mình lập!',
          ],
          result: 'Mô phỏng minh họa, không phải kết quả kiểm thử tự động: Tuyến duyệt thông suốt mà vẫn bảo toàn tính tuân thủ.',
          status: 'WARNING',
        };
      }

      case 'E': {
        return {
          title: 'Kịch bản E: Luồng ngoại lệ & Báo lỗi tương tác',
          steps: [
            '1. Kiểm tra trường bắt buộc, giá trị và định dạng hồ sơ theo SRS.',
            '2. Phát hiện trùng lặp chứng từ hóa đơn trong tệp đối soát kế toán.',
            '3. Chặn bấm nút gửi nhiều lần (anti-double click).',
            '4. Hiển thị thông báo inline alert và đưa focus tới vị trí lỗi.',
          ],
          result: 'Mô phỏng minh họa, không phải kết quả kiểm thử tự động: Mọi ngoại lệ đều có giải pháp tương tác phục hồi rõ ràng.',
          status: 'WARNING',
        };
      }

      case 'F': {
        return {
          title: 'Kịch bản F: Phân quyền theo Chi nhánh & Audit Trail',
          steps: [
            '1. Nhân viên Chi nhánh Hải Phòng chỉ truy cập dữ liệu trong phạm vi Chi nhánh Hải Phòng.',
            '2. Không thể xem ngân sách nhạy cảm của Chi nhánh TP.HCM hoặc Trụ sở chính.',
            '3. Mọi thao tác đều ghi lại trong Nhật ký kiểm toán với IP, Thời gian, Tác tử và Chi tiết.',
            '4. Không cho phép xóa vĩnh viễn hồ sơ đã phát sinh phê duyệt.',
          ],
          result: 'Mô phỏng minh họa, không phải kết quả kiểm thử tự động: Kiểm soát an toàn phạm vi dữ liệu phân cấp 5 chi nhánh.',
          status: 'WARNING',
        };
      }

      case 'G': {
        return {
          title: 'Kịch bản G: Xác thực & Quản lý phiên an toàn',
          steps: [
            '1. Đăng nhập sai mật khẩu -> Giữ tài khoản, xóa mật khẩu, thông báo lỗi an toàn.',
            '2. Tài khoản quản lý/duyệt (MFA) -> Chuyển sang màn hình OTP 6 chữ số.',
            '3. Đăng xuất an toàn -> Hủy token, dọn sạch dữ liệu client, chặn Back cache.',
            '4. Xử lý hết phiên và trang cấm 403 Forbidden theo vai trò.',
          ],
          result: 'Mô phỏng minh họa, không phải kết quả kiểm thử tự động: Bộ màn hình xác thực AUTH-01..AUTH-07 hoạt động mượt mà.',
          status: 'WARNING',
        };
      }
    }
  };

  const resetDemoData = () => {
    setUsers(INITIAL_USERS);
    setCurrentUser(null);
    setIsAuthenticated(false);
    setBudgetPools(INITIAL_BUDGET_POOLS);
    setPurchaseRequests(INITIAL_PURCHASE_REQUESTS);
    setLedgerEntries(INITIAL_LEDGER_ENTRIES);
    setTransfers(INITIAL_TRANSFERS);
    setDelegations(INITIAL_DELEGATIONS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setAccountingBatches([]);
    setCurrentBranchScope('HQ');
    setActiveScreen('AUTH_LOGIN');
    Object.keys(localStorage).filter(k => k.startsWith('procure-demo-v2-')).forEach(k => localStorage.removeItem(k));
    addToast('Đã khôi phục dữ liệu mẫu ban đầu của hệ thống.', 'info');
  };

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated,
      mfaPendingUser,
      activeScreen,
      selectedPrId,
      currentBranchScope,
      isSessionExpired,
      users: !isAuthenticated ? users : currentUser?.roles.includes('admin')
        ? users.filter(u => u.branchId === currentUser.branchId) : users.filter(u => u.id === currentUser?.id),
      budgetPools: currentUser?.roles.length === 1 && currentUser.roles[0] === 'requester'
        ? permittedBudgetPools.map(b => ({ ...b, allocated: 0, adjustments: 0, held: 0, committed: 0, used: 0 }))
        : permittedBudgetPools,
      purchaseRequests: permittedPRs,
      ledgerEntries: ledgerEntries.filter(x => permittedBudgetPools.some(b => b.id === x.budgetId)),
      transfers: transfers.filter(t => (currentUser?.roles.includes('finance') || currentUser?.roles.includes('bod')) &&
        canSeeBranch(currentUser, budgetPools.find(b=>b.id === t.fromBudgetId)?.branchId || 'HQ')),
      delegations: delegations.filter(d => currentUser?.roles.includes('admin') || d.fromUserId === currentUser?.id || d.toUserId === currentUser?.id),
      notifications: notifications.filter(n => n.userId === currentUser?.id),
      auditLogs: auditLogs.filter(a => currentUser?.roles.includes('admin') || (currentUser?.roles.includes('bod') && true) || (currentUser?.roles.includes('finance') && a.userId === currentUser.id)),
      accountingBatches: currentUser?.roles.some(r => ['accountant','finance','bod'].includes(r)) ? accountingBatches : [],
      toasts,
      addToast,
      dismissToast,
      navigateTo,
      setBranchScope,
      login,
      verifyMfa,
      logout,
      switchUserDemo,
      requestPasswordReset,
      changePassword,
      toggleUserActive,
      updateUserRolesAndScope,
      createPurchaseRequest,
      updateDraftPR,
      submitDraftPR,
      createPRRevision,
      requestPRCancel,
      processApprovalDecision,
      receivePRForProcurement,
      recordActualPOOrder,
      releaseUncommittedRemainder,
      importAccountingFile,
      commitAccountingBatch,
      requestBudgetTransfer,
      approveBudgetTransfer,
      rejectBudgetTransfer,
      createDelegation,
      revokeDelegation,
      markNotificationRead,
      markAllNotificationsRead,
      runTestScenario,
      resetDemoData,
    }),
    [
      currentUser,
      isAuthenticated,
      mfaPendingUser,
      activeScreen,
      selectedPrId,
      currentBranchScope,
      isSessionExpired,
      users,
      budgetPools,
      purchaseRequests,
      ledgerEntries,
      transfers,
      delegations,
      notifications,
      auditLogs,
      accountingBatches,
      toasts,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
