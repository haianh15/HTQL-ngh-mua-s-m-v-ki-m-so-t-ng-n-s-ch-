/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Purchase Request Detail View (UI-03, UC-MS05, UC-MS06, UC-MS07, UC-PD07)
 * Tuân thủ chính xác Pattern "Quyết định có ngữ cảnh" từ Design System Section 04
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatVND, getPRStatusBadgeInfo } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { ApprovalTimeline } from '../components/common/ApprovalTimeline';
import { BudgetImpactPanel } from '../components/common/BudgetImpactPanel';
import { ConfirmDialog, Modal } from '../components/common/Modal';
import {
  ArrowLeft,
  FileCheck,
  History,
  Lock,
  Edit3,
  XCircle,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { PRItem } from '../types';
import { canApproveStep, canAccessScreen, isRequesterRole } from '../domain/rules';

export const PRDetailView: React.FC = () => {
  const {
    selectedPrId,
    purchaseRequests,
    budgetPools,
    currentUser,
    delegations,
    processApprovalDecision,
    createPRRevision,
    requestPRCancel,
    navigateTo,
    addToast,
  } = useApp();

  // App.tsx và AppContext.navigateTo đều từ chối hồ sơ không có quyền đọc.
  // Tuyệt đối không fallback sang purchaseRequests[0] vì có thể hiển thị nhầm hồ sơ.
  const pr = purchaseRequests.find((p) => p.id === selectedPrId)!;

  const [activeVersionNumber, setActiveVersionNumber] = useState<number>(pr.currentVersion);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionComments, setRevisionComments] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRequestRevisionOpen, setIsRequestRevisionOpen] = useState(false);
  const [requestRevisionComments, setRequestRevisionComments] = useState('');
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isAtomicHolding, setIsAtomicHolding] = useState(false);

  // Edit quantity for new revision
  const [revisionItems, setRevisionItems] = useState<PRItem[]>(pr.items);

  const budget = useMemo(() => {
    return budgetPools.find((b) => b.id === pr.budgetId) || budgetPools[0];
  }, [budgetPools, pr.budgetId]);

  const statusBadge = getPRStatusBadgeInfo(pr.status);

  // Xác định xem người dùng hiện tại có quyền duyệt bước hiện tại hay không
  const currentStep = pr.approvalTimeline[pr.currentStepIndex];
  const isPendingApproval =
    ['PENDING_DEPT', 'PENDING_FINANCE', 'PENDING_FINAL'].includes(pr.status) &&
    currentStep?.status === 'PENDING';

  const isAssignedApprover =
    isPendingApproval &&
    canApproveStep(currentUser, pr, delegations); // Kiểm tra vai trò + đúng chi nhánh/phòng ban/ủy quyền

  const isCreatorSelfApprover =
    isPendingApproval && currentUser?.id === pr.createdById;

  const isCreator = canAccessScreen(currentUser, 'PR_CREATE') && currentUser?.id === pr.createdById;
  const canEditOrCancel =
    isCreator && ['DRAFT', 'REVISION_REQUESTED', 'WAITING_FUNDS'].includes(pr.status);

  // Xử lý phê duyệt bước hiện tại
  const handleApprove = () => {
    setIsAtomicHolding(true);
    setTimeout(() => {
      setIsAtomicHolding(false);
      const res = processApprovalDecision(pr.id, pr.currentStepIndex, 'APPROVED');
      if (res.success) {
        // Sau khi hoàn tất bước duyệt, về hàng chờ của vai trò hiện tại.
        navigateTo('APPROVAL_QUEUE');
      } else if (res.error) {
        addToast(res.error, 'error');
      }
    }, 450);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      addToast('Bắt buộc phải nhập lý do từ chối hồ sơ.', 'error');
      return;
    }
    const res = processApprovalDecision(pr.id, pr.currentStepIndex, 'REJECTED', rejectReason);
    if (res.success) navigateTo('APPROVAL_QUEUE');
    else if (res.error) addToast(res.error, 'error');
    setIsRejectDialogOpen(false);
    setRejectReason('');
  };

  const handleConfirmRequestRevision = () => {
    if (!requestRevisionComments.trim()) {
      addToast('Bắt buộc phải nêu rõ nội dung cần bổ sung.', 'error');
      return;
    }
    const res = processApprovalDecision(
      pr.id,
      pr.currentStepIndex,
      'REVISION_REQUESTED',
      requestRevisionComments
    );
    if (res.success) navigateTo('APPROVAL_QUEUE');
    else if (res.error) addToast(res.error, 'error');
    setIsRequestRevisionOpen(false);
    setRequestRevisionComments('');
  };

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      addToast('Bắt buộc phải nhập lý do hủy đề nghị.', 'error');
      return;
    }
    requestPRCancel(pr.id, cancelReason);
    setIsCancelDialogOpen(false);
    setCancelReason('');
  };

  // Kịch bản B: Người tạo đề xuất sửa số lượng (tạo Version mới trình duyệt lại)
  const handleCreateNewRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionComments.trim()) {
      addToast('Vui lòng nêu rõ lý do điều chỉnh phiên bản.', 'warning');
      return;
    }
    createPRRevision(pr.id, revisionItems, revisionComments);
    setIsRevisionModalOpen(false);
    setRevisionComments('');
  };

  return (
    <div className="space-y-6">
      {/* Top breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateTo('PR_LIST')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#62657A] hover:text-[#202039] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách đề nghị</span>
        </button>

        <div className="flex items-center gap-2">
          {isCreator && pr.status === 'DRAFT' && (
            <Button variant="secondary" size="small" onClick={() => navigateTo('PR_EDIT', pr.id)} icon={<Edit3 className="w-3.5 h-3.5" />}>
              Sửa / Gửi bản nháp
            </Button>
          )}
          {canEditOrCancel && (
            <Button
              variant="danger"
              size="small"
              onClick={() => setIsCancelDialogOpen(true)}
            >
              Hủy đề nghị
            </Button>
          )}

          {/* Nếu đã APPROVED, cho phép tạo bản sửa đổi có phiên bản mới (Kịch bản B) */}
          {isCreator && ['APPROVED','REVISION_REQUESTED'].includes(pr.status) && !pr.execution?.actualOrderedAmount && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                setRevisionItems(pr.items);
                setIsRevisionModalOpen(true);
              }}
              icon={<Edit3 className="w-3.5 h-3.5 text-[#5540C7]" />}
            >
              Yêu cầu sửa đổi (Tạo bản v{pr.currentVersion + 1})
            </Button>
          )}
        </div>
      </div>

      {/* Main Split Layout: Left Details + Right Budget Impact Panel */}
      <div className={`grid grid-cols-1 ${isRequesterRole(currentUser) ? '' : 'lg:grid-cols-3'} gap-6 items-start`}>
        {/* Left Column (2 Cols): Request Info, Items, Timeline, Version Audit */}
        <div className={`${isRequesterRole(currentUser) ? '' : 'lg:col-span-2'} space-y-6`}> 
          <div className="bg-white border border-[#DDE0EA] rounded-[16px] p-6 shadow-[0_4px_20px_rgba(32,32,57,0.03)]">
            {/* Header: ID, Effective Version Badge, Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-[1.8px] uppercase text-[#5540C7]">
                  {pr.id}
                </span>
                <span className="px-2 py-0.5 rounded-[6px] text-xs font-bold bg-[#F0EDFF] text-[#5540C7] flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Phiên bản v{pr.currentVersion}</span>
                </span>
                {pr.status === 'APPROVED' && (
                  <span className="px-2 py-0.5 rounded-[6px] text-xs font-semibold bg-[#E8F6EE] text-[#176B49]">
                    Khóa phiên bản hiệu lực
                  </span>
                )}
              </div>
              <Badge variant={statusBadge.badgeClass}>{statusBadge.label}</Badge>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[#202039] mb-2 m-0">
              {pr.title}
            </h1>

            <p className="text-xs text-[#62657A] mb-4">
              Người đề nghị: <strong>{pr.createdByName}</strong> ({pr.createdByEmail}) · {pr.departmentName} · Ngày cần:{' '}
              <strong>{pr.needByDate}</strong>
            </p>

            <div className="bg-[#F7F8FC] p-3.5 rounded-[10px] border border-[#DDE0EA]/60 text-xs mb-6">
              <span className="font-semibold text-[#62657A] block mb-0.5">Mục đích mua sắm:</span>
              <p className="text-[#202039] m-0">{pr.purpose}</p>
            </div>

            {/* Bảng hạng mục */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[#202039] uppercase tracking-wider text-xs m-0">
                  Danh mục hàng hóa / dịch vụ
                </h3>
                {pr.versions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsDiffModalOpen(true)}
                    className="text-xs font-semibold text-[#5540C7] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>So sánh phiên bản ({pr.versions.length} bản)</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto border border-[#DDE0EA] rounded-[10px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F7F8FC] text-[#62657A] border-b border-[#DDE0EA]">
                    <tr>
                      <th className="py-2.5 px-3">Hạng mục</th>
                      <th className="py-2.5 px-3">Quy cách kỹ thuật</th>
                      <th className="py-2.5 px-3 text-center w-16">SL</th>
                      <th className="py-2.5 px-3 text-center w-16">ĐVT</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá</th>
                      <th className="py-2.5 px-3 text-center w-16">VAT</th>
                      <th className="py-2.5 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE0EA]">
                    {pr.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-[#FAFAFE]">
                        <td className="py-2.5 px-3 font-semibold text-[#202039]">{it.name}</td>
                        <td className="py-2.5 px-3 text-[#62657A]">{it.specification || '—'}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-center text-[#62657A]">{it.unit}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[#62657A]">
                          {formatVND(it.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-[#62657A]">{it.taxRate}%</td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums text-[#202039]">
                          {formatVND(it.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-3 text-xs">
                <div className="space-y-1 text-right">
                  <div className="text-[#62657A]">
                    Tổng cộng (đã bao gồm thuế GTGT):{' '}
                    <strong className="text-base text-[#5540C7] tabular-nums ml-2">
                      {formatVND(pr.totalAmount)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Tài liệu đính kèm */}
            <div className="mb-6 pt-4 border-t border-[#DDE0EA]">
              <h3 className="text-sm font-bold text-[#202039] uppercase tracking-wider text-xs mb-3">
                Tài liệu & Báo giá đính kèm ({pr.attachments.length})
              </h3>
              {pr.attachments.length === 0 ? (
                <div className="p-3 bg-[#F7F8FC] rounded-[8px] text-xs text-[#62657A] italic text-center">
                  Không có tệp tài liệu nào được đính kèm.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pr.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 rounded-[8px] bg-[#F7F8FC] border border-[#DDE0EA] text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileCheck className="w-4 h-4 text-[#176B49] flex-shrink-0" />
                        <span className="font-medium text-[#202039] truncate">{att.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { if (att.url && att.url !== '#') {
                          const a = document.createElement('a'); a.href = att.url; a.download = att.name; a.click();
                        } else addToast('Tệp mẫu cũ chỉ lưu tên, không có nội dung để tải.', 'warning'); }}
                        className="text-[#5540C7] hover:underline text-[11px] font-semibold flex items-center gap-1 flex-shrink-0 ml-2"
                      >
                        <span>Xem</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tiến trình duyệt */}
            <div className="pt-4 border-t border-[#DDE0EA]">
              <ApprovalTimeline
                timeline={pr.approvalTimeline}
                currentStepIndex={pr.currentStepIndex}
              />
            </div>
          </div>

          {/* Thông tin thực hiện mua sắm nếu đã Approved (TO-BE 02) */}
          {!(isRequesterRole(currentUser)) && pr.execution && ['APPROVED','IN_PROGRESS','COMPLETED'].includes(pr.status) && (
            <div className="bg-white border border-[#DDE0EA] rounded-[16px] p-6 shadow-[0_4px_20px_rgba(32,32,57,0.03)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#5540C7]" />
                  <h3 className="text-base font-bold text-[#202039] m-0">
                    Theo dõi thực hiện mua sắm (Phòng Mua hàng)
                  </h3>
                </div>
                <Badge variant={pr.execution.status === 'ORDERED' ? 'purple' : 'neutral'}>
                  {pr.execution.status === 'ORDERED' ? 'Đã phát hành đơn mua' : 'Chờ tiếp nhận'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                <div className="p-3 bg-[#F7F8FC] rounded-[8px]">
                  <span className="text-[#62657A] block">Số tiền đang giữ:</span>
                  <strong className="text-sm text-[#202039] tabular-nums">
                    {formatVND(Math.max(0, pr.totalAmount - (pr.execution.actualOrderedAmount || 0) - (pr.execution.releasedAmount || 0)))}
                  </strong>
                </div>
                <div className="p-3 bg-[#F7F8FC] rounded-[8px]">
                  <span className="text-[#62657A] block">Giá trị đã đặt (Cam kết):</span>
                  <strong className="text-sm text-[#5540C7] tabular-nums">
                    {formatVND(pr.execution.actualOrderedAmount || 0)}
                  </strong>
                </div>
                <div className="p-3 bg-[#F7F8FC] rounded-[8px]">
                  <span className="text-[#62657A] block">Kế toán đã ghi nhận:</span>
                  <strong className="text-sm text-[#176B49] tabular-nums">
                    {formatVND(pr.execution.actualRecordedAmount || 0)}
                  </strong>
                </div>
              </div>

              <div className="flex justify-end">
                {canAccessScreen(currentUser, 'EXECUTION_LIST') && <Button
                  variant="secondary"
                  size="small"
                  onClick={() => navigateTo('EXECUTION_LIST')}
                >
                  Mở phân hệ Thực hiện mua sắm →
                </Button>}
              </div>
            </div>
          )}
        </div>

        {/* Không tiết lộ số dư cho nhân viên đề nghị; chỉ người có trách nhiệm xem tác động ngân sách. */}
        {!(isRequesterRole(currentUser)) && <div>
          <BudgetImpactPanel
            budget={budget}
            requestAmount={pr.totalAmount}
            isActionable={isAssignedApprover}
            isApprovalDisabled={isCreatorSelfApprover}
            approvalDisabledReason={
              isCreatorSelfApprover
                ? 'Quy tắc BR01: Người tạo không được tự phê duyệt hồ sơ của mình.'
                : undefined
            }
            isAtomicHolding={isAtomicHolding}
            onApprove={handleApprove}
            onReject={() => setIsRejectDialogOpen(true)}
            onRequestRevision={() => setIsRequestRevisionOpen(true)}
          />
        </div>}
      </div>

      {/* Modal: So sánh phiên bản (UC-MS06) */}
      <Modal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        title={`Lịch sử & So sánh phiên bản (${pr.id})`}
        maxWidth="xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#62657A] m-0">
            Hồ sơ có {pr.versions.length} phiên bản. Phiên bản hiện có hiệu lực pháp lý:{' '}
            <strong className="text-[#176B49]">v{pr.effectiveVersion}</strong>
          </p>

          <div className="space-y-3">
            {pr.versions.map((ver) => (
              <div
                key={ver.versionNumber}
                className={`p-3.5 rounded-[10px] border ${
                  ver.versionNumber === pr.effectiveVersion
                    ? 'border-[#176B49] bg-[#E8F6EE]/30'
                    : 'border-[#DDE0EA] bg-[#F7F8FC]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#202039]">
                      Phiên bản v{ver.versionNumber}
                    </span>
                    {ver.isEffective && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#176B49] text-white">
                        Bản có hiệu lực
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#62657A]">{ver.createdAt}</span>
                </div>

                <div className="text-xs text-[#62657A] mb-2">
                  Người tạo: <strong>{ver.createdByName}</strong> · Nội dung:{' '}
                  <span className="text-[#202039]">{ver.changeSummary}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#DDE0EA]">
                  <span>Số lượng mục: {ver.items.length}</span>
                  <span className="font-bold tabular-nums text-[#5540C7]">
                    {formatVND(ver.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3">
            <Button variant="secondary" onClick={() => setIsDiffModalOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Yêu cầu sửa đổi sau duyệt (Kịch bản B: 5 -> 7 màn hình) */}
      <Modal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        title={`Yêu cầu sửa đổi hồ sơ đã duyệt (${pr.id})`}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateNewRevision} className="space-y-4">
          <Alert variant="amber">
            <strong>Quy tắc khóa phiên bản:</strong> Bản duyệt v{pr.currentVersion} ({formatVND(pr.totalAmount)}) hiện tại vẫn là bản có hiệu lực duy nhất đối với phòng Mua hàng. Bản sửa đổi v{pr.currentVersion + 1} sẽ được tạo mới và bắt buộc trình duyệt lại theo quy trình.
          </Alert>

          <div>
            <label className="block text-sm font-semibold text-[#202039] mb-1">
              Lý do thay đổi <span className="text-[#B42336]">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={revisionComments}
              onChange={(e) => setRevisionComments(e.target.value)}
              placeholder="Ví dụ: Tăng số lượng từ 3 lên 5 chiếc để cấp cho nhân sự mới tuyển dụng..."
              className="w-full p-2.5 text-sm border border-[#DDE0EA] rounded-[10px] focus:outline-none focus:border-[#5540C7]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#202039] mb-1">
              Điều chỉnh số lượng các hạng mục:
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {revisionItems.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#F7F8FC] border border-[#DDE0EA] text-xs"
                >
                  <span className="font-medium text-[#202039] truncate max-w-xs">
                    {it.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>Số lượng mới:</span>
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setRevisionItems((prev) => {
                          const updated = [...prev];
                          updated[idx] = {
                            ...updated[idx],
                            quantity: val,
                            totalPrice: Math.round(
                              val * updated[idx].unitPrice * (1 + updated[idx].taxRate / 100)
                            ),
                          };
                          return updated;
                        });
                      }}
                      className="w-16 p-1 text-center font-bold border border-[#DDE0EA] rounded-[6px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DDE0EA]">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsRevisionModalOpen(false)}
            >
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Xác nhận tạo phiên bản v{pr.currentVersion + 1} & Trình duyệt lại
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog: Từ chối hồ sơ */}
      <ConfirmDialog
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onConfirm={handleConfirmReject}
        title={`Từ chối đề nghị mua sắm ${pr.id}?`}
        message="Hồ sơ sẽ kết thúc và không thể tiếp tục luồng phê duyệt. Người đề nghị sẽ nhận được thông báo kèm lý do chi tiết."
        confirmLabel="Xác nhận từ chối"
        variant="danger"
        requiresReason
        reasonLabel="Lý do từ chối hồ sơ"
        reasonPlaceholder="Nêu rõ lý do không đồng ý mua sắm..."
        reasonValue={rejectReason}
        onReasonChange={setRejectReason}
      />

      {/* Confirm Dialog: Yêu cầu bổ sung */}
      <ConfirmDialog
        isOpen={isRequestRevisionOpen}
        onClose={() => setIsRequestRevisionOpen(false)}
        onConfirm={handleConfirmRequestRevision}
        title={`Yêu cầu bổ sung thông tin (${pr.id})`}
        message="Hồ sơ sẽ được chuyển về trạng thái 'Cần bổ sung' để người tạo cập nhật báo giá hoặc điều chỉnh quy cách."
        confirmLabel="Gửi yêu cầu bổ sung"
        variant="primary"
        requiresReason
        reasonLabel="Nội dung cần người đề nghị bổ sung"
        reasonPlaceholder="Ví dụ: Cần bổ sung tối thiểu 02 báo giá cạnh tranh theo quy chế..."
        reasonValue={requestRevisionComments}
        onReasonChange={setRequestRevisionComments}
      />

      {/* Confirm Dialog: Hủy đề nghị */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleConfirmCancel}
        title={`Xác nhận hủy đề nghị mua sắm ${pr.id}?`}
        message="Thao tác này sẽ hủy hồ sơ. Nếu ngân sách đã bị giữ thì số tiền sẽ được giải phóng nguyên vẹn về nguồn khả dụng."
        confirmLabel="Xác nhận hủy"
        variant="danger"
        requiresReason
        reasonLabel="Lý do hủy hồ sơ"
        reasonPlaceholder="Nêu rõ lý do hủy mua sắm..."
        reasonValue={cancelReason}
        onReasonChange={setCancelReason}
      />
    </div>
  );
};
