/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Accounting Reconciliation & File Import View (UI-08, UC-TH03, UC-TH04, UC-NS09)
 * Nhập tệp kế toán, đối soát hóa đơn GTGT và chuyển Đã cam kết -> Đã sử dụng (không trừ 2 lần)
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AccountingImportRow } from '../types';
import { formatVND } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { Receipt, Upload, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

export const AccountingReconciliationView: React.FC = () => {
  const {
    accountingBatches,
    importAccountingFile,
    commitAccountingBatch,
    addToast,
  } = useApp();

  const handleCSVImport = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      addToast('Vui lòng xuất bảng tính Excel thành CSV UTF-8 trước khi nhập.', 'warning'); return;
    }
    try {
      const text = (await file.text()).replace(/^\uFEFF/, '');
      const parseRow = (line: string) => {
        const values: string[] = []; let value = ''; let quoted = false;
        for (let i=0; i<line.length; i++) {
          const c = line[i];
          if (c === '"' && quoted && line[i+1] === '"') { value += '"'; i++; }
          else if (c === '"') quoted = !quoted;
          else if (c === ',' && !quoted) { values.push(value.trim()); value=''; }
          else value += c;
        }
        values.push(value.trim()); return values;
      };
      const lines = text.split(/\r?\n/).filter(l=>l.trim());
      if (lines.length < 2) throw new Error('Tệp thiếu dòng tiêu đề và dữ liệu.');
      const headers = parseRow(lines[0]).map(h=>h.toLowerCase());
      const expected = ['invoiceno','prid','budgetid','vendorname','amount','invoicedate'];
      if (expected.some(h=>!headers.includes(h))) throw new Error('Thiếu cột: ' + expected.filter(h=>!headers.includes(h)).join(', '));
      const rows: AccountingImportRow[] = lines.slice(1).map((line,i)=>{
        const fields = parseRow(line);
        const get = (key: string) => fields[headers.indexOf(key)] || '';
        return { rowId:i+1, invoiceNo:get('invoiceno'), prId:get('prid'), budgetId:get('budgetid'),
          vendorName:get('vendorname'), amount:Number(get('amount').replace(/\s/g,'')),
          invoiceDate:get('invoicedate'), department:get('department'), description:get('description'),
          validationStatus:'VALID', validationMessage:'' };
      });
      const batchId = await importAccountingFile(file.name,rows);
      if (batchId) setActiveBatchId(batchId);
    } catch (e) { addToast(`Không nhập được CSV: ${(e as Error).message}`, 'error'); }
  };

  const [activeBatchId, setActiveBatchId] = useState<string | null>(
    accountingBatches[0]?.id || null
  );

  const currentBatch = accountingBatches.find((b) => b.id === activeBatchId);

  const handleCommit = (batchId: string) => {
    void commitAccountingBatch(batchId);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#202039] m-0">Đối soát & Nhập liệu kế toán</h1>
          <p className="text-xs text-[#62657A] mt-1 m-0">
            Nhập file ghi nhận chi phí thực tế từ kế toán, chuyển Đã cam kết → Đã sử dụng (TO-BE 02, UC-TH03, UC-TH04)
          </p>
        </div>

        <label className="cursor-pointer inline-flex items-center gap-2 rounded-[10px] bg-white border border-[#DDE0EA] px-4 py-2 text-xs font-semibold text-[#5540C7]">
          <Upload className="w-4 h-4"/> Nhập CSV kế toán
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={e=>{const f=e.target.files?.[0]; if(f) void handleCSVImport(f); e.target.value='';}} />
        </label>

      </div>

      {/* Rules Banner */}
      <Alert variant="blue">
        <div className="flex items-start gap-2">
          <Receipt className="w-4 h-4 text-[#2459AB] flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong>Cơ chế đối soát tự động:</strong> Hệ thống đối chiếu số hóa đơn, mã hồ sơ PR và nguồn ngân sách. Các dòng hợp lệ khi xác nhận sẽ chuyển ngân sách từ <em>Đã cam kết</em> sang <em>Đã sử dụng</em> (không trừ khả dụng lần hai). Các dòng trùng lặp hoặc sai mã sẽ bị cách ly cảnh báo.
          </div>
        </div>
      </Alert>

      {/* Main Content: Batches selector & preview table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Batches list */}
        <div className="bg-white border border-[#DDE0EA] rounded-[16px] p-5 shadow-[0_4px_20px_rgba(32,32,57,0.03)] space-y-3">
          <h3 className="text-sm font-bold text-[#202039] uppercase tracking-wider text-xs m-0">
            Lịch sử các đợt nhập ({accountingBatches.length})
          </h3>

          {accountingBatches.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#62657A] italic">
              Chưa có tệp đối soát. Chọn <strong>"Nhập CSV kế toán"</strong> để bắt đầu.
            </div>
          ) : (
            <div className="space-y-2">
              {accountingBatches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setActiveBatchId(b.id)}
                  className={`w-full text-left p-3 rounded-[10px] border transition-colors cursor-pointer ${
                    activeBatchId === b.id
                      ? 'border-[#5540C7] bg-[#F0EDFF]'
                      : 'border-[#DDE0EA] hover:bg-[#F7F8FC]'
                  }`}
                >
                  <div className="font-bold text-xs text-[#202039] truncate">{b.fileName}</div>
                  <div className="flex items-center justify-between text-[11px] text-[#62657A] mt-1">
                    <span>{b.id}</span>
                    <Badge variant={b.status === 'COMMITTED' ? 'green' : 'amber'}>
                      {b.status === 'COMMITTED' ? 'Đã hạch toán' : 'Xem trước'}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Active Batch Preview & Rows */}
        <div className="lg:col-span-3 space-y-4">
          {currentBatch ? (
            <div className="bg-white border border-[#DDE0EA] rounded-[16px] p-5 sm:p-6 shadow-[0_4px_20px_rgba(32,32,57,0.03)]">
              {/* Batch Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DDE0EA]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-[#5540C7]">{currentBatch.id}</span>
                    <Badge variant={currentBatch.status === 'COMMITTED' ? 'green' : 'amber'}>
                      {currentBatch.status === 'COMMITTED' ? 'Đã nhập vào sổ sách' : 'Bản xem trước'}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-[#202039] m-0">
                    {currentBatch.fileName}
                  </h3>
                  <div className="text-xs text-[#62657A] mt-0.5">
                    Nhập bởi: <strong>{currentBatch.importedBy}</strong> · Lúc: {currentBatch.importedAt}
                  </div>
                </div>

                {currentBatch.status === 'PREVIEW' && (
                  <Button
                    variant="primary"
                    onClick={() => handleCommit(currentBatch.id)}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Xác nhận nhập {currentBatch.validRows} dòng hợp lệ
                  </Button>
                )}
              </div>

              {/* KPI metrics of batch */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 text-xs">
                <div className="p-3 bg-[#F7F8FC] rounded-[8px]">
                  <span className="text-[#62657A] block">Tổng số dòng:</span>
                  <strong className="text-base text-[#202039]">{currentBatch.totalRows}</strong>
                </div>

                <div className="p-3 bg-[#E8F6EE] rounded-[8px]">
                  <span className="text-[#176B49] block">Hợp lệ (Sẵn sàng):</span>
                  <strong className="text-base text-[#176B49]">{currentBatch.validRows}</strong>
                </div>

                <div className="p-3 bg-[#FFF3D6] rounded-[8px]">
                  <span className="text-[#875000] block">Trùng lặp hóa đơn:</span>
                  <strong className="text-base text-[#875000]">{currentBatch.duplicateRows}</strong>
                </div>

                <div className="p-3 bg-[#FDECEF] rounded-[8px]">
                  <span className="text-[#B42336] block">Lỗi không khớp PR:</span>
                  <strong className="text-base text-[#B42336]">{currentBatch.errorRows}</strong>
                </div>
              </div>

              {/* Rows Table */}
              <div className="overflow-x-auto border border-[#DDE0EA] rounded-[10px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F7F8FC] border-b border-[#DDE0EA] text-[#62657A] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3">Số HĐ GTGT</th>
                      <th className="py-2.5 px-3">Mã đề nghị</th>
                      <th className="py-2.5 px-3">Nhà cung cấp</th>
                      <th className="py-2.5 px-3 text-right">Số tiền chi</th>
                      <th className="py-2.5 px-3">Kiểm tra hợp lệ</th>
                      <th className="py-2.5 px-3">Chi tiết đối soát</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE0EA]">
                    {currentBatch.rows.map((row) => (
                      <tr key={row.rowId} className="hover:bg-[#FAFAFE]">
                        <td className="py-2.5 px-3 text-center text-[#62657A]">{row.rowId}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#202039] whitespace-nowrap">
                          {row.invoiceNo}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#5540C7] whitespace-nowrap">
                          {row.prId}
                        </td>
                        <td className="py-2.5 px-3 text-[#202039] truncate max-w-[180px]">
                          {row.vendorName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums text-[#202039] whitespace-nowrap">
                          {formatVND(row.amount)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {row.validationStatus === 'VALID' ? (
                            <Badge variant="green">Hợp lệ</Badge>
                          ) : row.validationStatus === 'DUPLICATE' ? (
                            <Badge variant="amber">Trùng số HĐ</Badge>
                          ) : (
                            <Badge variant="red">Không khớp</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#62657A] text-[11px] max-w-[220px]">
                          {row.validationMessage}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#DDE0EA] rounded-[16px] p-12 text-center">
              <Upload className="w-10 h-10 text-[#62657A] mx-auto mb-2" />
              <h3 className="text-base font-bold text-[#202039] mb-1">
                Chưa chọn đợt đối soát
              </h3>
              <p className="text-xs text-[#62657A] max-w-sm mx-auto mb-4">
                Chọn tệp CSV kế toán để kiểm tra hóa đơn, đối chiếu hồ sơ mua sắm và ghi nhận chi phí.
              </p>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
