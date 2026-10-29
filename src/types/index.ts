/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Type definitions complying with SRS, BRD and Design System v1.0
 */

export type UserRole =
  | 'requester'        // Nhân viên đề nghị
  | 'dept_head'        // Trưởng phòng / Quản lý đơn vị
  | 'branch_director'  // Giám đốc chi nhánh / Cấp tương đương HQ
  | 'finance'          // Tài chính
  | 'procurement'      // Mua hàng
  | 'accountant'       // Kế toán
  | 'bod'              // Ban Giám đốc
  | 'admin';           // Quản trị hệ thống

export type BranchCode = 'HQ' | 'BR_HN' | 'BR_HCM' | 'BR_DN' | 'BR_CT' | 'BR_HP';

export interface Branch {
  id: BranchCode;
  name: string;
  isHeadquarter: boolean;
  address: string;
  directorName: string;
}

export interface Department {
  id: string;
  name: string;
  branchId: BranchCode;
  headName: string;
  code: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  branchId: BranchCode;
  departmentId: string;
  departmentName: string;
  title: string;
  isActive: boolean;
  avatarUrl?: string;
  requiresMfa?: boolean;
}

export type PRStatus =
  | 'DRAFT'               // Bản nháp
  | 'PENDING_DEPT'        // Chờ xác nhận (Trưởng phòng)
  | 'PENDING_FINANCE'     // Chờ Tài chính
  | 'PENDING_FINAL'       // Chờ duyệt cuối
  | 'REVISION_REQUESTED'  // Cần bổ sung
  | 'WAITING_FUNDS'       // Chờ nguồn
  | 'APPROVED'            // Đã duyệt (Đã giữ ngân sách, khóa phiên bản)
  | 'IN_PROGRESS'         // Đang thực hiện
  | 'REJECTED'            // Từ chối
  | 'CANCELLED'           // Đã hủy
  | 'COMPLETED';          // Hoàn tất

export interface PRItem {
  id: string;
  name: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;     // Trước thuế
  taxRate: number;       // % VAT (ví dụ 8 hoặc 10)
  totalPrice: number;    // = quantity * unitPrice * (1 + taxRate/100)
}

export interface PRAttachment {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  url: string;
  type: 'quotation' | 'specification' | 'contract' | 'other';
}

export interface ApprovalDecision {
  step: 'DEPT_CONFIRMATION' | 'FINANCE_CHECK' | 'FINAL_APPROVAL';
  stepName: string;
  assignedRole: UserRole;
  assignedToName?: string;
  assignedToUserId?: string; // Người duyệt được phân công chính thức
  assignedToEmail?: string;
  delegatedFromName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED' | 'SKIPPED';
  decidedAt?: string;
  decidedBy?: string;
  decidedByName?: string;
  comments?: string;
  reasonCode?: string;
}

export interface PRVersion {
  versionNumber: number; // 1, 2, 3...
  createdAt: string;
  createdBy: string;
  createdByName: string;
  changeSummary: string;
  items: PRItem[];
  subtotal: number;
  totalTax: number;
  totalAmount: number;
  isEffective: boolean; // Chỉ bản được duyệt hoặc bản hiện hành đang xử lý
}

export interface PurchaseRequest {
  id: string;                  // e.g. PR-2026-042
  title: string;
  purpose: string;
  needByDate: string;          // dd/MM/yyyy
  branchId: BranchCode;
  departmentId: string;
  departmentName: string;
  projectId?: string;
  budgetId: string;            // Nguồn ngân sách chịu phí
  budgetName: string;
  
  // Trạng thái & phiên bản
  status: PRStatus;
  currentVersion: number;
  effectiveVersion: number;    // Khóa khi approved
  versions: PRVersion[];
  
  // Dữ liệu tài chính hiện hành (phiên bản đang hoạt động)
  items: PRItem[];
  totalAmount: number;         // Tổng tiền gồm VAT
  
  // Tệp đính kèm
  attachments: PRAttachment[];
  
  // Tuyến duyệt
  approvalTimeline: ApprovalDecision[];
  currentStepIndex: number;
  currentAssigneeRole: UserRole;
  currentAssigneeName?: string;
  
  // Thông tin người tạo
  createdById: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
  
  // Theo dõi thực hiện mua sắm (TO-BE 02)
  execution?: {
    receivedAt?: string;
    receivedBy?: string;
    actualOrderedAmount: number;   // Số tiền đã đặt (chuyển sang Cam kết)
    actualRecordedAmount: number;  // Số tiền kế toán đã ghi nhận (chuyển sang Sử dụng)
    releasedAmount: number;        // Số tiền đã giải phóng (hết nghĩa vụ)
    releaseReason?: string;
    poReference?: string;
    supplierName?: string;
    status: 'NOT_RECEIVED' | 'ORDERED' | 'PARTIAL_INVOICED' | 'FULLY_INVOICED' | 'DISCREPANCY';
  };

