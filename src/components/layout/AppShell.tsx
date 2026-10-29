/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — AppShell (Sidebar 232px, Header 72px, Content max 1280px)
 * Tuân thủ chính xác Design System layout & spacing
 */

import { canSeeBranch, canViewAllRegions, canViewDashboard, canAccessScreen, isRequesterRole, primaryRole } from '../../domain/rules';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveScreen, BranchCode } from '../../types';
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
  Menu,
  X,
  Building2,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
    currentUser,
    activeScreen,
    navigateTo,
    logout,
    currentBranchScope,
    setBranchScope,
    notifications,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const role = primaryRole(currentUser);
  const requesterOnly = role === 'requester';
  const unreadCount = requesterOnly ? 0 : notifications.filter(n=>!n.isRead).length;
  interface NavItem { id: ActiveScreen; label: string; icon: React.ReactNode; badge?: number; visible:boolean; }
  const icons: Record<string, React.ReactNode> = {
    DASHBOARD:<LayoutDashboard className="w-4 h-4" />,
    PR_LIST:<FileText className="w-4 h-4" />,
    PR_CREATE:<FileText className="w-4 h-4" />,
    APPROVAL_QUEUE:<CheckSquare className="w-4 h-4" />,
    BUDGET_OVERVIEW:<PieChart className="w-4 h-4" />,
    BUDGET_TRANSFERS:<PieChart className="w-4 h-4" />,
    EXECUTION_LIST:<ShoppingBag className="w-4 h-4" />,
    RECONCILIATION_IMPORT:<Receipt className="w-4 h-4" />,
    REPORTS:<BarChart3 className="w-4 h-4" />,
    NOTIFICATIONS:<Bell className="w-4 h-4" />,
    ADMIN_MANAGEMENT:<Settings className="w-4 h-4" />,
  };
  type NavSpec={id:ActiveScreen;label:string};
  const navByRole:Record<string,{group:string;entries:NavSpec[]}> = {
    requester:{group:'Đề nghị cá nhân',entries:[{id:'PR_LIST',label:'Đề nghị của tôi'},{id:'PR_CREATE',label:'Lập đề nghị'}]},
    dept_head:{group:'Quản lý phòng ban',entries:[{id:'APPROVAL_QUEUE',label:'Hàng chờ duyệt của phòng'},{id:'PR_LIST',label:'Tra cứu đề nghị'},{id:'NOTIFICATIONS',label:'Thông báo'}]},
    finance:{group:'Tài chính – Ngân sách',entries:[{id:'PR_CREATE',label:'Lập đề nghị'},{id:'DASHBOARD',label:'Tổng quan ngân sách'},{id:'APPROVAL_QUEUE',label:'Kiểm tra nguồn ngân sách'},{id:'BUDGET_OVERVIEW',label:'Quản lý ngân sách'},{id:'BUDGET_TRANSFERS',label:'Điều chuyển nguồn'},{id:'PR_LIST',label:'Tra cứu đề nghị'},{id:'REPORTS',label:'Báo cáo ngân sách'},{id:'NOTIFICATIONS',label:'Thông báo'}]},
    procurement:{group:'Mua hàng',entries:[{id:'DASHBOARD',label:'Tổng quan mua hàng'},{id:'EXECUTION_LIST',label:'Tiếp nhận & Thực hiện'},{id:'PR_LIST',label:'Hồ sơ đã duyệt'},{id:'REPORTS',label:'Báo cáo mua hàng'},{id:'NOTIFICATIONS',label:'Thông báo'}]},
    accountant:{group:'Kế toán – Đối soát',entries:[{id:'DASHBOARD',label:'Tổng quan kế toán'},{id:'RECONCILIATION_IMPORT',label:'Nhập chứng từ & Đối soát'},{id:'PR_LIST',label:'Hồ sơ đã duyệt'},{id:'REPORTS',label:'Báo cáo kế toán'},{id:'NOTIFICATIONS',label:'Thông báo'}]},
    branch_director:{group:'Điều hành chi nhánh',entries:[{id:'PR_CREATE',label:'Lập đề nghị'},{id:'DASHBOARD',label:'Tổng quan chi nhánh'},{id:'APPROVAL_QUEUE',label:'Hàng chờ phê duyệt'},{id:'PR_LIST',label:'Đề nghị được phân quyền'},{id:'REPORTS',label:'Báo cáo chi nhánh'},{id:'NOTIFICATIONS',label:'Thông báo'}]},
    bod:{group:'Ban Giám đốc',entries:[{id:'PR_CREATE',label:'Lập đề nghị'},{id:'DASHBOARD',label:'Tổng quan toàn công ty'},{id:'APPROVAL_QUEUE',label:'Phê duyệt cấp cao'},{id:'PR_LIST',label:'Đề nghị được phân quyền'},{id:'BUDGET_OVERVIEW',label:'Giám sát ngân sách'},{id:'BUDGET_TRANSFERS',label:'Xét duyệt điều chuyển'},{id:'REPORTS',label:'Báo cáo toàn công ty'},{id:'NOTIFICATIONS',label:'Thông báo'}]},
    admin:{group:'Quản trị hệ thống',entries:[{id:'ADMIN_MANAGEMENT',label:'Tài khoản & Phân quyền'}]},
  };
  const spec = role ? navByRole[role] : undefined;
  const navItems:{group:string;items:NavItem[]}[] = spec ? [{group:spec.group,items:spec.entries.map(({id,label})=>({
    id,label,icon:icons[id]||<FileText className="w-4 h-4" />,badge:id==='NOTIFICATIONS'?unreadCount||undefined:undefined,
    visible:canAccessScreen(currentUser,id),
  }))}]:[];

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
            Quản lý đề nghị mua sắm & ngân sách
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
              {!requesterOnly && canViewDashboard(currentUser) && <select
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
              {requesterOnly ? <span className="text-xs font-semibold text-[#62657A]">Không gian cá nhân</span> : !canViewDashboard(currentUser) && <span className="text-xs font-semibold text-[#62657A]">Phạm vi: {currentUser?.branchId}</span>}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={logout}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#F7F8FC] hover:bg-[#F0EDFF] border border-[#DDE0EA] text-xs font-semibold text-[#5540C7] cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>

            {/* Notification Bell - không có màn thông báo độc lập cho nhân viên đề nghị */}
            {!requesterOnly && <button
              type="button"
              onClick={() => navigateTo('NOTIFICATIONS')}
              className="relative p-2 rounded-[8px] text-[#62657A] hover:text-[#202039] hover:bg-[#F7F8FC] cursor-pointer"
              aria-label="Xem thông báo"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#B42336]" />
              )}
            </button>}

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

        {/* Content Wrapper (Max 1280px, padding 32px desktop, 16px mobile) */}
        <main className="flex-1 max-w-[1280px] w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

      </div>
    </div>
  );
};
