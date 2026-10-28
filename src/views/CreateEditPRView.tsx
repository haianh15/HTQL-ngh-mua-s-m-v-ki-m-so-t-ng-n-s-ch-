/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Create/Edit Purchase Request View (UI-02, UC-MS01, UC-MS02, UC-MS03)
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PRItem, PRAttachment } from '../types';
import { formatVND } from '../utils/formatters';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { Plus, Trash2, Upload, ArrowLeft, AlertCircle, FileCheck } from 'lucide-react';

export const CreateEditPRView: React.FC = () => {
  const {
    currentUser,
    activeScreen, selectedPrId, purchaseRequests, updateDraftPR, submitDraftPR,
    budgetPools,
    createPurchaseRequest,
    navigateTo,
    addToast,
  } = useApp();

  const editingPR = activeScreen === 'PR_EDIT' ? purchaseRequests.find(p => p.id === selectedPrId && p.status === 'DRAFT' && p.createdById === currentUser?.id) : undefined;
  const [title, setTitle] = useState(editingPR?.title || '');
  const [purpose, setPurpose] = useState(editingPR?.purpose || '');
  const [needByDate, setNeedByDate] = useState(editingPR?.needByDate || '15/11/2026');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>(
    editingPR?.budgetId || budgetPools.find((b) => b.departmentId === currentUser?.departmentId)?.id ||
      budgetPools[0]?.id ||
      ''
  );

  // Danh sách hạng mục
  const [items, setItems] = useState<PRItem[]>(editingPR?.items || [
    {
      id: 'item-1',
      name: '',
      specification: '',
      quantity: 1,
      unit: 'Chiếc',
      unitPrice: 0,
      taxRate: 8,
      totalPrice: 0,
    },
  ]);

  // Tài liệu đính kèm
  const [attachments, setAttachments] = useState<PRAttachment[]>(editingPR?.attachments || []);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tính toán ngân sách nguồn được chọn
  const selectedBudget = useMemo(() => {
    return budgetPools.find((b) => b.id === selectedBudgetId);
  }, [budgetPools, selectedBudgetId]);

  const availableBudget = useMemo(() => {
    if (!selectedBudget) return 0;
    const limit = selectedBudget.allocated + (selectedBudget.adjustments || 0);
    return Math.max(0, limit - selectedBudget.held - selectedBudget.committed - selectedBudget.used);
  }, [selectedBudget]);

  // Tổng tiền các hạng mục
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => sum + it.totalPrice, 0);
  }, [items]);

  const totalTax = totalAmount - subtotal;
  const showFinancialBalance = !currentUser?.roles.includes('requester') || currentUser.roles.length > 1;
  const isBudgetExceeded = showFinancialBalance && totalAmount > availableBudget;

  const handleItemChange = (index: number, field: keyof PRItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // Tự động tính lại totalPrice = quantity * unitPrice * (1 + taxRate/100)
      const qty = field === 'quantity' ? Number(value) : item.quantity;
      const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
      const vat = field === 'taxRate' ? Number(value) : item.taxRate;

      item.totalPrice = Math.round(qty * price * (1 + vat / 100));
      updated[index] = item;
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: '',
        specification: '',
        quantity: 1,
        unit: 'Chiếc',
        unitPrice: 0,
        taxRate: 8,
        totalPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      addToast('Đề nghị mua sắm phải có tối thiểu một hạng mục hàng hóa/dịch vụ.', 'warning');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSimulateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploading(true);
    const accepted: PRAttachment[] = [];
    for (const file of files) {
      if (file.size > 1_000_000 || !/\.(pdf|xlsx|docx|png|jpg|jpeg)$/i.test(file.name)) {
        addToast(`Không thể đính kèm ${file.name}: demo chỉ lưu tệp hợp lệ tối đa 1MB.`, 'error');
        continue;
      }
      try {
        const url = await new Promise<string>((resolve, reject)=>{
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Không đọc được tệp'));
          reader.readAsDataURL(file);
        });
        accepted.push({ id: `att-${Date.now()}-${accepted.length}`, name:file.name, size:file.size,
          uploadedAt:new Date().toLocaleString('vi-VN'), uploadedBy:currentUser?.name || 'Người tạo',
          url, type: /bao.?gia/i.test(file.name) ? 'quotation':'specification' });
      } catch { addToast(`Lỗi đọc nội dung tệp ${file.name}.`, 'error'); }
    }
    setAttachments(prev=>[...prev,...accepted]);
    setIsUploading(false);
    e.target.value='';
    if (accepted.length) addToast(`Đã lưu cục bộ ${accepted.length} tệp (chỉ trong trình duyệt demo).`, 'success');
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = 'Vui lòng nhập tên đề nghị mua sắm.';
    }
    if (!purpose.trim()) {
      errs.purpose = 'Vui lòng nêu rõ mục đích sử dụng.';
    }
    if (!selectedBudgetId) {
      errs.budget = 'Vui lòng chọn nguồn ngân sách chịu phí.';
    }

    const invalidItems = items.some((it) => !it.name.trim() || it.quantity <= 0 || it.unitPrice <= 0);
    if (invalidItems) {
      errs.items = 'Tất cả các hạng mục phải có tên, số lượng > 0 và đơn giá > 0.';
    }

    // BRD chưa quy định ngưỡng bắt buộc báo giá; chỉ cảnh báo khi thiếu hồ sơ theo chính sách sau khi chốt.

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (isDraft = false) => {
    if (!isDraft && !validate()) {
      addToast('Vui lòng kiểm tra lại các trường thông tin có lỗi bên dưới.', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      if (editingPR) {
        const submitted = updateDraftPR(editingPR.id, { title, purpose, needByDate, budgetId: selectedBudgetId, attachments }, items, !isDraft);
        setIsSubmitting(false);
        if (submitted) navigateTo('PR_DETAIL', editingPR.id);
        return;
      }
      const newPrId = createPurchaseRequest(
        {
          title: title || 'Bản nháp đề nghị',
          purpose,
          needByDate,
          budgetId: selectedBudgetId,
          attachments,
        },
        items,
        isDraft
      );

      setIsSubmitting(false);
      if (newPrId) navigateTo('PR_DETAIL', newPrId);
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top back & title */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateTo('PR_LIST')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#62657A] hover:text-[#202039] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách đề nghị</span>
        </button>
        <span className="text-xs text-[#62657A]">
          Người tạo: <strong>{currentUser?.name}</strong> ({currentUser?.departmentName})
        </span>
      </div>

      <div className="bg-white border border-[#DDE0EA] rounded-[16px] shadow-[0_4px_20px_rgba(32,32,57,0.03)] p-6 sm:p-8">
        <div className="border-b border-[#DDE0EA] pb-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#202039] m-0">
            Lập đề nghị mua sắm nội bộ
          </h1>
          <p className="text-xs text-[#62657A] mt-1 m-0">
            Nhập đầy đủ thông tin hàng hóa, chứng từ hỗ trợ và kiểm tra tác động nguồn ngân sách (SRS UC-MS01, UC-MS02, UC-MS03)
          </p>
        </div>

        {/* Thông tin chung */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[#202039] mb-1">
              Tên đề nghị mua sắm <span className="text-[#B42336]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Mua sắm 03 màn hình đồ họa cho nhóm thiết kế UI/UX"
              className={`w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border ${
                errors.title ? 'border-[#B42336]' : 'border-[#DDE0EA]'
              } rounded-[10px] text-[#202039] focus:outline-none focus:border-[#5540C7]`}
            />
            {errors.title && <span className="text-xs text-[#B42336] mt-1 block">{errors.title}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#202039] mb-1">
              Nguồn ngân sách chịu phí <span className="text-[#B42336]">*</span>
            </label>
            <select
              value={selectedBudgetId}
              onChange={(e) => setSelectedBudgetId(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-[#DDE0EA] rounded-[10px] text-[#202039] focus:outline-none focus:border-[#5540C7]"
            >
              {budgetPools.map((bg) => {
                const limit = bg.allocated + (bg.adjustments || 0);
                const avail = Math.max(0, limit - bg.held - bg.committed - bg.used);
                return (
                  <option key={bg.id} value={bg.id}>
                    {bg.name}{showFinancialBalance ? ` (Khả dụng: ${formatVND(avail)})` : ''}
                  </option>
                );
              })}
            </select>
            {showFinancialBalance && <span className="text-xs text-[#62657A] mt-1 block">
              Khả dụng hiện tại: <strong className="text-[#176B49]">{formatVND(availableBudget)}</strong>
            </span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#202039] mb-1">
              Thời hạn cần hàng (Need-by Date) <span className="text-[#B42336]">*</span>
            </label>
            <input
              type="text"
              value={needByDate}
              onChange={(e) => setNeedByDate(e.target.value)}
              placeholder="dd/MM/yyyy (ví dụ: 15/11/2026)"
              className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border border-[#DDE0EA] rounded-[10px] text-[#202039] focus:outline-none focus:border-[#5540C7]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[#202039] mb-1">
              Mục đích & Lý do đề xuất mua sắm <span className="text-[#B42336]">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Nêu rõ mục đích sử dụng, dự án hoặc yêu cầu công việc cụ thể..."
              className={`w-full p-3 text-sm bg-white border ${
                errors.purpose ? 'border-[#B42336]' : 'border-[#DDE0EA]'
              } rounded-[10px] text-[#202039] focus:outline-none focus:border-[#5540C7]`}
            />
            {errors.purpose && <span className="text-xs text-[#B42336] mt-1 block">{errors.purpose}</span>}
          </div>
        </div>

        {/* Bảng hạng mục mua sắm */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-[#202039] m-0">
                Chi tiết hạng mục hàng hóa / dịch vụ
              </h2>
              <span className="text-xs text-[#62657A]">
                Nhập số lượng, đơn giá trước thuế và thuế suất VAT từng hạng mục
              </span>
            </div>
            <Button
              variant="secondary"
              size="small"
              onClick={handleAddItem}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Thêm dòng
            </Button>
          </div>

          {errors.items && (
            <Alert variant="red" className="mb-3">
              {errors.items}
            </Alert>
          )}

          <div className="overflow-x-auto border border-[#DDE0EA] rounded-[10px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F7F8FC] text-[#62657A] border-b border-[#DDE0EA]">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Tên hàng hóa / Dịch vụ *</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Thông số / Quy cách</th>
                  <th className="py-2.5 px-3 w-20 text-center">SL *</th>
                  <th className="py-2.5 px-3 w-20 text-center">ĐVT</th>
                  <th className="py-2.5 px-3 min-w-[120px] text-right">Đơn giá (VND) *</th>
                  <th className="py-2.5 px-3 w-24 text-center">VAT (%)</th>
                  <th className="py-2.5 px-3 min-w-[130px] text-right">Thành tiền (VND)</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE0EA]">
                {items.map((it, idx) => (
                  <tr key={it.id} className="hover:bg-[#FAFAFE]">
                    <td className="py-2 px-3 text-center text-[#62657A]">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        placeholder="Tên mặt hàng..."
                        className="w-full p-1.5 border border-[#DDE0EA] rounded-[6px] focus:outline-none focus:border-[#5540C7]"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={it.specification}
                        onChange={(e) => handleItemChange(idx, 'specification', e.target.value)}
                        placeholder="Model, kích thước..."
                        className="w-full p-1.5 border border-[#DDE0EA] rounded-[6px] focus:outline-none focus:border-[#5540C7]"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 p-1.5 text-center border border-[#DDE0EA] rounded-[6px] focus:outline-none focus:border-[#5540C7]"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="text"
                        value={it.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-16 p-1.5 text-center border border-[#DDE0EA] rounded-[6px] focus:outline-none focus:border-[#5540C7]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        value={it.unitPrice || ''}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0"
                        className="w-28 p-1.5 text-right tabular-nums border border-[#DDE0EA] rounded-[6px] focus:outline-none focus:border-[#5540C7]"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <select
                        value={it.taxRate}
                        onChange={(e) => handleItemChange(idx, 'taxRate', parseFloat(e.target.value))}
                        className="p-1.5 border border-[#DDE0EA] rounded-[6px] focus:outline-none focus:border-[#5540C7]"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={8}>8%</option>
                        <option value={10}>10%</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-[#202039] tabular-nums whitespace-nowrap">
                      {formatVND(it.totalPrice)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-[#62657A] hover:text-[#B42336] p-1 cursor-pointer"
                        title="Xóa dòng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tổng tiền tổng hợp */}
          <div className="flex justify-end mt-4">
            <div className="w-full sm:w-80 bg-[#F7F8FC] p-4 rounded-[10px] border border-[#DDE0EA] space-y-2 text-xs">
              <div className="flex justify-between text-[#62657A]">
                <span>Tiền hàng (trước thuế):</span>
                <span className="font-semibold tabular-nums text-[#202039]">{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#62657A]">
                <span>Thuế GTGT (VAT):</span>
                <span className="font-semibold tabular-nums text-[#202039]">{formatVND(totalTax)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#DDE0EA] text-sm font-bold text-[#202039]">
                <span>Tổng cộng (đã gồm thuế):</span>
                <span className="text-[#5540C7] text-base tabular-nums">{formatVND(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cảnh báo kiểm tra ngân sách sơ bộ (TO-BE 01 Step 2) */}
        {showFinancialBalance && <div className="mb-6">
          {isBudgetExceeded ? (
            <Alert variant="amber">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#875000] flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Cảnh báo ngân sách sơ bộ:</strong> Đề nghị này ({formatVND(totalAmount)}) vượt quá số dư khả dụng hiện tại ({formatVND(availableBudget)}), thiếu {formatVND(totalAmount - availableBudget)}.
                  <div className="mt-1 text-xs text-[#875000]/90">
                    * Theo quy trình TO-BE 01, bạn vẫn có thể nộp đề nghị để Trưởng phòng xác nhận nhu cầu, nhưng Tài chính sẽ phải bổ sung nguồn trước khi có thể duyệt bước cuối và giữ ngân sách.
                  </div>
                </div>
              </div>
            </Alert>
          ) : (
            <Alert variant="green">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#176B49] flex-shrink-0" />
                <span>
                  Ngân sách khả dụng đủ chi trả ({formatVND(availableBudget)} khả dụng trước đề xuất). Dự kiến còn {formatVND(availableBudget - totalAmount)} sau phê duyệt.
                </span>
              </div>
            </Alert>
          )}
        </div>}

        {/* Đính kèm chứng từ / báo giá (UC-MS03) */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-[#202039] mb-1">
            Tài liệu & Báo giá đính kèm
          </label>
          <span className="text-xs text-[#62657A] block mb-2">
            Đính kèm báo giá, yêu cầu kỹ thuật hoặc chứng từ liên quan theo quy chế được phê duyệt
          </span>

          {errors.attachments && (
            <Alert variant="red" className="mb-3">
              {errors.attachments}
            </Alert>
          )}

          <div className="border-2 border-dashed border-[#DDE0EA] rounded-[10px] p-6 text-center hover:border-[#5540C7] transition-colors">
            <Upload className="w-8 h-8 text-[#62657A] mx-auto mb-2" />
            <div className="text-xs text-[#202039] font-semibold mb-1">
              Chọn tài liệu từ máy tính
            </div>
            <div className="text-[11px] text-[#62657A] mb-3">
              Demo lưu cục bộ PDF, Excel, Word hoặc ảnh tối đa 1MB/tệp; chưa tải lên máy chủ
            </div>

            <label className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-[8px] bg-[#F0EDFF] text-[#5540C7] hover:bg-[#E4DDFB] cursor-pointer">
              <span>{isUploading ? 'Đang tải lên...' : 'Chọn tệp đính kèm'}</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleSimulateUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Danh sách tệp đã tải */}
          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#F7F8FC] border border-[#DDE0EA] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#176B49]" />
                    <span className="font-medium text-[#202039]">{att.name}</span>
                    <span className="text-[#62657A]">
                      ({(att.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                    className="text-[#62657A] hover:text-[#B42336] p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DDE0EA]">
          <Button
            variant="ghost"
            onClick={() => navigateTo('PR_LIST')}
            disabled={isSubmitting}
          >
            Hủy bỏ
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSubmit(true)}
            isLoading={isSubmitting}
          >
            Lưu bản nháp
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSubmit(false)}
            isLoading={isSubmitting}
          >
            Gửi phê duyệt đề nghị
          </Button>
        </div>
      </div>
    </div>
  );
};