  // Đánh giá thay đổi / hủy sau duyệt
  modificationRequest?: {
    requestedBy: string;
    requestedAt: string;
    type: 'EDIT' | 'CANCEL';
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    newItems?: PRItem[];
    newTotal?: number;
  };
}

export interface BudgetPool {
  id: string;                  // e.g. BG-2026-HQ-TECH
  name: string;
  fiscalYear: number;          // 2026
  branchId: BranchCode;
  departmentId: string;
  departmentName: string;
  category: 'IT_EQUIPMENT' | 'OFFICE_SUPPLIES' | 'MARKETING' | 'TRAVEL' | 'TECHNICAL_SERVICES' | 'OPERATIONS';
  categoryName: string;
  
  allocated: number;           // Hạn mức đầu năm được duyệt
  adjustments: number;         // Điều chỉnh ròng (+/-)
  // currentLimit = allocated + adjustments
  
  held: number;                // Đang giữ (từ các PR đã duyệt cuối, chưa đặt hàng)
  committed: number;           // Đã cam kết (đã đặt hàng, chờ kế toán ghi nhận chi)
  used: number;                // Đã sử dụng (thực chi đã đối soát xong)
  
  // available = currentLimit - held - committed - used
}

export interface BudgetLedgerEntry {
  id: string;
  timestamp: string;
  budgetId: string;
  budgetName: string;
  transactionType:
    | 'INITIAL_ALLOCATION'
    | 'ADJUSTMENT_INCREASE'
    | 'ADJUSTMENT_DECREASE'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'HOLD_PR'
    | 'HOLD_TO_COMMIT'
    | 'COMMIT_TO_USED'
    | 'RELEASE_UNCOMMITTED'
    | 'RELEASE_REMAINING';
  amount: number;
  referencePrId?: string;
  referenceDoc?: string;
  performedBy: string;
  notes: string;
  balanceBefore: number;
  balanceAfter: number;
}

export interface BudgetTransferRequest {
  id: string;
  fiscalYear: number;
  fromBudgetId: string;
  fromBudgetName: string;
  toBudgetId: string;
  toBudgetName: string;
  amount: number;
  reason: string;
  effectiveDate: string;
  supportingDocName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  decidedBy?: string;
  decidedAt?: string;
  decisionNotes?: string;
}

export interface AccountingImportRow {
  rowId: number;
  invoiceNo: string;
  prId: string;
  budgetId: string;
  department: string;
  vendorName: string;
  amount: number;
  invoiceDate: string;
  description: string;
  validationStatus: 'VALID' | 'DUPLICATE' | 'NOT_FOUND' | 'AMOUNT_MISMATCH';
  validationMessage: string;
}

export interface AccountingImportBatch {
  id: string;
  fileName: string;
  importedAt: string;
  importedBy: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  totalAmount: number;
  status: 'PREVIEW' | 'COMMITTED' | 'REJECTED';
  rows: AccountingImportRow[];
}

export interface Delegation {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  role: UserRole;
  scopeBranchId?: BranchCode;
  scopeDeptId?: string;
  maxAmountLimit?: number;
  startDate: string;
  endDate: string;
  reason: string;
  isActive: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'TASK_TURN' | 'MISSING_INFO' | 'OVERDUE' | 'WAITING_FUNDS' | 'RESULT' | 'BUDGET_ALERT';
  targetPrId?: string;
  createdAt: string;
  isRead: boolean;
  priority: 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetEntity: 'PURCHASE_REQUEST' | 'BUDGET_POOL' | 'TRANSFER' | 'USER' | 'DELEGATION' | 'IMPORT';
  targetId: string;
  details: string;
  ipAddress: string;
}

export type ActiveScreen =
  | 'AUTH_LOGIN'
  | 'AUTH_MFA'
  | 'AUTH_FORGOT_PW'
  | 'DASHBOARD'
  | 'PR_LIST'
  | 'PR_CREATE'
  | 'PR_EDIT'
  | 'PR_DETAIL'
  | 'APPROVAL_QUEUE'
  | 'EXECUTION_LIST'
  | 'BUDGET_OVERVIEW'
  | 'BUDGET_TRANSFERS'
  | 'BUDGET_WAITING_PR'
  | 'RECONCILIATION_IMPORT'
  | 'REPORTS'
  | 'NOTIFICATIONS'
  | 'ADMIN_MANAGEMENT'
  | 'FORBIDDEN_403';
