/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Purchase Requests List View (UI-01, UC-MS04)
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatVND, getPRStatusBadgeInfo } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PRStatus, BranchCode } from '../types';
import { canAccessScreen, canReadRequest, isRequesterRole } from '../domain/rules';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

export const PurchaseRequestsView: React.FC = () => {
  const { purchaseRequests, currentBranchScope, navigateTo, currentUser } = useApp();
  const requesterOnly = isRequesterRole(currentUser);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'WAITING_FUNDS' | 'DRAFT'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Tập hồ sơ có quyền đọc là nguồn dữ liệu DUY NHẤT cho bảng, tab và tìm kiếm.
  // Với nhân viên đề nghị, quyền sở hữu theo ID người tạo được áp dụng trước mọi bộ lọc.
  const visiblePRs = useMemo(() => purchaseRequests.filter(pr =>
    canReadRequest(currentUser, pr) &&
    (!requesterOnly || pr.createdById === currentUser?.id) &&
    (requesterOnly || currentBranchScope === 'ALL' || pr.branchId === currentBranchScope)
  ), [purchaseRequests, currentUser, requesterOnly, currentBranchScope]);

  // Filter & Search
  const filteredPRs = useMemo(() => {
    return visiblePRs.filter((pr) => {
      // Tab filter
      if (activeTab === 'PENDING') {
        if (!['PENDING_DEPT', 'PENDING_FINANCE', 'PENDING_FINAL'].includes(pr.status)) return false;
      } else if (activeTab === 'APPROVED') {
        if (!['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(pr.status)) return false;
      } else if (activeTab === 'WAITING_FUNDS') {
        if (pr.status !== 'WAITING_FUNDS') return false;
      } else if (activeTab === 'DRAFT') {
        if (pr.status !== 'DRAFT') return false;
      }

      // Dropdown status filter
      if (statusFilter !== 'ALL' && pr.status !== statusFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesId = pr.id.toLowerCase().includes(term);
        const matchesTitle = pr.title.toLowerCase().includes(term);
        const matchesCreator = pr.createdByName.toLowerCase().includes(term);
        const matchesDept = pr.departmentName.toLowerCase().includes(term);
        if (!matchesId && !matchesTitle && !matchesCreator && !matchesDept) return false;
      }

      return true;
    });
  }, [visiblePRs, activeTab, statusFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPRs.length / pageSize));
  const paginatedPRs = filteredPRs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tabs = [
    { id: 'ALL', label: requesterOnly ? 'Đề nghị của tôi' : 'Đề nghị trong phạm vi', count: visiblePRs.length },
    {
      id: 'PENDING',
      label: 'Đang chờ duyệt',
      count: visiblePRs.filter((p) =>
        ['PENDING_DEPT', 'PENDING_FINANCE', 'PENDING_FINAL'].includes(p.status)
      ).length,
    },
    {
      id: 'APPROVED',
      label: 'Đã duyệt & Thực hiện',
      count: visiblePRs.filter((p) =>
        ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(p.status)
      ).length,
    },
    {
      id: 'WAITING_FUNDS',
      label: 'Chờ nguồn',
      count: visiblePRs.filter((p) => p.status === 'WAITING_FUNDS').length,
    },
    {
      id: 'DRAFT',
      label: 'Bản nháp',
      count: visiblePRs.filter((p) => p.status === 'DRAFT').length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#202039] m-0">{requesterOnly ? 'Đề nghị của tôi' : 'Đề nghị mua sắm'}</h1>
          <p className="text-xs text-[#62657A] mt-1 m-0">
            {requesterOnly ? 'Chỉ hiển thị các đề nghị do bạn tạo. Bạn có thể lập mới, lưu nháp và theo dõi kết quả.' : 'Quản lý toàn bộ vòng đời đề xuất mua sắm hàng hóa, vật tư và thiết bị nội bộ (UC-MS01..07)'}
          </p>
        </div>
        {canAccessScreen(currentUser, 'PR_CREATE') && <Button
          variant="primary"
          onClick={() => navigateTo('PR_CREATE')}
          icon={<Plus className="w-4 h-4" />}
        >
          Tạo đề nghị mua sắm
        </Button>}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DDE0EA] overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id as any);
              setCurrentPage(1);
            }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-[#5540C7] text-[#5540C7]'
                : 'border-transparent text-[#62657A] hover:text-[#202039]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                activeTab === tab.id
                  ? 'bg-[#F0EDFF] text-[#5540C7]'
                  : 'bg-[#EFF0F5] text-[#62657A]'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 border border-[#DDE0EA] rounded-[12px] flex flex-col sm:flex-row gap-3 items-center justify-between shadow-[0_4px_20px_rgba(32,32,57,0.02)]">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#62657A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={requesterOnly ? 'Tìm trong các đề nghị của tôi...' : 'Tìm theo mã (PR-2026-...), tên hàng hóa, người tạo...'}
            className="w-full min-h-[40px] pl-9 pr-3 text-sm bg-white border border-[#DDE0EA] rounded-[10px] text-[#202039] focus:outline-none focus:border-[#5540C7]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#62657A]" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="min-h-[40px] text-xs sm:text-sm bg-white border border-[#DDE0EA] rounded-[10px] px-3 py-2 text-[#202039] focus:outline-none focus:border-[#5540C7]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PENDING_DEPT">Chờ xác nhận (Trưởng phòng)</option>
            <option value="PENDING_FINANCE">Chờ Tài chính</option>
            <option value="PENDING_FINAL">Chờ duyệt cuối</option>
            <option value="REVISION_REQUESTED">Cần bổ sung</option>
            <option value="WAITING_FUNDS">Chờ nguồn</option>
            <option value="APPROVED">Đã duyệt (Đã giữ ngân sách)</option>
            <option value="IN_PROGRESS">Đang thực hiện mua sắm</option>
            <option value="REJECTED">Từ chối</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="COMPLETED">Hoàn tất</option>
          </select>
        </div>
      </div>

      {/* Main PR Table */}
      <div className="bg-white border border-[#DDE0EA] rounded-[12px] shadow-[0_4px_20px_rgba(32,32,57,0.03)] overflow-hidden">
        {paginatedPRs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-[#F0EDFF] text-[#5540C7] flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#202039] mb-1">Không tìm thấy đề nghị nào</h3>
            <p className="text-xs text-[#62657A] max-w-sm mx-auto mb-4">
              Không có đề nghị mua sắm nào phù hợp với bộ lọc hiện tại. Thử thay đổi từ khóa tìm kiếm hoặc tạo mới.
            </p>
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setActiveTab('ALL');
              }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F8FC] border-b border-[#DDE0EA] text-xs font-semibold text-[#62657A]">
                  <th className="py-3 px-4">Mã & Phiên bản</th>
                  <th className="py-3 px-4">Tên đề nghị mua sắm</th>
                  <th className="py-3 px-4">Người đề nghị</th>
                  <th className="py-3 px-4">Đơn vị & Chi nhánh</th>
                  <th className="py-3 px-4 text-right">Tổng tiền (VND)</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Đang chờ xử lý</th>
                  <th className="py-3 px-4">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE0EA] text-sm">
                {paginatedPRs.map((pr) => {
                  const badge = getPRStatusBadgeInfo(pr.status);
                  return (
                    <tr
                      key={pr.id}
                      onClick={() => navigateTo('PR_DETAIL', pr.id)}
                      className="hover:bg-[#FAFAFE] cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#5540C7] hover:underline">
                          {pr.id}
                        </div>
                        <span className="text-[11px] text-[#62657A]">
                          v{pr.currentVersion} {pr.status === 'APPROVED' && '· Khóa hiệu lực'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#202039] max-w-[280px] line-clamp-1">
                          {pr.title}
                        </div>
                        <div className="text-xs text-[#62657A] truncate max-w-[280px]">
                          {pr.items[0]?.name || pr.purpose}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#202039]">
                        <div>{pr.createdByName}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#62657A]">
                        <div>{pr.departmentName}</div>
                        <div className="text-[11px]">{pr.branchId}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold tabular-nums whitespace-nowrap text-[#202039]">
                        {formatVND(pr.totalAmount)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant={badge.badgeClass}>{badge.label}</Badge>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#62657A]">
                        {pr.status === 'APPROVED' || pr.status === 'COMPLETED' ? (
                          <span className="text-[#176B49] font-medium">Hoàn tất phê duyệt</span>
                        ) : pr.status === 'REJECTED' || pr.status === 'CANCELLED' ? (
                          <span className="text-[#62657A]">Đã kết thúc</span>
                        ) : (
                          <span className="text-[#5540C7] font-semibold">
                            {pr.currentAssigneeName || pr.currentAssigneeRole}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#62657A]">
                        {pr.createdAt.split(' ')[0]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#DDE0EA] text-xs text-[#62657A] bg-white">
          <span>
            Hiển thị <strong>{paginatedPRs.length}</strong> / <strong>{filteredPRs.length}</strong> đề nghị
          </span>
          <div className="flex items-center gap-2">
            <span>
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-[6px] border border-[#DDE0EA] disabled:opacity-40 hover:bg-[#F7F8FC] cursor-pointer"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-[6px] border border-[#DDE0EA] disabled:opacity-40 hover:bg-[#F7F8FC] cursor-pointer"
              aria-label="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
