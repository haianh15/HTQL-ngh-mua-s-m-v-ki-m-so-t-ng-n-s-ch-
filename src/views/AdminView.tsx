/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Admin Management View (UI-09, AUTH-07, UC-QT01, UC-QT02, UC-QT03, UC-PD03, UC-PD04)
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BranchCode, UserRole } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Alert } from '../components/common/Alert';
import {
  Users,
  Sliders,
  UserCheck,
  Shield,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Building,
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const {
    users,
    delegations,
    auditLogs,
    toggleUserActive,
    updateUserRolesAndScope,
    createDelegation,
    revokeDelegation,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'USERS' | 'THRESHOLDS' | 'DELEGATIONS' | 'AUDIT'>('USERS');

  // Search in audit
  const [auditSearch, setAuditSearch] = useState('');

  // User Edit Modal
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<UserRole[]>([]);
  const [editBranch, setEditBranch] = useState<BranchCode>('HQ');

  // Create Delegation Modal
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [delegatorId, setDelegatorId] = useState(users[1]?.id || '');
  const [delegateeId, setDelegateeId] = useState(users[2]?.id || '');
  const [delegatedRole, setDelegatedRole] = useState<UserRole>('dept_head');
  const [maxLimit, setMaxLimit] = useState<number>(10000000);
  const [delegationReason, setDelegationReason] = useState('Nghỉ phép 05 ngày (Kịch bản D)');

  const editingUser = users.find((u) => u.id === editingUserId);

  const handleOpenEditUser = (u: typeof users[0]) => {
    setEditingUserId(u.id);
    setEditRoles(u.roles);
    setEditBranch(u.branchId);
  };

  const handleSaveUserPermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    updateUserRolesAndScope(editingUserId, editRoles, editBranch);
    setEditingUserId(null);
  };

  const handleCreateDelegation = (e: React.FormEvent) => {
    e.preventDefault();
    const fromUser = users.find((u) => u.id === delegatorId);
    const toUser = users.find((u) => u.id === delegateeId);
    if (!fromUser || !toUser) return;

    createDelegation({
      fromUserId: fromUser.id,
      fromUserName: fromUser.name,
      toUserId: toUser.id,
      toUserName: toUser.name,
      role: delegatedRole,
      maxAmountLimit: maxLimit,
      startDate: new Date().toLocaleDateString('vi-VN'),
      endDate: '05/11/2026',
      reason: delegationReason,
    });

    setIsDelegationModalOpen(false);
  };

  const filteredAudits = auditLogs.filter((log) => {
    if (!auditSearch.trim()) return true;
    const term = auditSearch.toLowerCase();
    return (
      log.userName.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      log.targetId.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#202039] m-0">Quản trị hệ thống</h1>
        <p className="text-xs text-[#62657A] mt-1 m-0">
          Quản lý tài khoản, phân quyền phạm vi 5 chi nhánh, hạn mức phê duyệt và nhật ký kiểm toán (UI-09, AUTH-07)
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DDE0EA] overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('USERS')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'USERS'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Tài khoản & Phân quyền ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('THRESHOLDS')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'THRESHOLDS'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Tuyến duyệt & Hạn mức</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DELEGATIONS')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'DELEGATIONS'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Ủy quyền phê duyệt</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-[#EFF0F5] text-[#62657A]">
            {delegations.filter((d) => d.isActive).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'AUDIT'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Nhật ký kiểm toán (Audit Trail)</span>
        </button>
      </div>

      {/* Tab 1: Quản lý người dùng & Phạm vi (AUTH-07, UC-QT01) */}
      {activeTab === 'USERS' && (
        <div className="bg-white border border-[#DDE0EA] rounded-[16px] shadow-[0_4px_20px_rgba(32,32,57,0.03)] overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#DDE0EA]">
            <h2 className="text-base font-bold text-[#202039] m-0">
              Danh sách tài khoản & Phân quyền phạm vi chi nhánh (AUTH-07)
            </h2>
            <p className="text-xs text-[#62657A] mt-1 m-0">
              Quản trị viên có quyền kích hoạt, vô hiệu hóa và gán vai trò cùng phạm vi truy cập dữ liệu
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F7F8FC] border-b border-[#DDE0EA] text-[#62657A] font-semibold">
                <tr>
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4">Email công việc</th>
                  <th className="py-3 px-4">Đơn vị & Chi nhánh</th>
                  <th className="py-3 px-4">Vai trò hệ thống</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE0EA] text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAFAFE]">
                    <td className="py-3 px-4 font-semibold text-[#202039]">
                      <div>{u.name}</div>
                      <div className="text-[11px] text-[#62657A]">{u.title}</div>
                    </td>
                    <td className="py-3 px-4 text-[#62657A]">{u.email}</td>
                    <td className="py-3 px-4 text-xs">
                      <div>{u.departmentName}</div>
                      <Badge variant="purple">{u.branchId}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded-[4px] bg-[#F7F8FC] border border-[#DDE0EA] text-[11px] font-medium"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={u.isActive ? 'green' : 'red'}>
                        {u.isActive ? 'Đang hoạt động' : 'Đã vô hiệu'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleOpenEditUser(u)}
                        >
                          Phân quyền
                        </Button>
                        <Button
                          variant={u.isActive ? 'danger' : 'secondary'}
                          size="small"
                          onClick={() => toggleUserActive(u.id)}
                        >
                          {u.isActive ? 'Khóa' : 'Kích hoạt'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Tuyến duyệt & Hạn mức (UC-PD03) */}
      {activeTab === 'THRESHOLDS' && (
        <div className="bg-white border border-[#DDE0EA] rounded-[16px] p-6 shadow-[0_4px_20px_rgba(32,32,57,0.03)] space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#202039] m-0">
              Cấu hình hạn mức phê duyệt theo BRD
            </h2>
            <p className="text-xs text-[#62657A] mt-1 m-0">
              Quy tắc phân cấp thẩm quyền phê duyệt cuối và kiểm tra giữ ngân sách an toàn
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-[12px] border border-[#DDE0EA] bg-[#F7F8FC] flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#E8F6EE] text-[#176B49] flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#202039] m-0">
                    Hạn mức nhỏ: Dưới 10.000.000 ₫
                  </h3>
                  <Badge variant="green">Trưởng đơn vị / Trưởng phòng</Badge>
                </div>
                <p className="text-xs text-[#62657A] mt-1 m-0">
                  Phê duyệt bước cuối: Trưởng phòng bộ phận. Sau khi duyệt hoàn tất, hệ thống tự động kiểm tra và giữ ngân sách.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-[12px] border border-[#DDE0EA] bg-[#F7F8FC] flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#FFF3D6] text-[#875000] flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#202039] m-0">
                    Hạn mức trung bình: Từ 10.000.000 ₫ đến dưới 50.000.000 ₫
                  </h3>
                  <Badge variant="amber">Giám đốc chi nhánh / Cấp tương ứng HQ</Badge>
                </div>
                <p className="text-xs text-[#62657A] mt-1 m-0">
                  Bắt buộc tối thiểu 02 báo giá cạnh tranh. Cấp duyệt cuối: Giám đốc chi nhánh hoặc cấp tương đương tại Trụ sở chính.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-[12px] border border-[#DDE0EA] bg-[#F7F8FC] flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#F0EDFF] text-[#5540C7] flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#202039] m-0">
                    Hạn mức lớn: Từ 50.000.000 ₫ trở lên
                  </h3>
                  <Badge variant="purple">Ban Giám đốc (BOD)</Badge>
                </div>
                <p className="text-xs text-[#62657A] mt-1 m-0">
                  Bắt buộc thẩm định kỹ thuật & kiểm tra ngân sách từ Tài chính. Cấp duyệt cuối: Ban Giám đốc (Tổng Giám Đốc / Phó TGĐ).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Ủy quyền phê duyệt (UC-PD04) */}
      {activeTab === 'DELEGATIONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#202039] m-0">
                Danh sách ủy quyền phê duyệt (Kịch bản D)
              </h2>
              <p className="text-xs text-[#62657A] mt-0.5 m-0">
                Ủy quyền quyền hạn duyệt cho cấp phó khi người quản lý đi công tác hoặc nghỉ phép
              </p>
            </div>
            <Button
              variant="primary"
              size="small"
              onClick={() => setIsDelegationModalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Thiết lập ủy quyền mới
            </Button>
          </div>

          <div className="bg-white border border-[#DDE0EA] rounded-[16px] shadow-[0_4px_20px_rgba(32,32,57,0.03)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F7F8FC] border-b border-[#DDE0EA] text-[#62657A] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Người ủy quyền (Gốc)</th>
                    <th className="py-3 px-4">Người nhận ủy quyền</th>
                    <th className="py-3 px-4">Vai trò ủy quyền</th>
                    <th className="py-3 px-4">Thời gian hiệu lực</th>
                    <th className="py-3 px-4">Lý do ủy quyền</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE0EA] text-sm">
                  {delegations.map((d) => (
                    <tr key={d.id} className="hover:bg-[#FAFAFE]">
                      <td className="py-3.5 px-4 font-bold text-[#202039]">{d.fromUserName}</td>
                      <td className="py-3.5 px-4 font-bold text-[#5540C7]">{d.toUserName}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant="purple">{d.role}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#62657A]">
                        {d.startDate} — {d.endDate}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#202039] max-w-[200px] truncate">
                        {d.reason}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={d.isActive ? 'green' : 'neutral'}>
                          {d.isActive ? 'Đang hiệu lực' : 'Đã thu hồi'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {d.isActive && (
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => revokeDelegation(d.id)}
                          >
                            Thu hồi
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Trail (UC-QT03) */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white border border-[#DDE0EA] rounded-[16px] shadow-[0_4px_20px_rgba(32,32,57,0.03)] overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#DDE0EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#202039] m-0">
                Nhật ký kiểm toán hệ thống (Audit Trail)
              </h2>
              <span className="text-xs text-[#62657A]">
                Lưu giữ vết giao dịch, IP, thời điểm và tác tử xử lý bất biến (UC-QT03)
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#62657A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Tìm người dùng, thao tác, IP..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#DDE0EA] rounded-[8px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F7F8FC] border-b border-[#DDE0EA] text-[#62657A] font-semibold">
                <tr>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                  <th className="py-3 px-4">Hành động</th>
                  <th className="py-3 px-4">Mã đối tượng</th>
                  <th className="py-3 px-4">Chi tiết sự kiện</th>
                  <th className="py-3 px-4 text-center">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE0EA]">
                {filteredAudits.map((a) => (
                  <tr key={a.id} className="hover:bg-[#FAFAFE]">
                    <td className="py-2.5 px-4 whitespace-nowrap text-[#62657A]">{a.timestamp}</td>
                    <td className="py-2.5 px-4 font-semibold text-[#202039] whitespace-nowrap">
                      {a.userName}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#F0EDFF] text-[#5540C7] font-semibold text-[11px]">
                        {a.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-[#202039] whitespace-nowrap">
                      {a.targetId}
                    </td>
                    <td className="py-2.5 px-4 text-[#4E4868] text-xs max-w-sm">
                      {a.details}
                    </td>
                    <td className="py-2.5 px-4 text-center text-[#62657A] font-mono whitespace-nowrap">
                      {a.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Edit User Permissions (AUTH-07) */}
      <Modal
        isOpen={!!editingUserId}
        onClose={() => setEditingUserId(null)}
        title={`Phân quyền & Phạm vi chi nhánh (${editingUser?.name})`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveUserPermissions} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#202039] mb-1">
              Phạm vi Chi nhánh quản lý:
            </label>
            <select
              value={editBranch}
              onChange={(e) => setEditBranch(e.target.value as BranchCode)}
              className="w-full p-2.5 text-xs bg-white border border-[#DDE0EA] rounded-[8px]"
            >
              <option value="HQ">Trụ sở chính Hà Nội (HQ)</option>
              <option value="BR_HN">Chi nhánh Hà Nội</option>
              <option value="BR_HCM">Chi nhánh TP. Hồ Chí Minh</option>
              <option value="BR_DN">Chi nhánh Đà Nẵng</option>
              <option value="BR_CT">Chi nhánh Cần Thơ</option>
              <option value="BR_HP">Chi nhánh Hải Phòng</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202039] mb-1">
              Các vai trò được cấp:
            </label>
            <div className="grid grid-cols-2 gap-2 p-2 bg-[#F7F8FC] rounded-[8px] border border-[#DDE0EA]">
              {[
                { id: 'requester', label: 'Nhân viên đề nghị' },
                { id: 'dept_head', label: 'Trưởng phòng / Quản lý' },
                { id: 'branch_director', label: 'Giám đốc chi nhánh' },
                { id: 'finance', label: 'Tài chính ngân sách' },
                { id: 'procurement', label: 'Phòng Mua hàng' },
                { id: 'accountant', label: 'Kế toán đối soát' },
                { id: 'bod', label: 'Ban Giám đốc (BOD)' },
                { id: 'admin', label: 'Quản trị hệ thống' },
              ].map((r) => {
                const checked = editRoles.includes(r.id as UserRole);
                return (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setEditRoles(editRoles.filter((x) => x !== r.id));
                        } else {
                          setEditRoles([...editRoles, r.id as UserRole]);
                        }
                      }}
                      className="rounded text-[#5540C7]"
                    />
                    <span>{r.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE0EA]">
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setEditingUserId(null)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="small">
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Delegation */}
      <Modal
        isOpen={isDelegationModalOpen}
        onClose={() => setIsDelegationModalOpen(false)}
        title="Thiết lập ủy quyền phê duyệt"
        maxWidth="md"
      >
        <form onSubmit={handleCreateDelegation} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#202039] mb-1">
              Người ủy quyền (Vắng mặt) <span className="text-[#B42336]">*</span>
            </label>
            <select
              value={delegatorId}
              onChange={(e) => setDelegatorId(e.target.value)}
              className="w-full p-2.5 text-xs bg-white border border-[#DDE0EA] rounded-[8px]"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.title})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202039] mb-1">
              Người nhận ủy quyền <span className="text-[#B42336]">*</span>
            </label>
            <select
              value={delegateeId}
              onChange={(e) => setDelegateeId(e.target.value)}
              className="w-full p-2.5 text-xs bg-white border border-[#DDE0EA] rounded-[8px]"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.title})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202039] mb-1">
              Lý do ủy quyền <span className="text-[#B42336]">*</span>
            </label>
            <input
              type="text"
              required
              value={delegationReason}
              onChange={(e) => setDelegationReason(e.target.value)}
              className="w-full p-2.5 text-xs bg-white border border-[#DDE0EA] rounded-[8px]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE0EA]">
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setIsDelegationModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="small">
              Kích hoạt ủy quyền
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
