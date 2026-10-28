/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — AppShell (Sidebar 232px, Header 72px, Content max 1280px)
 * Tuân thủ chính xác Design System layout & spacing
 */

import { canSeeBranch, canViewAllRegions, canViewDashboard, canAccessScreen } from '../../domain/rules';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveScreen, BranchCode } from '../../types';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  PieChart,
  ShoppingBag,
  Receipt,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Key,
  Menu,
  X,
  PlayCircle,
  Building2,
  ChevronDown,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  onOpenScenarioModal: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, onOpenScenarioModal }) => {
  const {
    currentUser,
    activeScreen,
    navigateTo,
    logout,
    currentBranchScope,
    setBranchScope,
    notifications,
    users,
    switchUserDemo, addToast,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isChangePwOpen, setIsChangePwOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Quyền kiểm soát menu theo vai trò
  const isApprover =
    currentUser?.roles.some((r) => ['dept_head', 'branch_director', 'finance', 'bod'].includes(r));
  const isFinance = currentUser?.roles.includes('finance') || currentUser?.roles.includes('bod');
  const isProcurement = currentUser?.roles.includes('procurement');
  const isAccountant = currentUser?.roles.includes('accountant') || currentUser?.roles.includes('finance');
  const isAdmin = currentUser?.roles.includes('admin');

  interface NavItem {
    id: ActiveScreen;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    visible: boolean;
  }

  const navItems: { group: string; items: NavItem[] }[] = [
    {
      group: 'Tổng quan & Nghiệp vụ',
      items: [
        {
          id: 'DASHBOARD',
          label: 'Tổng quan',
          icon: <LayoutDashboard className="w-4 h-4" />,
          visible: canViewDashboard(currentUser),
        },
        {
          id: 'PR_LIST',
          label: 'Đề nghị mua sắm',
          icon: <FileText className="w-4 h-4" />,
          visible: canAccessScreen(currentUser, 'PR_LIST'),
        },
        {
          id: 'APPROVAL_QUEUE',
          label: 'Hàng chờ phê duyệt',
          icon: <CheckSquare className="w-4 h-4" />,
          visible: canAccessScreen(currentUser, 'APPROVAL_QUEUE'),
        },
      ],
    },
    {
      group: 'Ngân sách & Thực hiện',
      items: [
        {
          id: 'BUDGET_OVERVIEW',
          label: 'Quản lý ngân sách',
          icon: <PieChart className="w-4 h-4" />,
          visible: canAccessScreen(currentUser, 'BUDGET_OVERVIEW'),
        },
        {
          id: 'EXECUTION_LIST',
          label: 'Thực hiện mua sắm',
          icon: <ShoppingBag className="w-4 h-4" />,
          visible: canAccessScreen(currentUser, 'EXECUTION_LIST'),
        },
        {
          id: 'RECONCILIATION_IMPORT',
          label: 'Đối soát & Nhập file',
          icon: <Receipt className="w-4 h-4" />,
          visible: canAccessScreen(currentUser, 'RECONCILIATION_IMPORT'),
        },
      ],
    },
    {
      group: 'Báo cáo & Quản trị',
      items: [
        {
          id: 'REPORTS',
          label: 'Báo cáo & Phân tích',
          icon: <BarChart3 className="w-4 h-4" />,
          visible: canAccessScreen(currentUser, 'REPORTS'),
        },
        {
          id: 'NOTIFICATIONS',
          label: 'Trung tâm thông báo',
          icon: <Bell className="w-4 h-4" />,
          badge: unreadCount > 0 ? unreadCount : undefined,
          visible: true,
        },
        {
          id: 'ADMIN_MANAGEMENT',
          label: 'Quản trị hệ thống',
          icon: <Settings className="w-4 h-4" />,
          visible: !!isAdmin,
        },
      ],
    },
  ];

  const handleNavClick = (screen: ActiveScreen) => {
    navigateTo(screen);
    setMobileMenuOpen(false);
  };

  const branchOptions: { id: BranchCode | 'ALL'; name: string }[] = [
    { id: 'ALL', name: '🏢 Toàn công ty (HQ + 5 Chi nhánh)' },
    { id: 'HQ', name: '🏛️ Trụ sở chính Hà Nội' },
    { id: 'BR_HN', name: '📍 Chi nhánh Hà Nội' },
    { id: 'BR_HCM', name: '📍 Chi nhánh TP. Hồ Chí Minh' },
    { id: 'BR_DN', name: '📍 Chi nhánh Đà Nẵng' },
    { id: 'BR_CT', name: '📍 Chi nhánh Cần Thơ' },
    { id: 'BR_HP', name: '📍 Chi nhánh Hải Phòng' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#202039] flex">
      {/* Sidebar Desktop (Width 232px) */}
      <aside className="hidden lg:flex flex-col w-[232px] fixed inset-y-0 left-0 bg-white border-r border-[#DDE0EA] z-30 overflow-y-auto">
        {/* Brand */}
        <div className="p-5 border-b border-[#DDE0EA]">
          <div className="text-2xl font-bold tracking-tight text-[#202039]">
            procure<span className="text-[#5540C7]"> UI</span>
          </div>
          <div className="text-[10px] font-bold text-[#62657A] tracking-wider uppercase mt-0.5">
            Design System · v1.0
          </div>
        </div>

        {/* Current User Scope Badge */}
        <div className="px-4 py-3 bg-[#F7F8FC] border-b border-[#DDE0EA]/70 text-xs">
          <div className="text-[#62657A] text-[11px]">Đang đăng nhập:</div>
          <div className="font-bold text-[#202039] truncate">{currentUser?.name}</div>
          <div className="text-[11px] text-[#5540C7] font-semibold truncate">
            {currentUser?.departmentName}
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-6">
          {navItems.map((group, gIdx) => {
            const visibleItems = group.items.filter((item) => item.visible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-[#62657A] mb-1.5">
                  {group.group}
                </div>
                {visibleItems.map((item) => {
                  const isActive = activeScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-[8px] transition-colors cursor-pointer text-left ${
                        isActive
                          ? 'bg-[#F0EDFF] text-[#5540C7] font-semibold'
                          : 'text-[#62657A] hover:bg-[#F7F8FC] hover:text-[#202039]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={isActive ? 'text-[#5540C7]' : 'text-[#62657A]'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#B42336] text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Scenario Test Button */}
        {currentUser?.roles.includes('bod') && <div className="p-3 border-t border-[#DDE0EA]">
          <button
            type="button"
            onClick={onOpenScenarioModal}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-[8px] bg-[#F0EDFF] text-[#5540C7] hover:bg-[#E4DDFB] transition-colors cursor-pointer border border-[#DED7FA]"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Tình huống minh họa (A–G)</span>
          </button>
        </div>}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#202039]/50 lg:hidden flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 bg-white h-full flex flex-col p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#DDE0EA]">
              <div className="text-xl font-bold">
                procure<span className="text-[#5540C7]"> UI</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1">
                <X className="w-5 h-5 text-[#62657A]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {navItems.map((group, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="text-[11px] font-bold text-[#62657A] uppercase px-2 mb-1">
                    {group.group}
                  </div>
                  {group.items
                    .filter((it) => it.visible)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-sm ${
                          activeScreen === item.id
                            ? 'bg-[#F0EDFF] text-[#5540C7] font-semibold'
                            : 'text-[#62657A]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[#B42336] text-white font-bold">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-[232px] min-w-0">
        {/* Header (Target Height 72px) */}
        <header className="h-[72px] bg-white border-b border-[#DDE0EA] px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-[8px] hover:bg-[#F7F8FC] text-[#62657A]"
              aria-label="Mở danh mục điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Scope Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#5540C7] hidden sm:block" />
              {canViewDashboard(currentUser) && <select
                value={currentBranchScope}
                onChange={(e) => setBranchScope(e.target.value as BranchCode | 'ALL')}
                className="text-xs sm:text-sm font-semibold bg-[#F7F8FC] border border-[#DDE0EA] rounded-[8px] px-2.5 py-1.5 text-[#202039] focus:outline-none focus:border-[#5540C7] cursor-pointer"
                title="Chọn phạm vi hiển thị dữ liệu chi nhánh"
              >
                {branchOptions.filter(opt => opt.id === 'ALL' ? canViewAllRegions(currentUser) : canSeeBranch(currentUser, opt.id)).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>}
              {!canViewDashboard(currentUser) && <span className="text-xs font-semibold text-[#62657A]">Phạm vi: {currentUser?.branchId}</span>}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Demo Role Switcher button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { logout(); setRoleSwitcherOpen(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-[#F7F8FC] hover:bg-[#F0EDFF] border border-[#DDE0EA] text-xs font-semibold text-[#5540C7] cursor-pointer transition-colors"
              >
                <span>Đổi tài khoản (đăng xuất)</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {false && roleSwitcherOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white border border-[#DDE0EA] rounded-[12px] shadow-lg py-2 z-40 text-xs"
                  onClick={() => setRoleSwitcherOpen(false)}
                >
                  <div className="px-3 py-1 font-bold text-[#62657A] uppercase text-[10px] border-b border-[#DDE0EA] mb-1">
                    Chế độ xem vai trò (đăng xuất để đổi):
                  </div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => addToast('Vui lòng đăng xuất và đăng nhập bằng tài khoản kiểm thử tương ứng.', 'info')}
                      className={`w-full text-left px-3 py-2 hover:bg-[#F7F8FC] flex flex-col ${
                        currentUser?.id === u.id ? 'bg-[#F0EDFF] font-semibold' : ''
                      }`}
                    >
                      <span className="text-[#202039] font-medium">{u.name}</span>
                      <span className="text-[11px] text-[#62657A]">
                        {u.title} · {u.branchId}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => navigateTo('NOTIFICATIONS')}
              className="relative p-2 rounded-[8px] text-[#62657A] hover:text-[#202039] hover:bg-[#F7F8FC] cursor-pointer"
              aria-label="Xem thông báo"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#B42336]" />
              )}
            </button>

            {/* Account Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-[10px] hover:bg-[#F7F8FC] cursor-pointer transition-colors"
                aria-expanded={accountMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-[#5540C7] text-white flex items-center justify-center font-bold text-xs">
                  {currentUser?.name.charAt(0)}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-[#202039] leading-tight">
                    {currentUser?.name}
                  </div>
                  <div className="text-[10px] text-[#62657A] leading-tight">
                    {currentUser?.roles[0]}
                  </div>
                </div>
              </button>

              {accountMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white border border-[#DDE0EA] rounded-[12px] shadow-lg py-1.5 z-40 text-xs"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[#DDE0EA]">
                    <div className="font-bold text-[#202039]">{currentUser?.name}</div>
                    <div className="text-[#62657A] text-[11px]">{currentUser?.email}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsChangePwOpen(true)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[#202039] hover:bg-[#F7F8FC] text-left cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-[#62657A]" />
                    <span>Đổi mật khẩu tài khoản</span>
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[#B42336] hover:bg-[#FDECEF] text-left cursor-pointer border-t border-[#DDE0EA]/60"
                  >
                    <LogOut className="w-4 h-4 text-[#B42336]" />
                    <span>Đăng xuất an toàn</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div role="status" className="px-4 lg:px-8 py-2 bg-[#FFF3D6] text-[#875000] text-xs border-b border-[#DDE0EA]">
          <strong>CHẾ ĐỘ DEMO:</strong> Dữ liệu chỉ lưu trên trình duyệt này. Xác thực, MFA và ngân sách chưa được bảo vệ bằng máy chủ; không sử dụng dữ liệu doanh nghiệp thật.
        </div>
        {/* Content Wrapper (Max 1280px, padding 32px desktop, 16px mobile) */}
        <main className="flex-1 max-w-[1280px] w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Change Password Modal */}
        <ChangePasswordModal
          isOpen={isChangePwOpen}
          onClose={() => setIsChangePwOpen(false)}
        />
      </div>
    </div>
  );
};
