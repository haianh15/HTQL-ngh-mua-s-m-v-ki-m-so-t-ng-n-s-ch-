/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Budget Management View (UI-06, UC-NS01, UC-NS02, UC-NS03, UC-NS04, UC-NS08, UC-NS10)
 * Quản lý nguồn ngân sách, điều chỉnh/chuyển nguồn (TO-BE 03) và nhật ký biến động (Ledger)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { analyzeBudgets } from '../ai/insights';
import { InsightCard } from '../components/ai/InsightCard';
import { useApp } from '../context/AppContext';
import { formatVND } from '../utils/formatters';
import { heldForRequest, canManageBudget } from '../domain/rules';
import { BudgetDistributionBar } from '../components/common/BudgetDistributionBar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { Modal } from '../components/common/Modal';
import {
  PieChart,
  ArrowRightLeft,
  BookOpen,
  Clock,
  Plus,
  Check,
  X,
  Building,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export const BudgetManagementView: React.FC = () => {
  const {
    currentUser,
    activeScreen,
    budgetPools,
    transfers,
    ledgerEntries,
    purchaseRequests,
    currentBranchScope,
    requestBudgetTransfer,
    releaseUncommittedRemainder,
    approveBudgetTransfer,
    rejectBudgetTransfer,
    navigateTo,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRANSFERS' | 'LEDGER' | 'WAITING_PR' | 'RELEASE'>(
    activeScreen === 'BUDGET_TRANSFERS' ? 'TRANSFERS' : activeScreen === 'BUDGET_WAITING_PR' ? 'WAITING_PR' : 'OVERVIEW'
  );
  // Sidebar tài chính có các đường dẫn riêng đến Tổng quan và Điều chuyển nguồn.
  useEffect(() => {
    if (activeScreen === 'BUDGET_TRANSFERS') setActiveTab('TRANSFERS');
    else if (activeScreen === 'BUDGET_WAITING_PR') setActiveTab('WAITING_PR');
    else if (activeScreen === 'BUDGET_OVERVIEW') setActiveTab('OVERVIEW');
  }, [activeScreen]);

  // Modal chuyển nguồn
  const [releaseTarget, setReleaseTarget] = useState<string | null>(null);
  const [releaseAmount, setReleaseAmount] = useState(0);
  const [releaseReason, setReleaseReason] = useState('');
  const [procurementConfirmed, setProcurementConfirmed] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromBudgetId, setFromBudgetId] = useState(budgetPools[0]?.id || '');
  const [toBudgetId, setToBudgetId] = useState(budgetPools[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferReason, setTransferReason] = useState('');

  // Lọc theo chi nhánh
  const filteredBudgets = budgetPools.filter((b) =>
    currentBranchScope === 'ALL' ? true : b.branchId === currentBranchScope
  );

  const waitingFundsPRs = purchaseRequests.filter((pr) => pr.status === 'WAITING_FUNDS');
  // Dữ liệu được AppContext lọc theo RBAC; tiếp tục khóa phạm vi chi nhánh được chọn.
  const aiBudgetReport = useMemo(() => {
    const authorizedBudgetIds = new Set(filteredBudgets.map(b=>b.id));
    return analyzeBudgets(filteredBudgets,
      ledgerEntries.filter(e=>authorizedBudgetIds.has(e.budgetId)),
      purchaseRequests.filter(pr=>authorizedBudgetIds.has(pr.budgetId)));
  }, [budgetPools, currentBranchScope, ledgerEntries, purchaseRequests]);
  const financeCanRelease = canManageBudget(currentUser);
  // Only requests that were actually taken up by purchasing and have an
  // uncommitted balance can be reviewed for release. Confirmation is manual
  // in this browser demo; server implementation must verify proof of closure.
  const possibleReleases = purchaseRequests.filter(pr =>
    pr.status === 'IN_PROGRESS' && !!pr.execution?.receivedAt &&
    (pr.execution?.actualOrderedAmount || 0) > 0 && heldForRequest(pr) > 0
  );
  const selectedRelease = possibleReleases.find(pr => pr.id === releaseTarget);
  const handleRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!financeCanRelease || !selectedRelease || !procurementConfirmed || !releaseReason.trim() ||
        !Number.isSafeInteger(releaseAmount) || releaseAmount <= 0 || releaseAmount > heldForRequest(selectedRelease)) {
      addToast('Cần xác nhận Mua hàng đã đóng nghĩa vụ và nhập số tiền giải phóng hợp lệ.', 'warning');
      return;
    }
    releaseUncommittedRemainder(selectedRelease.id, releaseAmount, `Xác nhận Mua hàng không còn nghĩa vụ: ${releaseReason.trim()}`);
    setReleaseTarget(null); setReleaseAmount(0); setReleaseReason(''); setProcurementConfirmed(false);
  };


  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromBudgetId || !toBudgetId || transferAmount <= 0 || !transferReason.trim()) {
      addToast('Vui lòng điền đầy đủ thông tin nguồn chuyển, nguồn nhận và số tiền.', 'warning');
      return;
    }
    if (fromBudgetId === toBudgetId) {
      addToast('Nguồn chuyển và nguồn nhận không được trùng nhau.', 'error');
      return;
    }

    const ok = requestBudgetTransfer(fromBudgetId, toBudgetId, transferAmount, transferReason);
    if (ok) {
      setIsTransferModalOpen(false);
      setTransferAmount(0);
      setTransferReason('');
      setActiveTab('TRANSFERS');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#202039] m-0">Quản lý ngân sách nội bộ</h1>
          <p className="text-xs text-[#62657A] mt-1 m-0">
            Theo dõi hạn mức, phân bổ năm, điều chỉnh/chuyển nguồn và truy vết bút toán ngân sách (TO-BE 03)
          </p>
        </div>

        {financeCanRelease && <Button
          variant="primary"
          onClick={() => setIsTransferModalOpen(true)}
          icon={<ArrowRightLeft className="w-4 h-4" />}
        >Đề nghị điều chuyển nguồn</Button>}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DDE0EA] overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Tổng quan các nguồn ({filteredBudgets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TRANSFERS')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'TRANSFERS'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Đề nghị điều chỉnh / Chuyển nguồn</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-[#EFF0F5] text-[#62657A]">
            {transfers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LEDGER')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'LEDGER'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Nhật ký biến động (Ledger)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-[#EFF0F5] text-[#62657A]">
            {ledgerEntries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WAITING_PR')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'WAITING_PR'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#B42336]" />
          <span>Hồ sơ chờ nguồn</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-[#FDECEF] text-[#B42336] font-bold">
            {waitingFundsPRs.length}
          </span>
        </button>
        {financeCanRelease && <button
          type="button"
          onClick={() => setActiveTab('RELEASE')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap ${activeTab === 'RELEASE' ? 'border-[#5540C7] text-[#5540C7]' : 'border-transparent text-[#62657A]'}`}
        >Giải phóng giữ dư ({possibleReleases.length})</button>}
      </div>

      {/* Tab 1: Tổng quan nguồn ngân sách */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <InsightCard title="Phân tích ngân sách & cảnh báo bất thường" report={aiBudgetReport} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBudgets.map((b) => {
              const currentLimit = b.allocated + (b.adjustments || 0);
              const available = Math.max(0, currentLimit - b.held - b.committed - b.used);
              const availablePct = currentLimit > 0 ? (available / currentLimit) * 100 : 0;

              return (
                <div
                  key={b.id}
                  className="bg-white border border-[#DDE0EA] rounded-[16px] p-5 shadow-[0_4px_20px_rgba(32,32,57,0.02)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#5540C7]">
                        {b.id} · {b.branchId}
                      </div>
                      <h3 className="text-base font-bold text-[#202039] mt-0.5 m-0">
                        {b.name}
                      </h3>
                      <span className="text-xs text-[#62657A]">
                        Đơn vị: {b.departmentName}
                      </span>
                    </div>
                    <Badge variant={availablePct < 15 ? 'amber' : 'green'}>
                      {availablePct.toFixed(0)}% khả dụng
                    </Badge>
                  </div>

                  {/* 4 Chỉ số chi tiết */}
                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-[#DDE0EA]/60">
                    <div className="p-2 rounded-[8px] bg-[#F7F8FC]">
                      <span className="text-[#62657A] block text-[11px]">Hạn mức:</span>
                      <strong className="text-[#202039] tabular-nums font-semibold">
                        {formatVND(currentLimit)}
                      </strong>
                    </div>

                    <div className="p-2 rounded-[8px] bg-[#F7F8FC]">
                      <span className="text-[#62657A] block text-[11px]">Đã chi (Used):</span>
                      <strong className="text-[#5540C7] tabular-nums font-semibold">
                        {formatVND(b.used)}
                      </strong>
                    </div>

                    <div className="p-2 rounded-[8px] bg-[#F7F8FC]">
                      <span className="text-[#62657A] block text-[11px]">Còn khả dụng:</span>
                      <strong className="text-[#176B49] tabular-nums font-bold">
                        {formatVND(available)}
                      </strong>
                    </div>
                  </div>

                  {/* Thanh phân bổ không chồng lặp */}
                  <BudgetDistributionBar
                    allocated={b.allocated}
                    adjustments={b.adjustments}
                    held={b.held}
                    committed={b.committed}
                    used={b.used}
                    showAmounts={false}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Đề nghị điều chỉnh / Chuyển nguồn (TO-BE 03) */}
      {activeTab === 'TRANSFERS' && (
        <div className="bg-white border border-[#DDE0EA] rounded-[16px] shadow-[0_4px_20px_rgba(32,32,57,0.03)] overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#DDE0EA]">
            <h2 className="text-base font-bold text-[#202039] m-0">
              Danh sách đề nghị điều chuyển & bổ sung nguồn (TO-BE 03)
            </h2>
            <p className="text-xs text-[#62657A] mt-1 m-0">
              Kiểm tra tính khả dụng nguồn chuyển, cập nhật bút toán 2 nguồn khi Ban Giám đốc duyệt
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F7F8FC] border-b border-[#DDE0EA] text-[#62657A] font-semibold">
                <tr>
                  <th className="py-3 px-4">Mã điều chuyển</th>
                  <th className="py-3 px-4">Nguồn xuất chuyển (Giảm)</th>
                  <th className="py-3 px-4">Nguồn tiếp nhận (Tăng)</th>
                  <th className="py-3 px-4 text-right">Số tiền chuyển</th>
                  <th className="py-3 px-4">Lý do & Chứng từ</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE0EA] text-sm">
                {transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-[#FAFAFE]">
                    <td className="py-3.5 px-4 font-bold text-[#5540C7] whitespace-nowrap">
                      {trf.id}
                      <div className="text-[11px] text-[#62657A] font-normal">{trf.createdAt}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#B42336] flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>{trf.fromBudgetName}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#176B49] flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{trf.toBudgetName}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold tabular-nums text-[#202039] whitespace-nowrap">
                      {formatVND(trf.amount)}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-[#62657A] max-w-[240px]">
                      <div className="truncate font-medium text-[#202039]">{trf.reason}</div>
                      <div>Tờ trình: {trf.supportingDocName}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {trf.status === 'APPROVED' ? (
                        <Badge variant="green">Đã duyệt chuyển</Badge>
                      ) : trf.status === 'REJECTED' ? (
                        <Badge variant="red">Từ chối</Badge>
                      ) : (
                        <Badge variant="amber">Chờ BOD duyệt</Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {trf.status === 'PENDING_APPROVAL' && currentUser?.roles.includes('bod') ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => approveBudgetTransfer(trf.id)}
                            icon={<Check className="w-3.5 h-3.5" />}
                          >
                            Duyệt
                          </Button>
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => rejectBudgetTransfer(trf.id, 'Chưa đủ cơ sở điều chuyển')}
                            icon={<X className="w-3.5 h-3.5" />}
                          >
                            Từ chối
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#62657A]">
                          Xử lý bởi: {trf.decidedBy || 'BOD'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Nhật ký biến động (Ledger) */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white border border-[#DDE0EA] rounded-[16px] shadow-[0_4px_20px_rgba(32,32,57,0.03)] overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#DDE0EA]">
            <h2 className="text-base font-bold text-[#202039] m-0">
              Nhật ký biến động ngân sách (Budget Ledger Audit)
            </h2>
            <p className="text-xs text-[#62657A] mt-1 m-0">
              Truy vết chi tiết mọi giao dịch Giữ chỗ (Hold), Cam kết (Commit), Thực chi (Used) và Điều chuyển (UC-NS10)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F7F8FC] border-b border-[#DDE0EA] text-[#62657A] font-semibold">
                <tr>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Loại giao dịch</th>
                  <th className="py-3 px-4">Nguồn ngân sách</th>
                  <th className="py-3 px-4 text-right">Số tiền</th>
                  <th className="py-3 px-4">Hồ sơ liên quan</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                  <th className="py-3 px-4">Nội dung chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE0EA]">
                {ledgerEntries.map((led) => {
                  let badgeType: 'neutral' | 'purple' | 'green' | 'amber' | 'red' | 'blue' = 'neutral';
                  let typeLabel: string = led.transactionType;

                  if (led.transactionType === 'HOLD_PR') {
                    badgeType = 'purple';
                    typeLabel = 'Giữ chỗ (Hold)';
                  } else if (led.transactionType === 'HOLD_TO_COMMIT') {
                    badgeType = 'blue';
                    typeLabel = 'Cam kết PO';
                  } else if (led.transactionType === 'COMMIT_TO_USED') {
                    badgeType = 'green';
                    typeLabel = 'Kế toán chi (Used)';
                  } else if (led.transactionType.includes('TRANSFER')) {
                    badgeType = 'amber';
                    typeLabel = 'Điều chuyển';
                  } else if (led.transactionType.includes('RELEASE')) {
                    badgeType = 'neutral';
                    typeLabel = 'Giải phóng';
                  }

                  return (
                    <tr key={led.id} className="hover:bg-[#FAFAFE]">
                      <td className="py-3 px-4 whitespace-nowrap text-[#62657A]">{led.timestamp}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant={badgeType}>{typeLabel}</Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#202039]">{led.budgetName}</td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-[#202039] whitespace-nowrap">
                        {formatVND(led.amount)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {led.referencePrId ? (
                          <button
                            onClick={() => navigateTo('PR_DETAIL', led.referencePrId)}
                            className="font-bold text-[#5540C7] hover:underline cursor-pointer"
                          >
                            {led.referencePrId}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[#62657A]">{led.performedBy}</td>
                      <td className="py-3 px-4 text-xs text-[#62657A] max-w-[260px] truncate">
                        {led.notes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Hồ sơ chờ nguồn (WAITING_FUNDS) */}
      {activeTab === 'WAITING_PR' && (
        <div className="space-y-4">
          <Alert variant="red">
            <strong>Danh sách hồ sơ bị nghẽn do thiếu nguồn:</strong> Các hồ sơ dưới đây không thể hoàn tất phê duyệt cuối và giữ ngân sách do nguồn khả dụng của phòng/chi nhánh không đủ. Ban Giám đốc và Tài chính cần xem xét điều chuyển hoặc phân bổ bổ sung.
          </Alert>

          <div className="bg-white border border-[#DDE0EA] rounded-[16px] shadow-[0_4px_20px_rgba(32,32,57,0.03)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F7F8FC] border-b border-[#DDE0EA] text-[#62657A] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Mã hồ sơ</th>
                    <th className="py-3 px-4">Tên đề nghị</th>
                    <th className="py-3 px-4">Nguồn ngân sách thiếu</th>
                    <th className="py-3 px-4 text-right">Tổng tiền đề xuất</th>
                    <th className="py-3 px-4 text-right">Số dư khả dụng hiện có</th>
                    <th className="py-3 px-4 text-center">Hành động khắc phục</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE0EA] text-sm">
                  {waitingFundsPRs.map((pr) => {
                    const bg = budgetPools.find((b) => b.id === pr.budgetId);
                    const limit = bg ? bg.allocated + (bg.adjustments || 0) : 0;
                    const avail = bg ? Math.max(0, limit - bg.held - bg.committed - bg.used) : 0;

                    return (
                      <tr key={pr.id} className="hover:bg-[#FAFAFE]">
                        <td className="py-3.5 px-4 font-bold text-[#5540C7]">{pr.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-[#202039]">{pr.title}</td>
                        <td className="py-3.5 px-4 text-xs text-[#62657A]">{pr.budgetName}</td>
                        <td className="py-3.5 px-4 text-right font-bold tabular-nums text-[#B42336]">
                          {formatVND(pr.totalAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold tabular-nums text-[#62657A]">
                          {formatVND(avail)} (Thiếu {formatVND(pr.totalAmount - avail)})
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {financeCanRelease && <Button
                            variant="secondary"
                            size="small"
                            onClick={() => {
                              setToBudgetId(pr.budgetId);
                              setTransferAmount(pr.totalAmount - avail);
                              setTransferReason(`Bổ sung nguồn khẩn cấp cho hồ sơ ${pr.id}`);
                              setIsTransferModalOpen(true);
                            }}
                          >
                            Điều chuyển bổ sung nguồn →
                          </Button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'RELEASE' && financeCanRelease && <div className="bg-white border border-[#DDE0EA] rounded-[16px] overflow-hidden">
        <div className="p-5 border-b border-[#DDE0EA]">
          <h2 className="text-base font-bold text-[#202039]">Xác nhận giải phóng ngân sách đang giữ</h2>
          <p className="text-xs text-[#62657A] mt-1">Tài chính chỉ thực hiện khi Mua hàng đã xác nhận phần dư không còn nghĩa vụ. Bản demo chưa hỗ trợ đính kèm biên bản đối soát.</p>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left">
          <thead className="bg-[#F7F8FC] text-xs text-[#62657A]"><tr><th className="p-3">Mã / Đề nghị</th><th className="p-3">Nhà cung cấp</th><th className="p-3 text-right">Giữ còn lại</th><th className="p-3 text-center">Xác nhận</th></tr></thead>
          <tbody className="divide-y divide-[#DDE0EA]">{possibleReleases.map(pr => <tr key={pr.id}>
            <td className="p-3"><strong className="text-[#5540C7]">{pr.id}</strong><div className="text-xs text-[#62657A]">{pr.title}</div></td>
            <td className="p-3">{pr.execution?.supplierName || 'Chưa rõ'}</td>
            <td className="p-3 text-right tabular-nums">{formatVND(heldForRequest(pr))}</td>
            <td className="p-3 text-center"><Button size="small" variant="secondary" onClick={() => {
              setReleaseTarget(pr.id);setReleaseAmount(heldForRequest(pr));setReleaseReason('');setProcurementConfirmed(false);
            }}>Kiểm tra & giải phóng</Button></td>
          </tr>)}
          {possibleReleases.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-[#62657A]">Không có phần giữ dư đang chờ xác nhận.</td></tr>}
          </tbody>
        </table></div>
      </div>}

      <Modal isOpen={!!releaseTarget} onClose={() => setReleaseTarget(null)} title={`Xác nhận giải phóng ${selectedRelease?.id || ''}`} maxWidth="md">
        <form onSubmit={handleRelease} className="space-y-4 text-sm">
          <p className="text-xs text-[#62657A]">Chỉ giải phóng phần không còn nghĩa vụ sau khi đối chiếu với Mua hàng. Số giữ còn lại: <strong>{formatVND(selectedRelease ? heldForRequest(selectedRelease) : 0)}</strong>.</p>
          <div><label className="block text-xs font-semibold mb-1">Số tiền giải phóng (VND)</label>
            <input type="number" min="1" required step="1" max={selectedRelease ? heldForRequest(selectedRelease) : 0} value={releaseAmount || ''} onChange={e => setReleaseAmount(Number(e.target.value))}
              className="w-full p-2.5 border border-[#DDE0EA] rounded-[8px]" /></div>
          <div><label className="block text-xs font-semibold mb-1">Căn cứ / lý do xác nhận hết nghĩa vụ</label>
            <textarea required rows={3} value={releaseReason} onChange={e => setReleaseReason(e.target.value)} className="w-full p-2.5 border border-[#DDE0EA] rounded-[8px]" placeholder="Ví dụ: Mua hàng đã xác nhận hoàn tất đặt hàng, phần chênh lệch không còn nghĩa vụ." /></div>
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={procurementConfirmed} onChange={e => setProcurementConfirmed(e.target.checked)} />
            Tôi đã kiểm tra xác nhận của Mua hàng và bảo đảm số tiền này không còn nghĩa vụ phát sinh.</label>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setReleaseTarget(null)}>Hủy</Button><Button type="submit" variant="primary">Xác nhận giải phóng</Button></div>
        </form>
      </Modal>

      {/* Modal: Đề nghị điều chuyển nguồn (TO-BE 03) */}
      <Modal
        isOpen={isTransferModalOpen && financeCanRelease}
        onClose={() => setIsTransferModalOpen(false)}
        title="Lập đề nghị điều chuyển / bổ sung nguồn ngân sách"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs">
          <p className="text-xs text-[#62657A] m-0">
            Hệ thống chỉ cho phép điều chuyển từ số dư <strong>Khả dụng</strong> của nguồn xuất (không được lấy từ phần đang giữ, cam kết hoặc đã chi).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202039] mb-1">
                Nguồn xuất chuyển (Giảm nguồn) <span className="text-[#B42336]">*</span>
              </label>
              <select
                value={fromBudgetId}
                onChange={(e) => setFromBudgetId(e.target.value)}
                className="w-full p-2.5 text-xs bg-white border border-[#DDE0EA] rounded-[8px] focus:outline-none focus:border-[#5540C7]"
              >
                {budgetPools.map((bg) => {
                  const limit = bg.allocated + (bg.adjustments || 0);
                  const avail = Math.max(0, limit - bg.held - bg.committed - bg.used);
                  return (
                    <option key={bg.id} value={bg.id}>
                      {bg.name} (Khả dụng: {formatVND(avail)})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202039] mb-1">
                Nguồn tiếp nhận (Tăng nguồn) <span className="text-[#B42336]">*</span>
              </label>
              <select
                value={toBudgetId}
                onChange={(e) => setToBudgetId(e.target.value)}
                className="w-full p-2.5 text-xs bg-white border border-[#DDE0EA] rounded-[8px] focus:outline-none focus:border-[#5540C7]"
              >
                {budgetPools.map((bg) => (
                  <option key={bg.id} value={bg.id}>
                    {bg.name} ({bg.branchId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202039] mb-1">
              Số tiền điều chuyển (VND) <span className="text-[#B42336]">*</span>
            </label>
            <input
              type="number"
              required
              min="1000000"
              step="1000000"
              value={transferAmount || ''}
              onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 text-xs tabular-nums bg-white border border-[#DDE0EA] rounded-[8px] focus:outline-none focus:border-[#5540C7]"
            />
            <span className="text-[11px] text-[#5540C7] font-semibold mt-1 block">
              Hiển thị: {formatVND(transferAmount)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202039] mb-1">
              Lý do điều chuyển nguồn <span className="text-[#B42336]">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Nêu rõ lý do cần bổ sung hoặc điều chuyển kinh phí..."
              className="w-full p-2.5 text-xs border border-[#DDE0EA] rounded-[8px] focus:outline-none focus:border-[#5540C7]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE0EA]">
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setIsTransferModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="small">
              Trình Ban Giám đốc phê duyệt điều chuyển
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
