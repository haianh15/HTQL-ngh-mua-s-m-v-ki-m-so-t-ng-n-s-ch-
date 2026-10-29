/**
 * Procure UI dashboard — separate financial-control and procurement workspaces.
 * Dữ liệu được AppContext giới hạn theo chi nhánh/quyền trước khi render.
 */
import React from 'react';
import { useApp } from '../context/AppContext';
import { canAccessScreen, canViewAllRegions, canApproveStep, primaryRole } from '../domain/rules';
import { formatVND, getPRStatusBadgeInfo } from '../utils/formatters';
import { BudgetDistributionBar } from '../components/common/BudgetDistributionBar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { ArrowRight, CheckSquare, ShoppingBag, PieChart, AlertTriangle } from 'lucide-react';

const card = 'bg-white border border-[#DDE0EA] rounded-[12px] p-5 shadow-[0_4px_20px_rgba(32,32,57,0.03)]';

const SummaryCard: React.FC<{ label: string; value: string; note: string; emphasize?: boolean }> = ({ label, value, note, emphasize }) => (
  <div className={card}>
    <span className="text-xs text-[#62657A] font-medium block mb-1">{label}</span>
    <strong className={`text-2xl block tabular-nums tracking-tight ${emphasize ? 'text-[#176B49]' : 'text-[#202039]'}`}>{value}</strong>
    <span className="text-[11px] text-[#62657A] mt-2 block">{note}</span>
  </div>
);

