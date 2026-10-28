/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Approval Timeline Component (SRS UC-MS05, UC-PD01, UC-PD07)
 */

import React from 'react';
import { ApprovalDecision } from '../../types';
import { Badge } from './Badge';

interface ApprovalTimelineProps {
  timeline: ApprovalDecision[];
  currentStepIndex: number;
}

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({
  timeline,
  currentStepIndex,
}) => {
  return (
    <div className="py-2">
      <h3 className="text-sm font-semibold text-[#202039] mb-4 uppercase tracking-wider text-xs">
        Tiến trình phê duyệt
      </h3>
      <ol className="relative ml-2 space-y-6 border-l-2 border-[#DDE0EA]">
        {timeline.map((step, idx) => {
          const isCompleted = step.status === 'APPROVED';
          const isRejected = step.status === 'REJECTED';
          const isRevision = step.status === 'REVISION_REQUESTED';
          const isCurrent = idx === currentStepIndex && step.status === 'PENDING';
          const isUpcoming = idx > currentStepIndex && step.status === 'PENDING';

          let dotBg = 'bg-[#DDE0EA] border-white';
          if (isCompleted) dotBg = 'bg-[#176B49] border-white';
          else if (isRejected) dotBg = 'bg-[#B42336] border-white';
          else if (isRevision) dotBg = 'bg-[#2459AB] border-white';
          else if (isCurrent) dotBg = 'bg-[#5540C7] ring-4 ring-[#F0EDFF] border-white';

          return (
            <li key={idx} className="relative pl-6">
              {/* Dot marker */}
              <div
                className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 ${dotBg} transition-all`}
              />

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-semibold text-[#202039]">
                    {step.stepName}
                  </span>
                  <div>
                    {isCompleted && <Badge variant="green">Đã duyệt</Badge>}
                    {isRejected && <Badge variant="red">Đã từ chối</Badge>}
                    {isRevision && <Badge variant="blue">Yêu cầu bổ sung</Badge>}
                    {isCurrent && <Badge variant="amber">Đang chờ xử lý</Badge>}
                    {isUpcoming && <Badge variant="neutral">Chưa đến lượt</Badge>}
                  </div>
                </div>

                <div className="text-xs text-[#62657A] flex items-center gap-2 flex-wrap">
                  {step.decidedByName ? (
                    <span>Người xử lý: <strong>{step.decidedByName}</strong></span>
                  ) : step.assignedToName ? (
                    <span>Người được phân công: <strong>{step.assignedToName}</strong></span>
                  ) : null}

                  {step.delegatedFromName && (
                    <span className="text-[#875000] italic">
                      (Được ủy quyền từ {step.delegatedFromName})
                    </span>
                  )}

                  {step.decidedAt && (
                    <>
                      <span>·</span>
                      <time>{step.decidedAt}</time>
                    </>
                  )}
                </div>

                {step.comments && (
                  <div className="mt-1.5 p-2.5 rounded-[8px] bg-[#F7F8FC] border border-[#DDE0EA]/70 text-xs text-[#202039]">
                    <span className="font-semibold text-[#62657A] block mb-0.5">
                      Ý kiến xử lý:
                    </span>
                    {step.comments}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
