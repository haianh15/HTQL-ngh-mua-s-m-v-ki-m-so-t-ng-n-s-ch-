/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Approval Queue View (UI-04, UC-PD01, UC-PD02, UC-PD04, UC-PD05, UC-NS05)
 */

import { canApproveStep, eligibleDelegation, canReadRequest, primaryRole } from '../domain/rules';
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatVND, getPRStatusBadgeInfo } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/Modal';
import { CheckSquare, Clock, UserCheck, Check, X, CornerDownLeft, Eye } from 'lucide-react';

export const ApprovalQueueView: React.FC = () => {
  const {
    currentUser,
    purchaseRequests,
    budgetPools,
    delegations,
    processApprovalDecision,
    navigateTo,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'PENDING_ME' | 'OVERDUE' | 'DELEGATED'>('PENDING_ME');

  // Dialog states for quick decision from queue
  const [targetPrId, setTargetPrId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionComments, setRevisionComments] = useState('');
  const [isAtomicHolding, setIsAtomicHolding] = useState(false);

  // Danh sách các ủy quyền hiện hành cho currentUser
  const myDelegations = useMemo(() => {
    return delegations.filter((d) => d.toUserId === currentUser?.id && d.isActive);
  }, [delegations, currentUser]);

  // Tab 1: Chờ tôi xử lý
  const pendingForMe = useMemo(() => {
    return purchaseRequests.filter((pr) => {
      if (!canReadRequest(currentUser,pr,delegations) || !['PENDING_DEPT', 'PENDING_FINANCE', 'PENDING_FINAL'].includes(pr.status)) return false;
      const step = pr.approvalTimeline[pr.currentStepIndex];
      if (!step || step.status !== 'PENDING') return false;

      // BR01: Người tạo không được tự duyệt
      if (pr.createdById === currentUser?.id) return false;

      // Quyền trực tiếp của vai trò
      return canApproveStep(currentUser, pr, delegations);
    });
  }, [purchaseRequests, currentUser, delegations]);

  // Tab 3: Quá hạn / Cần ưu tiên (> 48h hoặc gần ngày cần)
  const overduePRs = useMemo(() => {
    return purchaseRequests.filter((pr) => {
      if (!canApproveStep(currentUser,pr,delegations)) return false;
      const parts = pr.createdAt.split(/[ ,:]/)[0].split('/');
      if (parts.length !== 3) return false;
      const created = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return Date.now() - created.getTime() > 3 * 24 * 60 * 60 * 1000;
    });
  }, [purchaseRequests, currentUser, delegations]);

  // Tab 4: Được ủy quyền
  const delegatedPRs = useMemo(() => {
    if (myDelegations.length === 0) return [];
    return purchaseRequests.filter((pr) => {
      if (!canReadRequest(currentUser,pr,delegations) || !['PENDING_DEPT', 'PENDING_FINANCE', 'PENDING_FINAL'].includes(pr.status)) return false;
      const step = pr.approvalTimeline[pr.currentStepIndex];
      if (!step || step.status !== 'PENDING') return false;

      // Người tạo không tự duyệt ngay cả khi được ủy quyền (BR01)
      if (pr.createdById === currentUser?.id) return false;

      // Khớp vai trò người ủy quyền
      return !!currentUser && eligibleDelegation(currentUser, pr, step.assignedRole, myDelegations);
    });
  }, [purchaseRequests, myDelegations, currentUser, delegations]);

  const currentList = useMemo(() => {
    switch (activeTab) {
      case 'PENDING_ME':
        return pendingForMe;
      case 'OVERDUE':
        return overduePRs;
      case 'DELEGATED':
        return delegatedPRs;
    }
  }, [activeTab, pendingForMe, overduePRs, delegatedPRs]);

  const handleQuickApprove = (prId: string) => {
    const pr = purchaseRequests.find((p) => p.id === prId);
    if (!pr) return;

    setIsAtomicHolding(true);
    setTimeout(() => {
      setIsAtomicHolding(false);
      processApprovalDecision(pr.id, pr.currentStepIndex, 'APPROVED');
    }, 400);
  };

  const handleOpenReject = (prId: string) => {
    setTargetPrId(prId);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (!targetPrId) return;
    const pr = purchaseRequests.find((p) => p.id === targetPrId);
    if (pr) {
      processApprovalDecision(pr.id, pr.currentStepIndex, 'REJECTED', rejectReason);
    }
    setRejectDialogOpen(false);
  };

  const handleOpenRevision = (prId: string) => {
    setTargetPrId(prId);
    setRevisionComments('');
    setRevisionDialogOpen(true);
  };

  const handleConfirmRevision = () => {
    if (!targetPrId) return;
    const pr = purchaseRequests.find((p) => p.id === targetPrId);
    if (pr) {
      processApprovalDecision(
        pr.id,
        pr.currentStepIndex,
        'REVISION_REQUESTED',
        revisionComments
      );
    }
    setRevisionDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#202039] m-0">{primaryRole(currentUser)==='finance' ? 'Hồ sơ chờ kiểm tra ngân sách' : primaryRole(currentUser)==='dept_head' ? 'Đề nghị chờ trưởng phòng duyệt' : 'Hàng chờ phê duyệt'}</h1>
        <p className="text-xs text-[#62657A] mt-1 m-0">
          Xử lý phê duyệt hồ sơ mua sắm theo thẩm quyền, hạn mức và ủy quyền (SRS UC-PD01..05, UC-NS05)
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DDE0EA] overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('PENDING_ME')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'PENDING_ME'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Chờ tôi xử lý</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[11px] ${
              activeTab === 'PENDING_ME'
                ? 'bg-[#F0EDFF] text-[#5540C7]'
                : 'bg-[#EFF0F5] text-[#62657A]'
            }`}
          >
            {pendingForMe.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('OVERDUE')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'OVERDUE'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#875000]" />
          <span>Ưu tiên & Gần hạn</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-[#FFF3D6] text-[#875000]">
            {overduePRs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DELEGATED')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'DELEGATED'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          <UserCheck className="w-4 h-4 text-[#2459AB]" />
          <span>Được ủy quyền</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-[#EBF2FF] text-[#2459AB]">
            {delegatedPRs.length}
          </span>
        </button>
      </div>

      {/* Banner thông báo ủy quyền nếu có */}
      {activeTab === 'DELEGATED' && myDelegations.length > 0 && (
        <div className="p-3 bg-[#EBF2FF] border border-[#2459AB]/30 rounded-[10px] text-xs text-[#2459AB]">
          Bạn đang có <strong>{myDelegations.length}</strong> ủy quyền phê duyệt hợp lệ từ đồng nghiệp vắng mặt. Mọi quyết định sẽ được hệ thống ghi nhận đúng danh tính ủy quyền và tuân thủ quy tắc người tạo không tự duyệt.
        </div>
      )}

      {/* Danh sách thẻ hồ sơ chờ duyệt */}
      <div className="space-y-4">
        {currentList.length === 0 ? (
          <div className="bg-white border border-[#DDE0EA] rounded-[16px] p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#E8F6EE] text-[#176B49] flex items-center justify-center mx-auto mb-3">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#202039] mb-1">
              Không có hồ sơ nào cần xử lý
            </h3>
            <p className="text-xs text-[#62657A] max-w-sm mx-auto">
              Hàng chờ hiện tại đã sạch! Khi có đề nghị mới đến lượt hoặc được ủy quyền, hệ thống sẽ tự động thông báo.
            </p>
          </div>
        ) : (
          currentList.map((pr) => {
            const step = pr.approvalTimeline[pr.currentStepIndex] || pr.approvalTimeline[0];
            const badge = getPRStatusBadgeInfo(pr.status);
            const budget = budgetPools.find((b) => b.id === pr.budgetId) || budgetPools[0];
            const limit = budget.allocated + (budget.adjustments || 0);
            const avail = Math.max(0, limit - budget.held - budget.committed - budget.used);
            const remainingAfter = avail - pr.totalAmount;
            const isDeficit = remainingAfter < 0;

            return (
              <div
                key={pr.id}
                className="bg-white border border-[#DDE0EA] rounded-[16px] p-5 sm:p-6 shadow-[0_4px_20px_rgba(32,32,57,0.02)] hover:border-[#5540C7]/40 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#DDE0EA]">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-bold text-sm text-[#5540C7]">{pr.id}</span>
                      <span className="text-xs text-[#62657A]">
                        v{pr.currentVersion} · {pr.departmentName} ({pr.branchId})
                      </span>
                      <Badge variant={badge.badgeClass}>{badge.label}</Badge>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#202039] m-0">
                      {pr.title}
                    </h3>
                    <p className="text-xs text-[#62657A] mt-1 m-0">
                      Người đề nghị: <strong>{pr.createdByName}</strong> · Cần trước ngày:{' '}
                      <strong>{pr.needByDate}</strong>
                    </p>
                  </div>

                  <div className="text-left lg:text-right">
                    <span className="text-xs text-[#62657A] block">Tổng số tiền (đã gồm thuế)</span>
                    <span className="text-xl font-bold text-[#202039] tabular-nums">
                      {formatVND(pr.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Bước duyệt hiện tại + Ngân sách tác động inline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 text-xs">
                  <div className="p-3 bg-[#F7F8FC] rounded-[10px] border border-[#DDE0EA]/60">
                    <span className="font-semibold text-[#62657A] block mb-1">
                      Bước duyệt đang chờ:
                    </span>
                    <div className="font-bold text-[#202039]">{step.stepName}</div>
                    <div className="text-[#62657A] mt-0.5">
                      Thẩm quyền: <strong>{step.assignedRole}</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F7F8FC] rounded-[10px] border border-[#DDE0EA]/60">
                    <span className="font-semibold text-[#62657A] block mb-1">
                      Tác động nguồn: {budget.name}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-[#62657A]">Khả dụng hiện tại:</span>
                      <strong className="text-[#202039] tabular-nums">{formatVND(avail)}</strong>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[#62657A]">Còn lại sau duyệt:</span>
                      <strong
                        className={`tabular-nums ${
                          isDeficit ? 'text-[#B42336]' : 'text-[#176B49]'
                        }`}
                      >
                        {formatVND(remainingAfter)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => navigateTo('PR_DETAIL', pr.id)}
                    icon={<Eye className="w-3.5 h-3.5" />}
                  >
                    Xem chi tiết & Chứng từ
                  </Button>

                  {activeTab !== 'PROCESSED' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleOpenReject(pr.id)}
                        icon={<X className="w-3.5 h-3.5" />}
                      >
                        Từ chối
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleOpenRevision(pr.id)}
                        icon={<CornerDownLeft className="w-3.5 h-3.5" />}
                      >
                        Yêu cầu bổ sung
                      </Button>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => handleQuickApprove(pr.id)}
                        disabled={isDeficit || isAtomicHolding}
                        icon={<Check className="w-3.5 h-3.5" />}
                      >
                        {isDeficit ? 'Không đủ nguồn' : 'Phê duyệt & Giữ tiền'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject Dialog */}
      <ConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleConfirmReject}
        title="Từ chối đề nghị mua sắm"
        message="Hồ sơ sẽ kết thúc quy trình. Người tạo sẽ nhận thông báo kèm lý do."
        confirmLabel="Xác nhận từ chối"
        variant="danger"
        requiresReason
        reasonLabel="Lý do từ chối bắt buộc"
        reasonPlaceholder="Nhập lý do chi tiết..."
        reasonValue={rejectReason}
        onReasonChange={setRejectReason}
      />

      {/* Revision Dialog */}
      <ConfirmDialog
        isOpen={revisionDialogOpen}
        onClose={() => setRevisionDialogOpen(false)}
        onConfirm={handleConfirmRevision}
        title="Yêu cầu bổ sung thông tin"
        message="Hồ sơ sẽ trả về người tạo để cập nhật nội dung."
        confirmLabel="Gửi yêu cầu"
        variant="primary"
        requiresReason
        reasonLabel="Nội dung cần bổ sung"
        reasonPlaceholder="Nhập yêu cầu bổ sung..."
        reasonValue={revisionComments}
        onReasonChange={setRevisionComments}
      />
    </div>
  );
};
