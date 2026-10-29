/** Procure UI – functional, role-scoped finance/procurement reports. */
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { canViewAllRegions, primaryRole } from '../domain/rules';
import { formatVND, getPRStatusBadgeInfo } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { FileSpreadsheet, FileText } from 'lucide-react';

type ReportTab = 'BUDGET_USAGE' | 'WAITING_FUNDS' | 'PROCUREMENT' | 'PENDING_RECEIPT' | 'ACCOUNTING';
const money = (n: number) => formatVND(n);
const effectiveAmount = (pr: {totalAmount:number; effectiveVersion:number; versions: {versionNumber:number; isEffective:boolean; totalAmount:number}[]}) =>
  pr.versions.find(v => v.versionNumber === pr.effectiveVersion && v.isEffective)?.totalAmount ?? pr.totalAmount;

export const ReportsView: React.FC = () => {
  const { currentUser, budgetPools, purchaseRequests, currentBranchScope, addToast } = useApp();
  const [requestedTab, setRequestedTab] = useState<ReportTab>('BUDGET_USAGE');
  const actor=primaryRole(currentUser);
  const isProcurement=actor==='procurement';
  const isFinance=actor==='finance';
  const isAccountant=actor==='accountant';
  const permittedTabs: ReportTab[] = isProcurement
    ? ['PROCUREMENT', 'PENDING_RECEIPT']
    : isFinance ? ['BUDGET_USAGE', 'WAITING_FUNDS']
    : isAccountant ? ['ACCOUNTING']
    : ['BUDGET_USAGE', 'WAITING_FUNDS', 'PROCUREMENT', 'PENDING_RECEIPT'];
  const activeTab = permittedTabs.includes(requestedTab) ? requestedTab : permittedTabs[0];
  const viewAll = currentBranchScope === 'ALL' && canViewAllRegions(currentUser);
  const filteredBudgets = budgetPools.filter(b => viewAll || b.branchId === currentBranchScope);
  const filteredPRs = purchaseRequests.filter(pr => viewAll || pr.branchId === currentBranchScope);
  const purchasePRs = filteredPRs.filter(pr => ['APPROVED','IN_PROGRESS','COMPLETED'].includes(pr.status) ||
    (pr.effectiveVersion > 0 && pr.versions.some(v => v.versionNumber === pr.effectiveVersion && v.isEffective)));
  const waitingFunds = filteredPRs.filter(pr => pr.status === 'WAITING_FUNDS');
  const pendingHandoff = purchasePRs.filter(pr => pr.status !== 'COMPLETED' && !pr.execution?.receivedAt);
  const displayAccounting = activeTab==='ACCOUNTING';
  const displayBudgets = activeTab === 'BUDGET_USAGE';
  const displayWaitingFunds = activeTab === 'WAITING_FUNDS';
  const rowsToShow = activeTab === 'PENDING_RECEIPT' ? pendingHandoff : purchasePRs;
  const scope = viewAll ? 'Toàn công ty' : currentBranchScope;

  const titles: Record<ReportTab, string> = {
    BUDGET_USAGE: 'Sử dụng ngân sách',
    WAITING_FUNDS: 'Đề nghị chờ nguồn',
    PROCUREMENT: 'Tiến độ mua hàng',
    PENDING_RECEIPT: 'Chờ tiếp nhận mua hàng',
    ACCOUNTING: 'Đối soát chi phí & công nợ cam kết',
  };

  // Export is generated from the CURRENT visible dataset and current role, never from unfiltered global data.
  const exportRows = (): (string | number)[][] => {
    if (displayAccounting) return [
      ['Mã nguồn','Tên nguồn','Khu vực','Phòng ban','Cam kết chưa ghi nhận','Chi phí đã ghi nhận'],
      ...filteredBudgets.map(b=>[b.id,b.name,b.branchId,b.departmentName,b.committed,b.used]),
    ];
    if (displayBudgets) return [
      ['Mã nguồn','Tên nguồn','Khu vực','Phòng ban','Hạn mức','Đang giữ','Cam kết','Đã dùng','Khả dụng'],
      ...filteredBudgets.map(b => [b.id,b.name,b.branchId,b.departmentName,b.allocated + (b.adjustments || 0),b.held,b.committed,b.used,
        b.allocated + (b.adjustments || 0) - b.held - b.committed - b.used]),
    ];
    if (displayWaitingFunds) return [
      ['Mã đề nghị','Tên đề nghị','Khu vực','Phòng ban','Số tiền đề nghị','Trạng thái'],
      ...waitingFunds.map(pr => [pr.id,pr.title,pr.branchId,pr.departmentName,pr.totalAmount,'Chờ nguồn']),
    ];
    return [
      ['Mã đề nghị','Tên đề nghị','Khu vực','Phòng ban','Tình trạng','Giá trị duyệt','Đã đặt hàng','Nhà cung cấp','Tham chiếu PO'],
      ...rowsToShow.map(pr => [pr.id,pr.title,pr.branchId,pr.departmentName,
        pr.status==='COMPLETED' ? 'Hoàn tất' : pr.execution?.actualOrderedAmount ? 'Đã ghi nhận PO' : pr.execution?.receivedAt ? 'Đã tiếp nhận' : 'Chờ tiếp nhận',
        effectiveAmount(pr),pr.execution?.actualOrderedAmount||0,pr.execution?.supplierName||'',pr.execution?.poReference||'']),
    ];
  };
  const exportCsv = () => {
    const content = '\uFEFF' + exportRows().map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
    link.href = url; link.download = `procure-${activeTab.toLowerCase()}-${scope.toLowerCase().replace(/\W+/g,'-')}.csv`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    addToast('Đã xuất dữ liệu đúng theo báo cáo và khu vực được phép.', 'success');
  };

  return <div className="space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[#202039]">{isProcurement ? 'Báo cáo mua hàng' : isFinance ? 'Báo cáo ngân sách' : isAccountant ? 'Báo cáo kế toán' : actor==='branch_director' ? 'Báo cáo chi nhánh' : 'Báo cáo toàn công ty'}</h1>
        <p className="text-xs text-[#62657A] mt-1">Phạm vi: {scope} · Dữ liệu nghiệp vụ trên máy chủ · {new Date().toLocaleDateString('vi-VN')}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" size="small" onClick={exportCsv} icon={<FileSpreadsheet className="w-4 h-4" />}>Xuất Excel (CSV)</Button>
        <Button variant="secondary" size="small" onClick={() => window.print()} icon={<FileText className="w-4 h-4" />}>In / Lưu PDF</Button>
      </div>
    </div>
    <div className="flex gap-2 overflow-x-auto border-b border-[#DDE0EA]" role="tablist" aria-label="Loại báo cáo">
      {permittedTabs.map(tab => <button key={tab} role="tab" aria-selected={tab===activeTab}
        onClick={() => setRequestedTab(tab)}
        className={`px-3 py-2.5 whitespace-nowrap text-sm font-semibold border-b-2 ${tab===activeTab ? 'border-[#5540C7] text-[#5540C7]' : 'border-transparent text-[#62657A]'}`}>{titles[tab]}</button>)}
    </div>
    <div className="bg-white border border-[#DDE0EA] rounded-[16px] overflow-hidden">
      <div className="p-4 border-b border-[#DDE0EA] flex items-center justify-between gap-2">
        <h2 className="font-bold text-[#202039]">{titles[activeTab]}</h2>
        <span className="text-xs text-[#62657A]">{(displayBudgets || displayAccounting) ? filteredBudgets.length : displayWaitingFunds ? waitingFunds.length : rowsToShow.length} dòng</span>
      </div>
      {displayAccounting ? <div className="overflow-x-auto">
        <table className="w-full text-sm text-left"><thead className="bg-[#F7F8FC] text-xs text-[#62657A]"><tr>
          <th className="p-3">Nguồn / Phòng ban</th><th className="p-3">Khu vực</th><th className="p-3 text-right">Chưa ghi nhận</th><th className="p-3 text-right">Đã ghi nhận</th>
        </tr></thead><tbody className="divide-y divide-[#DDE0EA]">
          {filteredBudgets.map(b=><tr key={b.id}><td className="p-3"><strong>{b.name}</strong><div className="text-xs text-[#62657A]">{b.departmentName}</div></td>
            <td className="p-3">{b.branchId}</td><td className="p-3 text-right tabular-nums">{money(b.committed)}</td><td className="p-3 text-right tabular-nums font-semibold text-[#176B49]">{money(b.used)}</td></tr>)}
          {filteredBudgets.length===0 && <tr><td colSpan={4} className="p-8 text-center text-[#62657A]">Không có dữ liệu kế toán ở khu vực này.</td></tr>}
        </tbody></table>
      </div> : displayBudgets ? <div className="overflow-x-auto">
        <table className="w-full text-sm text-left"><thead className="bg-[#F7F8FC] text-xs text-[#62657A]"><tr>
          <th className="p-3">Nguồn / Phòng ban</th><th className="p-3">Khu vực</th><th className="p-3 text-right">Hạn mức</th><th className="p-3 text-right">Giữ</th><th className="p-3 text-right">Cam kết</th><th className="p-3 text-right">Đã dùng</th><th className="p-3 text-right">Khả dụng</th>
        </tr></thead><tbody className="divide-y divide-[#DDE0EA]">
          {filteredBudgets.map(b => <tr key={b.id}>
            <td className="p-3"><strong>{b.name}</strong><div className="text-xs text-[#62657A]">{b.departmentName}</div></td>
            <td className="p-3">{b.branchId}</td><td className="p-3 text-right tabular-nums">{money(b.allocated + (b.adjustments||0))}</td>
            <td className="p-3 text-right tabular-nums">{money(b.held)}</td><td className="p-3 text-right tabular-nums">{money(b.committed)}</td><td className="p-3 text-right tabular-nums">{money(b.used)}</td>
            <td className="p-3 text-right tabular-nums font-semibold text-[#176B49]">{money(b.allocated + (b.adjustments||0) - b.held - b.committed - b.used)}</td>
          </tr>)}
          {filteredBudgets.length===0 && <tr><td colSpan={7} className="p-8 text-center text-[#62657A]">Không có nguồn ngân sách trong phạm vi này.</td></tr>}
        </tbody></table>
      </div> : displayWaitingFunds ? <div className="overflow-x-auto">
        <table className="w-full text-sm text-left"><thead className="bg-[#F7F8FC] text-xs text-[#62657A]"><tr>
          <th className="p-3">Mã</th><th className="p-3">Đề nghị</th><th className="p-3">Phòng ban</th><th className="p-3 text-right">Giá trị</th><th className="p-3">Trạng thái</th>
        </tr></thead><tbody className="divide-y divide-[#DDE0EA]">
          {waitingFunds.map(pr => <tr key={pr.id}><td className="p-3 text-[#5540C7] font-semibold">{pr.id}</td><td className="p-3">{pr.title}</td><td className="p-3">{pr.departmentName}</td><td className="p-3 text-right tabular-nums">{money(pr.totalAmount)}</td><td className="p-3"><Badge variant="amber">Chờ nguồn</Badge></td></tr>)}
          {waitingFunds.length===0 && <tr><td colSpan={5} className="p-8 text-center text-[#62657A]">Không có đề nghị đang chờ nguồn.</td></tr>}
        </tbody></table>
      </div> : <div className="overflow-x-auto">
        <table className="w-full text-sm text-left"><thead className="bg-[#F7F8FC] text-xs text-[#62657A]"><tr>
          <th className="p-3">Mã</th><th className="p-3">Đề nghị / Phòng ban</th><th className="p-3">Nhà cung cấp / PO</th><th className="p-3 text-right">Đã đặt hàng</th><th className="p-3">Tiến độ</th>
        </tr></thead><tbody className="divide-y divide-[#DDE0EA]">
          {rowsToShow.map(pr => {
            const status = getPRStatusBadgeInfo(pr.status);
            return <tr key={pr.id}><td className="p-3 text-[#5540C7] font-semibold">{pr.id}</td>
              <td className="p-3"><strong>{pr.title}</strong><div className="text-xs text-[#62657A]">{pr.departmentName}</div></td>
              <td className="p-3 text-xs">{pr.execution?.supplierName || 'Chưa chọn'}<div className="text-[#62657A]">{pr.execution?.poReference || 'Chưa có PO'}</div></td>
              <td className="p-3 text-right tabular-nums">{money(pr.execution?.actualOrderedAmount||0)}</td>
              <td className="p-3"><Badge variant={pr.status==='COMPLETED' ? 'green' : pr.execution?.actualOrderedAmount ? 'purple' : pr.execution?.receivedAt ? 'blue' : status.badgeClass}>{pr.status==='COMPLETED' ? 'Hoàn tất' : pr.execution?.actualOrderedAmount ? 'Đã ghi nhận PO' : pr.execution?.receivedAt ? 'Đang thực hiện' : 'Chờ tiếp nhận'}</Badge></td>
            </tr>;
          })}
          {rowsToShow.length===0 && <tr><td colSpan={5} className="p-8 text-center text-[#62657A]">Không có hồ sơ mua hàng phù hợp.</td></tr>}
        </tbody></table>
      </div>}
    </div>
  </div>;
};
