/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Budget Impact Panel (SRS UC-NS04, UC-NS05, UC-PD02)
 * Hiển thị tác động ngân sách ngay cạnh quyết định phê duyệt.
 */

import React from 'react';
import { formatVND } from '../../utils/formatters';
import { Alert } from './Alert';
import { Button } from './Button';
import { BudgetPool } from '../../types';

interface BudgetImpactPanelProps {
  budget: BudgetPool;
  requestAmount: number;
  onApprove?: () => void;
  onReject?: () => void;
  onRequestRevision?: () => void;
  isActionable?: boolean;
  isApprovalDisabled?: boolean;
  approvalDisabledReason?: string;
  isAtomicHolding?: boolean;
}

export const BudgetImpactPanel: React.FC<BudgetImpactPanelProps> = ({
  budget,
  requestAmount,
  onApprove,
  onReject,
  onRequestRevision,
  isActionable = false,
  isApprovalDisabled = false,
  approvalDisabledReason,
  isAtomicHolding = false,
}) => {
  const currentLimit = budget.allocated + (budget.adjustments || 0);
  const availableBefore = Math.max(0, currentLimit - budget.held - budget.committed - budget.used);
  const remainingAfter = availableBefore - requestAmount;
  const isDeficit = remainingAfter < 0;
  const remainingPct = currentLimit > 0 ? (remainingAfter / currentLimit) * 100 : 0;
  const isWarningLow = !isDeficit && remainingPct < 15;

  return (
    <aside className="bg-white border border-[#DDE0EA] rounded-[12px] p-6 shadow-[0_4px_20px_rgba(32,32,57,0.03)] h-fit sticky top-6">
      <div className="text-[11px] font-bold tracking-[1.8px] uppercase text-[#5540C7]">
        Tác động ngân sách
      </div>

      <h3 className="text-base font-semibold text-[#202039] mt-3 mb-1">
        {budget.name}
      </h3>
      <p className="text-xs text-[#62657A] mb-3">
        Đơn vị: {budget.departmentName} · Năm tài chính {budget.fiscalYear}
      </p>

      <div className="bg-[#F7F8FC] rounded-[10px] p-4 my-3 border border-[#DDE0EA]/60">
        <span className="text-xs text-[#62657A] block mb-1">Khả dụng trước đề nghị</span>
        <div className="text-2xl font-bold text-[#202039] tabular-nums tracking-tight">
          {formatVND(availableBefore)}
        </div>
      </div>

      <hr className="border-t border-[#DDE0EA] my-4" />

      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between text-[#202039]">
          <span className="text-[#62657A]">Đề nghị này (đã gồm thuế):</span>
          <strong className="tabular-nums text-base">{formatVND(requestAmount)}</strong>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#DDE0EA]/60">
          <span className="text-[#62657A]">Còn lại sau phê duyệt:</span>
          <strong
            className={`tabular-nums text-lg ${
              isDeficit
                ? 'text-[#B42336]'
                : isWarningLow
                ? 'text-[#875000]'
                : 'text-[#176B49]'
            }`}
          >
            {formatVND(remainingAfter)}
          </strong>
        </div>
      </div>

      {/* Cảnh báo ngữ cảnh tài chính */}
      <div className="mt-4">
        {isDeficit ? (
          <Alert variant="red">
            <strong>Thiếu ngân sách khả dụng!</strong> Nguồn hiện chỉ còn {formatVND(availableBefore)}, thiếu{' '}
            {formatVND(Math.abs(remainingAfter))}. Không thể thực hiện giữ ngân sách an toàn. Hồ sơ sẽ phải chuyển sang trạng thái <strong>Chờ nguồn</strong>.
          </Alert>
        ) : isWarningLow ? (
          <Alert variant="amber">
            Sau duyệt, ngân sách nguồn chỉ còn <strong>{remainingPct.toFixed(0)}%</strong> hạn mức. Vui lòng rà soát các nhu cầu mua sắm dự kiến khác trong kỳ.
          </Alert>
        ) : (
          <Alert variant="green">
            Ngân sách hoàn toàn khả dụng và đảm bảo hạn mức an toàn ({remainingPct.toFixed(0)}% còn lại sau duyệt).
          </Alert>
        )}
      </div>

      {/* Hành động phê duyệt */}
      {isActionable && (
        <div className="mt-6 pt-4 border-t border-[#DDE0EA] space-y-2.5">
          <div className="text-xs text-[#62657A] mb-2 font-medium">
            * Khi phê duyệt bước cuối, hệ thống thực hiện kiểm tra và giữ ngân sách an toàn (Server Atomic Hold).
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={onApprove}
            disabled={isDeficit || isApprovalDisabled || isAtomicHolding}
            isLoading={isAtomicHolding}
          >
            {isDeficit ? 'Không thể duyệt (Thiếu nguồn)' : 'Phê duyệt & Giữ ngân sách'}
          </Button>

          {approvalDisabledReason && (
            <p className="text-xs text-[#B42336] text-center">{approvalDisabledReason}</p>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="secondary"
              size="small"
              className="w-full"
              onClick={onRequestRevision}
            >
              Yêu cầu bổ sung
            </Button>
            <Button
              variant="danger"
              size="small"
              className="w-full"
              onClick={onReject}
            >
              Từ chối hồ sơ
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
};
