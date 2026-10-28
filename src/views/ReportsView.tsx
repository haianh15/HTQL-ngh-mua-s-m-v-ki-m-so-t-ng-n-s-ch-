/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Reports and Analytics View (UI-07, UC-QT05, UC-QT06)
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatVND } from '../utils/formatters';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Download, FileSpreadsheet, FileText, Calendar, Filter, PieChart, TrendingUp } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { budgetPools, purchaseRequests, currentBranchScope, addToast } = useApp();
  const [reportType, setReportType] = useState<'BUDGET_USAGE' | 'OVERDUE' | 'BRANCH_SPEND'>('BUDGET_USAGE');

  const filteredBudgets = budgetPools.filter((b) =>
    currentBranchScope === 'ALL' ? true : b.branchId === currentBranchScope
  );

  const handleExportExcel = () => {
    const rows: (string | number)[][] = [['Mã nguồn','Tên nguồn','Chi nhánh','Ngân sách được cấp','Điều chỉnh','Đang giữ','Cam kết','Đã sử dụng','Khả dụng']];
    filteredBudgets.forEach(b => rows.push([b.id,b.name,b.branchId,b.allocated,b.adjustments,b.held,b.committed,b.used,
      b.allocated+b.adjustments-b.held-b.committed-b.used]));
    const csv = '\uFEFF' + rows.map(row => row.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download='bao-cao-ngan-sach.csv'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    addToast('Đã xuất báo cáo CSV UTF-8 mở được bằng Excel.', 'success');
  };

  const handleExportPdf = () => {
    window.print();
    addToast('Chọn “Lưu thành PDF” trong hộp thoại in của trình duyệt.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#202039] m-0">Báo cáo & Phân tích chi phí</h1>
          <p className="text-xs text-[#62657A] mt-1 m-0">
            Tổng hợp dữ liệu ngân sách, tình hình phê duyệt và đối soát chi phí (UC-QT05, UC-QT06)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="small"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-4 h-4 text-[#176B49]" />}
          >
            Xuất Excel (CSV)
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={handleExportPdf}
            icon={<FileText className="w-4 h-4 text-[#B42336]" />}
          >
            In / Lưu PDF
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DDE0EA]">
        <button
          type="button"
          onClick={() => setReportType('BUDGET_USAGE')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            reportType === 'BUDGET_USAGE'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          Tỷ lệ sử dụng ngân sách
        </button>

        <button
          type="button"
          onClick={() => setReportType('BRANCH_SPEND')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            reportType === 'BRANCH_SPEND'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          Phân bổ theo Chi nhánh & Phòng ban
        </button>

        <button
          type="button"
          onClick={() => setReportType('OVERDUE')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            reportType === 'OVERDUE'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          Hồ sơ quá hạn & Xung đột nguồn
        </button>
      </div>

      {/* Report Table */}
      <div className="bg-white border border-[#DDE0EA] rounded-[16px] shadow-[0_4px_20px_rgba(32,32,57,0.03)] overflow-hidden">
        <div className="p-5 border-b border-[#DDE0EA] flex items-center justify-between">
          <div className="text-xs text-[#62657A]">
            Kỳ báo cáo: <strong>Quý 4/2026</strong> · Ngày xuất: <strong>{new Date().toLocaleDateString('vi-VN')}</strong>
          </div>
          <Badge variant="green">Dữ liệu đối soát cập nhật thời gian thực</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#F7F8FC] border-b border-[#DDE0EA] text-[#62657A] font-semibold">
              <tr>
                <th className="py-3 px-4">Tên nguồn / Đơn vị</th>
                <th className="py-3 px-4 text-center">Chi nhánh</th>
                <th className="py-3 px-4 text-right">Hạn mức được cấp</th>
                <th className="py-3 px-4 text-right">Đang giữ</th>
                <th className="py-3 px-4 text-right">Đã cam kết</th>
                <th className="py-3 px-4 text-right">Đã sử dụng</th>
                <th className="py-3 px-4 text-right">Còn khả dụng</th>
                <th className="py-3 px-4 text-center">Tỷ lệ sử dụng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE0EA] text-sm">
              {filteredBudgets.map((b) => {
                const limit = b.allocated + (b.adjustments || 0);
                const avail = Math.max(0, limit - b.held - b.committed - b.used);
                const usedPct = limit > 0 ? ((b.used + b.committed) / limit) * 100 : 0;

                return (
                  <tr key={b.id} className="hover:bg-[#FAFAFE]">
                    <td className="py-3.5 px-4 font-semibold text-[#202039]">
                      <div>{b.name}</div>
                      <div className="text-xs text-[#62657A]">{b.departmentName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-xs text-[#5540C7]">{b.branchId}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-[#202039] font-medium">
                      {formatVND(limit)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-[#62657A]">
                      {formatVND(b.held)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-[#5540C7]">
                      {formatVND(b.committed)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-[#202039] font-semibold">
                      {formatVND(b.used)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-[#176B49] font-bold">
                      {formatVND(avail)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={usedPct > 80 ? 'amber' : 'neutral'}>
                        {usedPct.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
