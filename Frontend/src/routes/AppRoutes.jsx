import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../data/mockData';
import { ROUTES } from '../constants/routes';

// Layout & Auth
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/auth/LoginPage';
import SignUpPage from '../pages/auth/SignUpPage';

// Dashboards
import SuperAdminDashboard from '../pages/dashboards/SuperAdminDashboard';
import ITAdminDashboard from '../pages/dashboards/ITAdminDashboard';
import TraineeDashboard from '../pages/dashboards/TraineeDashboard';
import TaskDashboard from '../pages/dashboards/TaskDashboard';
import ZoomRequesterDashboard from '../pages/dashboards/ZoomRequesterDashboard';

// Features
import AssetListPage from '../pages/assets/AssetListPage';
import AssetDetailPage from '../pages/assets/AssetDetailPage';
import StockPage from '../pages/stock/StockPage';
import TicketListPage from '../pages/helpdesk/TicketListPage';
import TicketDetailPage from '../pages/helpdesk/TicketDetailPage';
import NewTicketPage from '../pages/helpdesk/NewTicketPage';
import RepairListPage from '../pages/repairs/RepairListPage';
import RepairDetailPage from '../pages/repairs/RepairDetailPage';
import ZoomListPage from '../pages/zoom/ZoomListPage';
import ZoomRequestPage from '../pages/zoom/ZoomRequestPage';
import PublicationPage from '../pages/publication/PublicationPage';
import TaskBoardPage from '../pages/tasks/TaskBoardPage';
import TaskListPage from '../pages/tasks/TaskListPage';
import TaskCalendarPage from '../pages/tasks/TaskCalendarPage';
import MyTasksPage from '../pages/tasks/MyTasksPage';
import TaskDetailPage from '../pages/tasks/TaskDetailPage';
import UserManagementPage from '../pages/users/UserManagementPage';
import AuditLogPage from '../pages/audit/AuditLogPage';

/**
 * Route protection wrapper based on role authorization
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to={ROUTES.LOGIN} replace />;

  if (allowedRoles) {
    const rawRole = (currentUser.role || '').toString().toLowerCase();
    const isSuper = rawRole === ROLES.SUPER_ADMIN || rawRole.includes('super');
    const isITAdmin = rawRole === ROLES.IT_ADMIN || rawRole.includes('admin') || rawRole.includes('itadmin') || currentUser.username?.toLowerCase() === 'admin';
    const isOfficer = rawRole === ROLES.IT_OFFICER || rawRole.includes('officer');
    const isTrainee = rawRole === ROLES.TRAINEE || rawRole.includes('trainee') || rawRole.includes('intern');
    const isZoom = rawRole === ROLES.ZOOM_REQUESTER || rawRole.includes('zoom');

    const hasAccess = allowedRoles.some(r => {
      if (r === ROLES.SUPER_ADMIN) return isSuper || isITAdmin;
      if (r === ROLES.IT_ADMIN) return isITAdmin || isSuper;
      if (r === ROLES.IT_OFFICER) return isOfficer || isITAdmin || isSuper;
      if (r === ROLES.TRAINEE) return isTrainee || isITAdmin || isSuper;
      if (r === ROLES.ZOOM_REQUESTER) return isZoom || isITAdmin || isSuper;
      return r === rawRole;
    });

    if (!hasAccess) return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return children;
}

/**
 * Route redirector mapping user role to primary dashboard
 */
export function DashboardRedirect() {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to={ROUTES.LOGIN} replace />;

  const rawRole = (currentUser.role || '').toString().toLowerCase();
  const username = (currentUser.username || '').toLowerCase();

  if (rawRole === ROLES.SUPER_ADMIN || rawRole.includes('super')) {
    return <Navigate to={ROUTES.DASHBOARD_SUPER_ADMIN} replace />;
  }
  if (rawRole === ROLES.IT_ADMIN || rawRole.includes('admin') || username === 'admin' || username === 'itadmin') {
    return <Navigate to={ROUTES.DASHBOARD_IT_ADMIN} replace />;
  }
  if (rawRole === ROLES.IT_OFFICER || rawRole.includes('officer')) {
    return <Navigate to={ROUTES.DASHBOARD_TASKS} replace />;
  }
  if (rawRole === ROLES.ZOOM_REQUESTER || rawRole.includes('zoom')) {
    return <Navigate to={ROUTES.DASHBOARD_ZOOM} replace />;
  }
  return <Navigate to={ROUTES.DASHBOARD_TRAINEE} replace />;
}

/**
 * Centralized Route Switch
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Routes - Only Admin can provision accounts */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.SIGNUP} element={<Navigate to={ROUTES.LOGIN} replace />} />
      <Route path={ROUTES.REGISTER} element={<Navigate to={ROUTES.LOGIN} replace />} />
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.LOGIN} replace />} />

      {/* Protected Application Workspace */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<DashboardRedirect />} />
        <Route path="dashboard/super-admin" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.IT_ADMIN]}><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="dashboard/it-admin" element={<ProtectedRoute allowedRoles={[ROLES.IT_ADMIN, ROLES.SUPER_ADMIN]}><ITAdminDashboard /></ProtectedRoute>} />
        <Route path="dashboard/trainee" element={<ProtectedRoute allowedRoles={[ROLES.TRAINEE]}><TraineeDashboard /></ProtectedRoute>} />
        <Route path="dashboard/tasks" element={<TaskDashboard />} />
        <Route path="dashboard/zoom" element={<ZoomRequesterDashboard />} />

        {/* Assets & Stock */}
        <Route path="assets" element={<AssetListPage />} />
        <Route path="assets/:id" element={<AssetDetailPage />} />
        <Route path="stock" element={<StockPage />} />

        {/* Helpdesk & Repairs */}
        <Route path="helpdesk" element={<TicketListPage />} />
        <Route path="helpdesk/new" element={<NewTicketPage />} />
        <Route path="helpdesk/:id" element={<TicketDetailPage />} />
        <Route path="repairs" element={<RepairListPage />} />
        <Route path="repairs/:id" element={<RepairDetailPage />} />

        {/* Meetings & Publications */}
        <Route path="zoom" element={<ZoomListPage />} />
        <Route path="zoom/new" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.ZOOM_REQUESTER]}><ZoomRequestPage /></ProtectedRoute>} />
        <Route path="publications" element={<PublicationPage />} />

        {/* Task Management */}
        <Route path="tasks" element={<Navigate to="/tasks/list" replace />} />
        <Route path="tasks/board" element={<TaskBoardPage />} />
        <Route path="tasks/list" element={<TaskListPage />} />
        <Route path="tasks/calendar" element={<TaskCalendarPage />} />
        <Route path="tasks/mine" element={<MyTasksPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />

        {/* Administration */}
        <Route path="users" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.IT_ADMIN]}><UserManagementPage /></ProtectedRoute>} />
        <Route path="audit" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.IT_ADMIN]}><AuditLogPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

