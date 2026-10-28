/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Budget Distribution Bar and Budget Cards
 */

import React from 'react';
import { formatVND } from '../../utils/formatters';

interface BudgetDistributionBarProps {
  allocated: number;
  adjustments?: number;
  held: number;
  committed: number;
  used: number;
  className?: string;
  showAmounts?: boolean;
}

export const BudgetDistributionBar: React.FC<BudgetDistributionBarProps> = ({
  allocated,
  adjustments = 0,
  held,
  committed,
  used,
  className = '',
  showAmounts = true,
}) => {
  const currentLimit = Math.max(allocated + adjustments, 1);
  const available = Math.max(0, currentLimit - held - committed - used);

  const usedPct = Math.min(100, Math.max(0, (used / currentLimit) * 100));
  const committedPct = Math.min(100 - usedPct, Math.max(0, (committed / currentLimit) * 100));
  const heldPct = Math.min(100 - usedPct - committedPct, Math.max(0, (held / currentLimit) * 100));
  const availablePct = Math.max(0, 100 - usedPct - committedPct - heldPct);

  return (
    <div className={`w-full ${className}`}>
      {/* Track bar */}
      <div
        className="flex h-3 rounded-[8px] overflow-hidden bg-[#EBECF3] my-3 w-full"
        role="img"
        aria-label={`Đã chi ${usedPct.toFixed(1)}%, Cam kết ${committedPct.toFixed(
          1
        )}%, Giữ chỗ ${heldPct.toFixed(1)}%, Khả dụng ${availablePct.toFixed(1)}%`}
      >
        {usedPct > 0 && (
          <span
            style={{ width: `${usedPct}%` }}
            className="h-full bg-[#5540C7] transition-all duration-300"
            title={`Đã chi: ${formatVND(used)} (${usedPct.toFixed(1)}%)`}
          />
        )}
        {committedPct > 0 && (
          <span
            style={{ width: `${committedPct}%` }}
            className="h-full bg-[#A08DE3] transition-all duration-300"
            title={`Cam kết: ${formatVND(committed)} (${committedPct.toFixed(1)}%)`}
          />
        )}
        {heldPct > 0 && (
          <span
            style={{ width: `${heldPct}%` }}
            className="h-full bg-[#D7CCF7] transition-all duration-300"
            title={`Giữ chỗ: ${formatVND(held)} (${heldPct.toFixed(1)}%)`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#62657A]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-[2px] bg-[#5540C7]" />
          <span>
            Đã chi <strong>{usedPct.toFixed(0)}%</strong>
            {showAmounts && ` (${formatVND(used)})`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-[2px] bg-[#A08DE3]" />
          <span>
            Cam kết <strong>{committedPct.toFixed(0)}%</strong>
            {showAmounts && ` (${formatVND(committed)})`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-[2px] bg-[#D7CCF7]" />
          <span>
            Giữ chỗ <strong>{heldPct.toFixed(0)}%</strong>
            {showAmounts && ` (${formatVND(held)})`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-[2px] bg-[#EBECF3] border border-[#DDE0EA]" />
          <span>
            Khả dụng <strong className="text-[#176B49]">{availablePct.toFixed(0)}%</strong>
            {showAmounts && ` (${formatVND(available)})`}
          </span>
        </div>
      </div>
    </div>
  );
};
