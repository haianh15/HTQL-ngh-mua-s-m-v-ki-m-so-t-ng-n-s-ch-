/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Notifications View (UI-10, UC-QT02)
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Bell, CheckCheck, Clock, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    navigateTo,
  } = useApp();

  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD'>('ALL');

  const filteredNotifs = notifications.filter((n) =>
    filterType === 'UNREAD' ? !n.isRead : true
  );

  const handleClickNotif = (notif: typeof notifications[0]) => {
    markNotificationRead(notif.id);
    if (notif.targetPrId) {
      navigateTo('PR_DETAIL', notif.targetPrId);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#202039] m-0">Trung tâm thông báo</h1>
          <p className="text-xs text-[#62657A] mt-1 m-0">
            Cập nhật sự kiện tiến trình duyệt, việc đến lượt, nhắc việc và cảnh báo thiếu nguồn (UI-10)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="small"
            onClick={markAllNotificationsRead}
            icon={<CheckCheck className="w-4 h-4 text-[#5540C7]" />}
          >
            Đánh dấu đã đọc tất cả
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DDE0EA]">
        <button
          type="button"
          onClick={() => setFilterType('ALL')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            filterType === 'ALL'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          Tất cả ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('UNREAD')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            filterType === 'UNREAD'
              ? 'border-[#5540C7] text-[#5540C7]'
              : 'border-transparent text-[#62657A] hover:text-[#202039]'
          }`}
        >
          Chưa đọc ({notifications.filter((n) => !n.isRead).length})
        </button>
      </div>

      {/* List */}
      <div className="bg-white border border-[#DDE0EA] rounded-[16px] shadow-[0_4px_20px_rgba(32,32,57,0.03)] divide-y divide-[#DDE0EA] overflow-hidden">
        {filteredNotifs.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-10 h-10 text-[#62657A] mx-auto mb-2 opacity-50" />
            <h3 className="text-base font-bold text-[#202039] mb-1">Không có thông báo mới</h3>
            <p className="text-xs text-[#62657A]">Bạn đã nắm bắt mọi thông báo mới nhất.</p>
          </div>
        ) : (
          filteredNotifs.map((n) => {
            let icon = <Bell className="w-4 h-4 text-[#5540C7]" />;
            let badgeVar: 'neutral' | 'purple' | 'green' | 'amber' | 'red' | 'blue' = 'purple';

            if (n.type === 'TASK_TURN') {
              icon = <Clock className="w-4 h-4 text-[#5540C7]" />;
              badgeVar = 'purple';
            } else if (n.type === 'MISSING_INFO') {
              icon = <FileText className="w-4 h-4 text-[#2459AB]" />;
              badgeVar = 'blue';
            } else if (n.type === 'WAITING_FUNDS') {
              icon = <AlertTriangle className="w-4 h-4 text-[#B42336]" />;
              badgeVar = 'red';
            } else if (n.type === 'RESULT') {
              icon = <CheckCircle2 className="w-4 h-4 text-[#176B49]" />;
              badgeVar = 'green';
            }

            return (
              <div
                key={n.id}
                onClick={() => handleClickNotif(n)}
                className={`p-4 sm:p-5 flex items-start gap-3.5 hover:bg-[#FAFAFE] cursor-pointer transition-colors ${
                  !n.isRead ? 'bg-[#F0EDFF]/30' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[#F7F8FC] border border-[#DDE0EA] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm text-[#202039] flex items-center gap-2">
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#5540C7] flex-shrink-0" />
                      )}
                      <span>{n.title}</span>
                    </span>
                    <span className="text-xs text-[#62657A] whitespace-nowrap">{n.createdAt}</span>
                  </div>

                  <p className="text-xs text-[#4E4868] m-0 leading-relaxed">{n.message}</p>

                  {n.targetPrId && (
                    <div className="mt-2">
                      <span className="text-xs font-semibold text-[#5540C7] hover:underline inline-flex items-center gap-1">
                        Xem hồ sơ {n.targetPrId} →
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
