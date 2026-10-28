/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Procure UI — Root Application Component
 * Quản lý đề nghị mua sắm và kiểm soát ngân sách nội bộ (1 Trụ sở, 5 Chi nhánh, 600 CBNV)
 */

import React, { useState } from 'react';
import { canAccessScreen, canReadRequest } from './domain/rules';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { ToastContainer } from './components/common/Toast';
import { LoginForm } from './components/auth/LoginForm';
import { OTPModal } from './components/auth/OTPModal';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { ForbiddenPage } from './components/auth/ForbiddenPage';
import { DashboardView } from './views/DashboardView';
import { PurchaseRequestsView } from './views/PurchaseRequestsView';
import { CreateEditPRView } from './views/CreateEditPRView';
import { PRDetailView } from './views/PRDetailView';
import { ApprovalQueueView } from './views/ApprovalQueueView';
import { ProcurementExecutionView } from './views/ProcurementExecutionView';
import { BudgetManagementView } from './views/BudgetManagementView';
import { AccountingReconciliationView } from './views/AccountingReconciliationView';
import { ReportsView } from './views/ReportsView';
import { NotificationsView } from './views/NotificationsView';
import { AdminView } from './views/AdminView';
import { ScenariosRunnerModal } from './views/ScenariosRunnerModal';

const MainRouter: React.FC = () => {
  const { isAuthenticated, activeScreen, toasts, dismissToast, currentUser, selectedPrId, purchaseRequests } = useApp();
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);

  // Authentication screens
  if (!isAuthenticated) {
    if (activeScreen === 'AUTH_MFA') {
      return (
        <>
          <OTPModal />
          <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </>
      );
    }
    if (activeScreen === 'AUTH_FORGOT_PW') {
      return (
        <>
          <ForgotPasswordModal />
          <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </>
      );
    }
    return (
      <>
        <LoginForm />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Kiểm tra quyền màn hình đồng nhất với sidebar và tầng dữ liệu.
  // Đây là RBAC phía frontend của prototype; backend thật vẫn phải xác thực mọi API.
  const forbidden = !canAccessScreen(currentUser, activeScreen) ||
    (activeScreen === 'PR_DETAIL' && (!selectedPrId || !purchaseRequests.some(pr=>pr.id===selectedPrId && canReadRequest(currentUser,pr)))) ||
    (activeScreen === 'PR_EDIT' && (!selectedPrId || !purchaseRequests.some(pr=>pr.id===selectedPrId && pr.status==='DRAFT' && pr.createdById===currentUser?.id)));
  if (forbidden) return <AppShell onOpenScenarioModal={() => setIsScenarioModalOpen(true)}><ForbiddenPage /></AppShell>;

  // Authenticated In-App Screens
  const renderScreen = () => {
    switch (activeScreen) {
      case 'DASHBOARD':
        return <DashboardView />;
      case 'PR_LIST':
        return <PurchaseRequestsView />;
      case 'PR_CREATE':
      case 'PR_EDIT':
        return <CreateEditPRView />;
      case 'PR_DETAIL':
        return <PRDetailView />;
      case 'APPROVAL_QUEUE':
        return <ApprovalQueueView />;
      case 'EXECUTION_LIST':
        return <ProcurementExecutionView />;
      case 'BUDGET_OVERVIEW':
      case 'BUDGET_TRANSFERS':
      case 'BUDGET_WAITING_PR':
        return <BudgetManagementView />;
      case 'RECONCILIATION_IMPORT':
        return <AccountingReconciliationView />;
      case 'REPORTS':
        return <ReportsView />;
      case 'NOTIFICATIONS':
        return <NotificationsView />;
      case 'ADMIN_MANAGEMENT':
        return <AdminView />;
      case 'FORBIDDEN_403':
        return <ForbiddenPage />;
      default:
        return <ForbiddenPage />;
    }
  };

  return (
    <>
      <AppShell onOpenScenarioModal={() => setIsScenarioModalOpen(true)}>
        {renderScreen()}
      </AppShell>
      <ScenariosRunnerModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
