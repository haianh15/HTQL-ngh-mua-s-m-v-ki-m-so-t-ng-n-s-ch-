/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Dashboard View (UI-07, UC-QT04)
 * Màn hình Tổng quan mua sắm và ngân sách nội bộ
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { formatVND, getPRStatusBadgeInfo } from '../utils/formatters';
import { BudgetDistributionBar } from '../components/common/BudgetDistributionBar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { Plus, CheckSquare, ArrowRight, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    budgetPools,
    purchaseRequests,
    currentBranchScope,
    navigateTo,
  } = useApp();

  // Lọc theo phạm vi chi nhánh
  const filteredBudgets = budgetPools.filter((b) =>
    currentBranchScope === 'ALL' ? true : b.branchId === currentBranchScope
  );

  const filteredPRs = purchaseRequests.filter((pr) =>
    currentBranchScope === 'ALL' ? true : pr.branchId === currentBranchScope
  );

  // Tổng hợp chỉ số tài chính (công thức BRD)
  const totalAllocated = filteredBudgets.reduce(
    (s, b) => s + b.allocated + (b.adjustments || 0),
    0
  );
  const totalHeld = filteredBudgets.reduce((s, b) => s + b.held, 0);
  const totalCommitted = filteredBudgets.reduce((s, b) => s + b.committed, 0);
  const totalUsed = filteredBudgets.reduce((s, b) => s + b.used, 0);
  const totalAvailable = Math.max(0, totalAllocated - totalHeld - totalCommitted - totalUsed);

  // Đề nghị cần tôi duyệt
  const pendingForMe = filteredPRs.filter((pr) => {
    if (['APPROVED', 'REJECTED', 'CANCELLED', 'DRAFT', 'COMPLETED'].includes(pr.status)) {
      return false;
    }
    const currentStep = pr.approvalTimeline[pr.currentStepIndex];
    if (!currentStep) return false;
    // Kiểm tra vai trò và chặn người tạo không tự duyệt
    const isMyRole = currentUser?.roles.includes(currentStep.assignedRole);
    const isNotCreator = pr.createdById !== currentUser?.id;
    return isMyRole && isNotCreator;
  });

  const waitingFundsCount = filteredPRs.filter((pr) => pr.status === 'WAITING_FUNDS').length;

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Scope Banner */}
      <div className="bg-[#EEEAFB] border border-[#DED7FA] p-6 sm:p-8 rounded-[16px] text-[#202039]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-bold tracking-[1.8px] uppercase text-[#5540C7]">
            Procurement & Budget Control System
          </span>
          <span className="px-3 py-1 bg-white text-[#5540C7] rounded-full text-xs font-semibold shadow-xs">
            Phạm vi:{' '}
            {currentBranchScope === 'ALL' ? 'Toàn công ty (01 HQ + 05 Chi nhánh)' : currentBranchScope}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202039] mb-2">
          Mua sắm minh bạch. Ngân sách trong tầm kiểm soát.
        </h1>
        <p className="max-w-2xl text-sm text-[#4E4868] mb-6">
          Xin chào <strong>{currentUser?.name}</strong> ({currentUser?.title}). Bạn đang quản lý các đề nghị mua sắm và luồng ngân sách thuộc {currentUser?.departmentName}.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={() => navigateTo('PR_CREATE')}
            icon={<Plus className="w-4 h-4" />}
          >
            Tạo đề nghị mua sắm mới
          </Button>
          {pendingForMe.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => navigateTo('APPROVAL_QUEUE')}
              icon={<CheckSquare className="w-4 h-4 text-[#5540C7]" />}
            >
              Hàng chờ duyệt ({pendingForMe.length} hồ sơ)
            </Button>
          )}
        </div>
      </div>

      {/* Cảnh báo hành động */}
      {waitingFundsCount > 0 && (
        <Alert variant="amber">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#875000] flex-shrink-0" />
              <span>
                Có <strong>{waitingFundsCount}</strong> hồ sơ đang ở trạng thái <strong>Chờ nguồn</strong> do ngân sách khả dụng không đủ để giữ an toàn.
              </span>
            </div>
            <button
              onClick={() => navigateTo('BUDGET_OVERVIEW')}
              className="text-xs font-bold text-[#875000] underline"
            >
              Xem xét điều chuyển nguồn →
            </button>
          </div>
        </Alert>
      )}

      {/* 4 Financial Metric Cards (Chuẩn Design System v1.0) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cấp hạn mức */}
        <div className="bg-white border border-[#DDE0EA] rounded-[12px] p-5 shadow-[0_4px_20px_rgba(32,32,57,0.03)]">
          <span className="text-xs text-[#62657A] font-medium block mb-1">Ngân sách được cấp</span>
          <div className="text-2xl font-bold text-[#202039] tabular-nums tracking-tight">
            {formatVND(totalAllocated)}
          </div>
          <span className="text-[11px] text-[#62657A] mt-2 block">
            Q4/2026 · Hạn mức đã duyệt
          </span>
        </div>

        {/* Đã chi */}
        <div className="bg-white border border-[#DDE0EA] rounded-[12px] p-5 shadow-[0_4px_20px_rgba(32,32,57,0.03)]">
          <span className="text-xs text-[#62657A] font-medium block mb-1">Đã sử dụng (Thực chi)</span>
          <div className="text-2xl font-bold text-[#202039] tabular-nums tracking-tight">
            {formatVND(totalUsed)}
          </div>
          <span className="text-[11px] text-[#62657A] mt-2 block">
            {totalAllocated > 0 ? ((totalUsed / totalAllocated) * 100).toFixed(0) : 0}% tổng hạn mức
          </span>
        </div>

        {/* Cam kết + Giữ chỗ */}
        <div className="bg-white border border-[#DDE0EA] rounded-[12px] p-5 shadow-[0_4px_20px_rgba(32,32,57,0.03)]">
          <span className="text-xs text-[#62657A] font-medium block mb-1">Cam kết + Giữ chỗ</span>
          <div className="text-2xl font-bold text-[#202039] tabular-nums tracking-tight">
            {formatVND(totalCommitted + totalHeld)}
          </div>
          <span className="text-[11px] text-[#62657A] mt-2 block">
            {formatVND(totalCommitted)} cam kết + {formatVND(totalHeld)} đang giữ
          </span>
        </div>

        {/* Khả dụng */}
        <div className="bg-white border border-[#DDE0EA] rounded-[12px] p-5 shadow-[0_4px_20px_rgba(32,32,57,0.03)]">
          <span className="text-xs text-[#62657A] font-medium block mb-1">Còn khả dụng an toàn</span>
          <div className="text-2xl font-bold text-[#176B49] tabular-nums tracking-tight">
            {formatVND(totalAvailable)}
          </div>
          <span className="text-[11px] text-[#176B49] font-medium mt-2 block">
            {totalAllocated > 0 ? ((totalAvailable / totalAllocated) * 100).toFixed(0) : 0}% khả dụng cho đề nghị mới
          </span>
        </div>
      </div>

      {/* Phân bổ sử dụng ngân sách Bar */}
      <div className="bg-white border border-[#DDE0EA] rounded-[12px] p-6 shadow-[0_4px_20px_rgba(32,32,57,0.03)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-[#202039] m-0">
            Phân bổ sử dụng ngân sách (Non-overlapping Allocation)
          </h3>
          <Badge variant={totalAvailable > 0 ? 'green' : 'red'}>
            {totalAvailable > 0 ? 'Trong hạn mức kiểm soát' : 'Cảnh báo hết khả dụng'}
          </Badge>
        </div>

        <BudgetDistributionBar
          allocated={totalAllocated}
          held={totalHeld}
          committed={totalCommitted}
          used={totalUsed}
          className="mt-3"
        />
      </div>

      {/* Grid: Đề nghị gần đây & Nguồn ngân sách trọng điểm */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table: Đề nghị gần đây (2 cột) */}
        <div className="lg:col-span-2 bg-white border border-[#DDE0EA] rounded-[12px] shadow-[0_4px_20px_rgba(32,32,57,0.03)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDE0EA]">
            <div>
              <h3 className="text-base font-bold text-[#202039] m-0">Đề nghị mua sắm gần đây</h3>
              <p className="text-xs text-[#62657A] m-0">Hiển thị các hồ sơ mới nhất trong phạm vi</p>
            </div>
            <button
              onClick={() => navigateTo('PR_LIST')}
              className="text-xs font-semibold text-[#5540C7] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả ({filteredPRs.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F8FC] border-b border-[#DDE0EA] text-xs font-semibold text-[#62657A]">
                  <th className="py-3 px-4">Mã & Tên đề nghị</th>
                  <th className="py-3 px-4">Đơn vị</th>
                  <th className="py-3 px-4 text-right">Số tiền (VND)</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE0EA] text-sm">
                {filteredPRs.slice(0, 5).map((pr) => {
                  const badge = getPRStatusBadgeInfo(pr.status);
                  return (
                    <tr
                      key={pr.id}
                      onClick={() => navigateTo('PR_DETAIL', pr.id)}
                      className="hover:bg-[#FAFAFE] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#5540C7] hover:underline">
                          {pr.id}
                        </div>
                        <div className="text-xs text-[#62657A] max-w-[260px] truncate">
                          {pr.title}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#202039]">{pr.departmentName}</td>
                      <td className="py-3 px-4 text-right font-medium tabular-nums whitespace-nowrap">
                        {formatVND(pr.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={badge.badgeClass}>{badge.label}</Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#62657A] whitespace-nowrap">
                        {pr.createdAt.split(' ')[0]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nguồn ngân sách trọng điểm (1 cột) */}
        <div className="bg-white border border-[#DDE0EA] rounded-[12px] p-5 shadow-[0_4px_20px_rgba(32,32,57,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#202039] m-0">Nguồn ngân sách</h3>
            <button
              onClick={() => navigateTo('BUDGET_OVERVIEW')}
              className="text-xs font-semibold text-[#5540C7] hover:underline"
            >
              Chi tiết
            </button>
          </div>

          <div className="space-y-3.5">
            {filteredBudgets.slice(0, 3).map((bg) => {
              const limit = bg.allocated + (bg.adjustments || 0);
              const avail = Math.max(0, limit - bg.held - bg.committed - bg.used);
              const availPct = limit > 0 ? (avail / limit) * 100 : 0;
              return (
                <div
                  key={bg.id}
                  className="p-3 rounded-[10px] bg-[#F7F8FC] border border-[#DDE0EA]/60 hover:border-[#5540C7] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="font-semibold text-xs text-[#202039] leading-tight">
                      {bg.name}
                    </div>
                    <span
                      className={`text-[11px] font-bold ${
                        availPct < 15 ? 'text-[#875000]' : 'text-[#176B49]'
                      }`}
                    >
                      {availPct.toFixed(0)}% còn lại
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#62657A]">
                    <span>Khả dụng:</span>
                    <strong className="text-[#202039] tabular-nums">{formatVND(avail)}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <Button
              variant="secondary"
              size="small"
              className="w-full"
              onClick={() => navigateTo('BUDGET_OVERVIEW')}
            >
              Xem báo cáo & Bút toán ngân sách
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