export const DashboardView: React.FC = () => {
  const { currentUser, budgetPools, purchaseRequests, currentBranchScope, navigateTo, delegations } = useApp();
  // Ưu tiên không gian Giám đốc nếu tài khoản được cấp quyền BOD.
  const financeWorkspace = primaryRole(currentUser)==='finance';
  const procurementWorkspace = primaryRole(currentUser)==='procurement';
  const accountantWorkspace = primaryRole(currentUser)==='accountant';
  const branchWorkspace = primaryRole(currentUser)==='branch_director';
  const bodWorkspace = primaryRole(currentUser)==='bod';
  const scopeAll = currentBranchScope === 'ALL' && canViewAllRegions(currentUser);
  const scopedPRs = purchaseRequests.filter(pr => scopeAll || pr.branchId === currentBranchScope);
  const scopedBudgets = budgetPools.filter(b => scopeAll || b.branchId === currentBranchScope);
  const location = scopeAll ? 'Toàn công ty (HQ + 5 chi nhánh)' : currentBranchScope;

  const activePurchasePRs = scopedPRs.filter(pr =>
    ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(pr.status) ||
    (pr.effectiveVersion > 0 && pr.versions.some(v => v.versionNumber === pr.effectiveVersion && v.isEffective))
  );
  const awaitingReceipt = activePurchasePRs.filter(pr => pr.status !== 'COMPLETED' && !pr.execution?.receivedAt);
  const inProgress = activePurchasePRs.filter(pr => pr.status !== 'COMPLETED' && !!pr.execution?.receivedAt);
  const finished = activePurchasePRs.filter(pr => pr.status === 'COMPLETED');
  const ordered = activePurchasePRs.filter(pr => (pr.execution?.actualOrderedAmount || 0) > 0);

  const allocated = scopedBudgets.reduce((s,b) => s + b.allocated + (b.adjustments || 0), 0);
  const held = scopedBudgets.reduce((s,b) => s + b.held, 0);
  const committed = scopedBudgets.reduce((s,b) => s + b.committed, 0);
  const used = scopedBudgets.reduce((s,b) => s + b.used, 0);
  const available = allocated - held - committed - used;
  const pendingFinance = scopedPRs.filter(pr => canApproveStep(currentUser, pr, delegations));
  const waitingFunds = scopedPRs.filter(pr => pr.status === 'WAITING_FUNDS');

  if (procurementWorkspace) {
    return (
      <div className="space-y-6">
        <div className="rounded-[16px] p-6 sm:p-8 bg-[#F0EDFF] border border-[#DED7FA]">
          <div className="text-xs uppercase font-bold tracking-wide text-[#5540C7]">Bộ phận Mua hàng · {location}</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#202039] mt-2">Tổng quan mua hàng</h1>
          <p className="text-sm text-[#62657A] my-3">Theo dõi hồ sơ đã phê duyệt, tiếp nhận thực hiện và ghi nhận đơn đặt hàng. Không quản lý hạn mức hay điều chuyển ngân sách.</p>
          <Button variant="primary" onClick={() => navigateTo('EXECUTION_LIST')} icon={<ShoppingBag className="w-4 h-4" />}>Tiếp nhận & thực hiện mua sắm</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Chờ Mua hàng tiếp nhận" value={String(awaitingReceipt.length)} note="Đề nghị có bản duyệt hiệu lực" />
          <SummaryCard label="Đang thực hiện" value={String(inProgress.length)} note="Hồ sơ đã tiếp nhận, chưa hoàn tất" />
          <SummaryCard label="Đã ghi nhận đặt hàng" value={String(ordered.length)} note="Hồ sơ có thông tin PO/cam kết" />
          <SummaryCard label="Đã hoàn tất" value={String(finished.length)} note="Hồ sơ hoàn thành đối soát" emphasize />
        </div>
        <div className={`${card} overflow-hidden !p-0`}>
          <div className="p-5 flex flex-wrap items-center justify-between gap-2 border-b border-[#DDE0EA]">
            <div>
              <h2 className="font-bold text-[#202039]">Hồ sơ mua hàng cần theo dõi</h2>
              <p className="text-xs text-[#62657A]">Chỉ các đề nghị đã được duyệt trong khu vực được phân công</p>
            </div>
            <button className="text-xs font-semibold text-[#5540C7] flex items-center gap-1" onClick={() => navigateTo('EXECUTION_LIST')}>Xem tất cả <ArrowRight className="w-4 h-4" /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm"><thead className="bg-[#F7F8FC] text-[#62657A] text-xs"><tr>
              <th className="p-3">Mã đề nghị</th><th className="p-3">Nội dung</th><th className="p-3">Đơn vị</th><th className="p-3">Nhà cung cấp / PO</th><th className="p-3">Tiến độ</th>
            </tr></thead><tbody className="divide-y divide-[#DDE0EA]">
              {activePurchasePRs.filter(pr => pr.status !== 'COMPLETED').slice(0, 6).map(pr => (
                <tr key={pr.id}>
                  <td className="p-3 font-semibold text-[#5540C7]">{pr.id}</td>
                  <td className="p-3 max-w-[240px] truncate">{pr.title}</td>
                  <td className="p-3 text-xs">{pr.departmentName}</td>
                  <td className="p-3 text-xs">{pr.execution?.supplierName || 'Chưa chọn'}<div className="text-[#62657A]">{pr.execution?.poReference || 'Chưa có PO'}</div></td>
                  <td className="p-3"><Badge variant={pr.execution?.actualOrderedAmount ? 'purple' : pr.execution?.receivedAt ? 'blue' : 'neutral'}>{pr.execution?.actualOrderedAmount ? 'Đã ghi nhận PO' : pr.execution?.receivedAt ? 'Đã tiếp nhận' : 'Chờ tiếp nhận'}</Badge></td>
                </tr>
              ))}
              {activePurchasePRs.filter(pr => pr.status !== 'COMPLETED').length === 0 && <tr><td colSpan={5} className="p-8 text-center text-[#62657A]">Không có hồ sơ đang chờ xử lý.</td></tr>}
            </tbody></table>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigateTo('PR_LIST')}>Tra cứu hồ sơ đã duyệt</Button>
          <Button variant="secondary" onClick={() => navigateTo('REPORTS')}>Xem báo cáo tiến độ mua hàng</Button>
        </div>
      </div>
    );
  }

  if (accountantWorkspace) {
    const pendingReconciliation = activePurchasePRs.filter(pr =>
      (pr.execution?.actualOrderedAmount || 0) > (pr.execution?.actualRecordedAmount || 0));
    return <div className="space-y-6">
      <div className="rounded-[16px] p-6 sm:p-8 bg-[#F0EDFF] border border-[#DED7FA]">
        <div className="text-xs uppercase font-bold tracking-wide text-[#5540C7]">Kế toán – Đối soát · {location}</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#202039] mt-2">Tổng quan kế toán</h1>
        <p className="text-sm text-[#62657A] my-3">Theo dõi hóa đơn, cam kết chưa ghi nhận và khoản chi đã đối soát; không điều chuyển ngân sách hay đặt hàng.</p>
        <Button variant="primary" onClick={()=>navigateTo('RECONCILIATION_IMPORT')}>Nhập chứng từ &amp; đối soát</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => navigateTo('PR_LIST')}>Tra cứu hồ sơ đã duyệt</Button>
        <Button variant="secondary" onClick={() => navigateTo('REPORTS')}>Xem báo cáo kế toán</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Cam kết chưa ghi nhận" value={formatVND(committed)} note="Đang chờ chứng từ hợp lệ" />
        <SummaryCard label="Đã ghi nhận chi phí" value={formatVND(used)} note="Chi phí sau đối soát" emphasize />
        <SummaryCard label="Hồ sơ chờ đối soát" value={String(pendingReconciliation.length)} note="Có PO, còn dư cam kết" />
        <SummaryCard label="Hồ sơ hoàn tất" value={String(finished.length)} note="Đã hoàn thành ghi nhận" />
      </div>
      <div className={card}>
        <div className="flex justify-between gap-3 items-center mb-4"><h2 className="font-bold text-[#202039]">Hồ sơ cần đối soát</h2>
          <button onClick={()=>navigateTo('RECONCILIATION_IMPORT')} className="text-xs text-[#5540C7] font-semibold">Mở đối soát</button></div>
        {pendingReconciliation.slice(0,8).map(pr=><div key={pr.id} className="flex justify-between gap-4 py-3 border-b border-[#DDE0EA] text-sm">
          <div><strong>{pr.id}</strong><div className="text-xs text-[#62657A]">{pr.title}</div></div>
          <strong className="tabular-nums">{formatVND((pr.execution?.actualOrderedAmount||0)-(pr.execution?.actualRecordedAmount||0))}</strong>
        </div>)}
        {pendingReconciliation.length===0 && <p className="text-sm text-[#62657A]">Không có hồ sơ chờ đối soát.</p>}
      </div>
    </div>;
  }

  // Finance receives a budget-focused workspace; BOD/branch director see a scoped
  // financial overview as well, but their full-company scope is controlled above.
  return (
    <div className="space-y-6">
      <div className="rounded-[16px] p-6 sm:p-8 bg-[#F0EDFF] border border-[#DED7FA]">
        <div className="text-xs uppercase font-bold tracking-wide text-[#5540C7]">{financeWorkspace ? 'Tài chính – Ngân sách' : branchWorkspace ? 'Giám đốc chi nhánh' : bodWorkspace ? 'Ban Giám đốc công ty' : 'Tổng quan điều hành'} · {location}</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#202039] mt-2">{financeWorkspace ? 'Tổng quan ngân sách' : branchWorkspace ? 'Tổng quan chi nhánh' : 'Tổng quan toàn công ty'}</h1>
        <p className="text-sm text-[#62657A] my-3">{financeWorkspace ? 'Kiểm tra nguồn, theo dõi hạn mức, số đang giữ, cam kết và số đã sử dụng tại khu vực được giao.' : `Tổng hợp hoạt động theo phạm vi được cấp của ${currentUser?.name || 'tài khoản'}.`}</p>
        <div className="flex flex-wrap gap-2">
          {canAccessScreen(currentUser, 'APPROVAL_QUEUE') && <Button variant="primary" onClick={() => navigateTo('APPROVAL_QUEUE')} icon={<CheckSquare className="w-4 h-4" />}>Kiểm tra đề nghị ({pendingFinance.length})</Button>}
          {canAccessScreen(currentUser, 'BUDGET_OVERVIEW') && <Button variant="secondary" onClick={() => navigateTo('BUDGET_OVERVIEW')} icon={<PieChart className="w-4 h-4" />}>Quản lý ngân sách</Button>}
          {canAccessScreen(currentUser, 'PR_LIST') && <Button variant="secondary" onClick={() => navigateTo('PR_LIST')}>Tra cứu đề nghị / Lập mới</Button>}
          {canAccessScreen(currentUser, 'REPORTS') && <Button variant="secondary" onClick={() => navigateTo('REPORTS')}>Báo cáo</Button>}
        </div>
      </div>
      {waitingFunds.length > 0 && <Alert variant="amber"><span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Có {waitingFunds.length} đề nghị đang chờ bổ sung nguồn ngân sách.</span></Alert>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Tổng hạn mức" value={formatVND(allocated)} note="Phân bổ + điều chỉnh ròng" />
        <SummaryCard label="Đang giữ" value={formatVND(held)} note="Đề nghị đã duyệt, chưa cam kết" />
        <SummaryCard label="Cam kết & đã dùng" value={formatVND(committed + used)} note={`${formatVND(committed)} cam kết · ${formatVND(used)} đã dùng`} />
        <SummaryCard label="Khả dụng" value={formatVND(available)} note="Hạn mức − giữ − cam kết − đã sử dụng" emphasize />
      </div>
      <div className={card}>
        <h2 className="font-bold text-[#202039] mb-3">Cơ cấu sử dụng ngân sách</h2>
        <BudgetDistributionBar allocated={allocated} held={held} committed={committed} used={used} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={card}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#202039]">Nguồn ngân sách khu vực</h2>
            {canAccessScreen(currentUser, 'BUDGET_OVERVIEW') && <button className="text-xs text-[#5540C7] font-semibold" onClick={() => navigateTo('BUDGET_OVERVIEW')}>Xem chi tiết</button>}
          </div>
          <div className="space-y-3">
            {scopedBudgets.slice(0, 5).map(b => <div key={b.id} className="flex justify-between gap-2 py-2 border-b border-[#DDE0EA] text-xs">
              <div><strong className="text-[#202039]">{b.name}</strong><div className="text-[#62657A]">{b.departmentName}</div></div>
              <span className="font-semibold tabular-nums text-[#176B49]">{formatVND(b.allocated + (b.adjustments || 0) - b.held - b.committed - b.used)}</span>
            </div>)}
            {scopedBudgets.length === 0 && <p className="text-sm text-[#62657A]">Không có nguồn ngân sách trong phạm vi được cấp.</p>}
          </div>
        </div>
        <div className={card}>
          <h2 className="font-bold text-[#202039] mb-3">Đề nghị cần kiểm soát nguồn</h2>
          <div className="space-y-3">
            {scopedPRs.filter(pr => canApproveStep(currentUser, pr, delegations)).slice(0,5).map(pr => {
              const state = getPRStatusBadgeInfo(pr.status);
              return <div className="flex items-center justify-between gap-3 text-xs py-2 border-b border-[#DDE0EA]" key={pr.id}>
                <div><strong className="text-[#5540C7]">{pr.id}</strong><div className="text-[#62657A] max-w-[220px] truncate">{pr.title}</div></div>
                <Badge variant={state.badgeClass}>{state.label}</Badge>
              </div>;
            })}
            {scopedPRs.every(pr => !['PENDING_FINANCE','WAITING_FUNDS'].includes(pr.status)) && <p className="text-sm text-[#62657A]">Chưa có hồ sơ cần kiểm tra nguồn.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
