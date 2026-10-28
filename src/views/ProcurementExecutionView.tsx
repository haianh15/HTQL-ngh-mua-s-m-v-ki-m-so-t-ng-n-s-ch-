/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Procurement Execution View (UI-05, UC-TH01, UC-TH02, UC-NS06, UC-NS07)
 * Mua hàng tiếp nhận, chuyển Đang giữ -> Đã cam kết (không trừ lần hai) & giải phóng phần hết nghĩa vụ
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatVND } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { Modal } from '../components/common/Modal';
import { ShoppingBag, CheckCircle2, FileText, ArrowRight, ShieldCheck, DollarSign } from 'lucide-react';

export const ProcurementExecutionView: React.FC = () => {
  const {
    purchaseRequests, currentUser,
    receivePRForProcurement,
    recordActualPOOrder,
    releaseUncommittedRemainder,
    navigateTo,
    addToast,
  } = useApp();

  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [poAmount, setPoAmount] = useState<number>(0);

  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState<number>(0);
  const [releaseReason, setReleaseReason] = useState('');

  // Chỉ nhận các hồ sơ đã duyệt hợp lệ
  const approvedPRs = purchaseRequests.filter(p =>
    ['APPROVED','IN_PROGRESS','COMPLETED'].includes(p.status) ||
    (p.currentVersion > p.effectiveVersion && p.versions.some(v => v.versionNumber === p.effectiveVersion && v.isEffective))
  );
  const approvedAmount = (pr: typeof purchaseRequests[number]) => pr.versions.find(v => v.versionNumber === pr.effectiveVersion && v.isEffective)?.totalAmount || pr.totalAmount;


  const activePR = purchaseRequests.find((p) => p.id === selectedPrId);

  const handleOpenPoModal = (prId: string) => {
    const pr = purchaseRequests.find((p) => p.id === prId);
    if (!pr) return;
    setSelectedPrId(prId);
    setPoNumber(pr.execution?.poReference || `PO-2026-${pr.id.slice(-3)}`);
    setSupplierName(pr.execution?.supplierName || 'Công ty TNHH Cung cấp Thiết bị Công nghệ');
    setPoAmount(pr.execution?.actualOrderedAmount || approvedAmount(pr));
    setIsPoModalOpen(true);
  };

  const handleSavePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrId || !poNumber.trim() || !supplierName.trim() || poAmount <= 0) {
      addToast('Vui lòng điền đầy đủ số đơn hàng, nhà cung cấp và số tiền đặt hàng.', 'warning');
      return;
    }

    recordActualPOOrder(selectedPrId, poAmount, poNumber, supplierName);
    setIsPoModalOpen(false);
  };

  const handleOpenReleaseModal = (prId: string) => {
    const pr = purchaseRequests.find((p) => p.id === prId);
    if (!pr) return;
    setSelectedPrId(prId);
    const heldOriginal = approvedAmount(pr);
    const ordered = pr.execution?.actualOrderedAmount || 0;
    const diff = Math.max(0, heldOriginal - ordered);
    setReleaseAmount(diff);
    setReleaseReason('Giá đàm phán hợp đồng thấp hơn dự toán ban đầu, không còn nghĩa vụ phát sinh thêm.');
    setIsReleaseModalOpen(true);
  };

  const handleConfirmRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrId || releaseAmount <= 0 || !releaseReason.trim()) {
      addToast('Vui lòng nhập số tiền giải phóng hợp lệ và lý do xác nhận hết nghĩa vụ.', 'warning');
      return;
    }

    releaseUncommittedRemainder(selectedPrId, releaseAmount, releaseReason);
    setIsReleaseModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#202039] m-0">Thực hiện mua sắm</h1>
        <p className="text-xs text-[#62657A] mt-1 m-0">
          Phòng Mua hàng tiếp nhận hồ sơ đã phê duyệt, ghi nhận đơn đặt hàng (PO) và chuyển trạng thái ngân sách Đang giữ → Đã cam kết (TO-BE 02, UC-TH01, UC-TH02)
        </p>
      </div>

      {/* Info Callout */}
      <Alert variant="blue">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#2459AB] flex-shrink-0 mt-0.5" />
          <div>
            <strong>Quy tắc bất biến tài chính (TO-BE 02):</strong> Khi phát hành đơn đặt hàng (PO), số tiền từ <em>Đang giữ</em> chuyển sang <em>Đã cam kết</em>. Hệ thống tuyệt đối <strong>không trừ ngân sách khả dụng lần hai</strong>. Phần chênh lệch giảm chỉ được giải phóng khi Mua hàng & Tài chính xác nhận không còn nghĩa vụ phát sinh.
          </div>
        </div>
      </Alert>

      {/* Table hồ sơ đã duyệt bàn giao Mua hàng */}
      <div className="bg-white border border-[#DDE0EA] rounded-[16px] shadow-[0_4px_20px_rgba(32,32,57,0.03)] overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[#DDE0EA] flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-[#202039] m-0">
              Danh sách hồ sơ đã duyệt bàn giao ({approvedPRs.length})
            </h2>
            <span className="text-xs text-[#62657A]">
              Chỉ tiếp nhận các bản duyệt có hiệu lực pháp lý (Locked Effective Version)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F8FC] border-b border-[#DDE0EA] text-[#62657A] font-semibold">
                <th className="py-3 px-4">Mã & Bản hiệu lực</th>
                <th className="py-3 px-4">Tên đề nghị</th>
                <th className="py-3 px-4">Người đề nghị & Đơn vị</th>
                <th className="py-3 px-4 text-right">Số tiền duyệt (Giữ chỗ)</th>
                <th className="py-3 px-4 text-right">Giá trị đã đặt (Cam kết)</th>
                <th className="py-3 px-4">Tình trạng thực hiện</th>
                <th className="py-3 px-4 text-center">Thao tác Mua hàng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE0EA] text-sm">
              {approvedPRs.map((pr) => {
                const isReceived = pr.execution?.receivedAt !== undefined;
                const orderedAmount = pr.execution?.actualOrderedAmount || 0;
                const isUnderBudget = isReceived && orderedAmount < approvedAmount(pr);
                const hasReleased = (pr.execution?.releasedAmount || 0) > 0;

                return (
                  <tr key={pr.id} className="hover:bg-[#FAFAFE] transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#5540C7]">{pr.id}</span>
                      <div className="text-[11px] text-[#176B49] font-medium">
                        Bản hiệu lực: v{pr.effectiveVersion}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#202039] max-w-[220px] truncate">
                        {pr.title}
                      </div>
                      <div className="text-xs text-[#62657A]">{pr.budgetName}</div>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <div>{pr.createdByName}</div>
                      <div className="text-[#62657A]">{pr.departmentName}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold tabular-nums whitespace-nowrap text-[#202039]">
                      {formatVND(approvedAmount(pr))}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold tabular-nums whitespace-nowrap text-[#5540C7]">
                      {orderedAmount > 0 ? formatVND(orderedAmount) : 'Chưa đặt hàng'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {pr.status === 'COMPLETED' ? (
                        <Badge variant="green">Đã đối soát xong</Badge>
                      ) : orderedAmount > 0 ? (
                        <Badge variant="purple">Đã phát hành đơn mua</Badge>
                      ) : isReceived ? (
                        <Badge variant="blue">Đã tiếp nhận</Badge>
                      ) : (
                        <Badge variant="neutral">Chờ tiếp nhận</Badge>
                      )}

                      {pr.execution?.poReference && (
                        <div className="text-[11px] text-[#62657A] mt-0.5">
                          Số PO: <strong>{pr.execution.poReference}</strong>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {!isReceived ? (
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => receivePRForProcurement(pr.id)}
                          >
                            Tiếp nhận xử lý
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={() => handleOpenPoModal(pr.id)}
                              icon={<ShoppingBag className="w-3.5 h-3.5 text-[#5540C7]" />}
                            >
                              {orderedAmount > 0 ? 'Cập nhật PO' : 'Tạo cam kết PO'}
                            </Button>

                            {isUnderBudget && !hasReleased && currentUser?.roles.includes('finance') && (
                              <Button
                                variant="ghost"
                                size="small"
                                onClick={() => handleOpenReleaseModal(pr.id)}
                                title="Giải phóng số tiền giữ dôi dư"
                              >
                                Giải phóng dư
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Ghi nhận Cam kết PO */}
      <Modal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        title={`Ghi nhận thông tin thực hiện PO (${activePR?.id})`}
        maxWidth="md"
      >
        <form onSubmit={handleSavePO} className="space-y-4 text-xs">
          <Alert variant="amber">
            Hồ sơ đang giữ số tiền: <strong>{formatVND(activePR?.totalAmount || 0)}</strong>. Khi bạn xác nhận, số tiền sẽ được chuyển từ <em>Đang giữ</em> sang <em>Đã cam kết</em>.
          </Alert>

          <div>
            <label className="block text-xs font-semibold text-[#202039] mb-1">
              Số hợp đồng / Đơn đặt hàng (PO Reference) <span className="text-[#B42336]">*</span>
            </label>
            <input
              type="text"
              required
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="Ví dụ: PO-2026-HQ-012"
              className="w-full p-2.5 text-xs bg-white border border-[#DDE0EA] rounded-[8px] focus:outline-none focus:border-[#5540C7]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202039] mb-1">
              Nhà cung cấp được chọn <span className="text-[#B42336]">*</span>
            </label>
            <input
              type="text"
              required
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Tên nhà cung cấp trúng thầu..."
              className="w-full p-2.5 text-xs bg-white border border-[#DDE0EA] rounded-[8px] focus:outline-none focus:border-[#5540C7]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202039] mb-1">
              Giá trị đặt hàng thực tế (VND đã gồm thuế) <span className="text-[#B42336]">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              value={poAmount || ''}
              onChange={(e) => setPoAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 text-xs tabular-nums bg-white border border-[#DDE0EA] rounded-[8px] focus:outline-none focus:border-[#5540C7]"
            />
            <span className="text-[11px] text-[#62657A] mt-1 block">
              Hiển thị: <strong className="text-[#5540C7]">{formatVND(poAmount)}</strong>
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE0EA]">
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setIsPoModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="small">
              Xác nhận phát hành PO & Chuyển Cam kết
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Giải phóng ngân sách hết nghĩa vụ (Kịch bản C) */}
      <Modal
        isOpen={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
        title={`Giải phóng ngân sách dôi dư (${activePR?.id})`}
        maxWidth="md"
      >
        <form onSubmit={handleConfirmRelease} className="space-y-4 text-xs">
          <p className="text-xs text-[#62657A] m-0">
            Theo quy tắc TO-BE 02, nếu giá đàm phán hợp đồng thấp hơn mức dự toán được duyệt và hai bên đã ký kết hoàn chỉnh, phần dôi dư có thể được giải phóng hoàn lại nguồn khả dụng.
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#202039] mb-1">
              Số tiền đề nghị giải phóng (VND) <span className="text-[#B42336]">*</span>
            </label>
            <input
              type="number"
              required
              min="1000"
              value={releaseAmount || ''}
              onChange={(e) => setReleaseAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 text-xs tabular-nums bg-white border border-[#DDE0EA] rounded-[8px]"
            />
            <span className="text-[11px] text-[#176B49] font-medium mt-1 block">
              Số tiền hoàn lại khả dụng: {formatVND(releaseAmount)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202039] mb-1">
              Lý do xác nhận không còn nghĩa vụ thanh toán <span className="text-[#B42336]">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              className="w-full p-2.5 text-xs border border-[#DDE0EA] rounded-[8px]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE0EA]">
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setIsReleaseModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="small">
              Xác nhận giải phóng
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
