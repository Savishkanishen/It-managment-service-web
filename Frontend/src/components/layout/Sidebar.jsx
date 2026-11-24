import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ROLES } from '../../data/mockData';
import {
  LayoutDashboard, Monitor, Package, Ticket, Wrench, Video, Globe,
  CheckSquare, Users, ClipboardList, LogOut, Shield, Bell,
  HardDrive, Settings, ChevronRight, Kanban, Calendar, ListTodo,
  BookOpen, UserCheck, Star
} from 'lucide-react';

const AVATAR_COLORS = ['#36312E', '#C2A78A', '#7A6B5C', '#546355', '#91533B', '#485C69'];
function getAvatarColor(id) { return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length]; }

function NavSection({ label, children }) {
  return (
    <div>
      <div className="sidebar-section-label">{label}</div>
      {children}
    </div>
  );
}

function NavItem({ to, icon: Icon, label, badge }) {
  const hasBadge = badge !== null && badge !== undefined && badge !== 0 && badge !== '0';
  return (
    <NavLink to={to} className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
      <span className="sidebar-item-icon"><Icon size={18} /></span>
      <span style={{ flex: 1 }}>{label}</span>
      {hasBadge ? <span className="sidebar-badge">{badge}</span> : null}
    </NavLink>
  );
}

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const { tickets, zoomRequests = [] } = useData();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const role = currentUser.role;
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const isITAdmin = role === ROLES.IT_ADMIN;
  const isITOfficer = role === ROLES.IT_OFFICER;
  const isTrainee = role === ROLES.TRAINEE;
  const isZoom = role === ROLES.ZOOM_REQUESTER;

  // Pending ticket reassignment requests
  const pendingReassignments = tickets.filter(t => t.reassignmentRequest?.status === 'Pending').length;

  // Pending Zoom meeting support requests
  const pendingZoomRequests = zoomRequests.filter(z => z.status === 'Pending').length;
  const myPendingZoomRequests = zoomRequests.filter(z =>
    (String(z.requestedBy || '').toLowerCase() === String(currentUser.id || '').toLowerCase() ||
     String(z.requestedBy || '').toLowerCase() === String(currentUser.username || '').toLowerCase()) &&
    z.status === 'Pending'
  ).length;

  // Helpdesk tickets count:
  // For Trainees: only tickets assigned to them (if 0, no notification badge)
  // For Admins/Officers: open tickets (if 0, no notification badge)
  const myAssignedTickets = tickets.filter(t =>
    (String(t.assignedTo || '').toLowerCase() === String(currentUser.id || '').toLowerCase() ||
     String(t.assignedTo || '').toLowerCase() === String(currentUser.username || '').toLowerCase()) &&
    ['New', 'Assigned', 'In Progress', 'Pending Parts'].includes(t.status)
  ).length;

  const systemOpenTickets = tickets.filter(t => ['New', 'Assigned', 'In Progress', 'Pending Parts'].includes(t.status)).length;
  const activeHelpTicketsCount = isTrainee ? myAssignedTickets : systemOpenTickets;
  const helpdeskBadge = activeHelpTicketsCount > 0 ? activeHelpTicketsCount : null;

  const handleLogout = () => { logout(); navigate('/login'); };

  const dashPath = isSuperAdmin ? '/dashboard/super-admin'
    : isITAdmin ? '/dashboard/it-admin'
      : isITOfficer ? '/dashboard/tasks'
        : isTrainee ? '/dashboard/trainee'
          : '/dashboard/zoom';

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <img
            src="/sri-lanka-emblem.svg"
            alt="Emblem"
            style={{ width: 28, height: 28, objectFit: 'contain' }}
          />
        </div>
        <div className="sidebar-logo-text">
          <h1>ITSM Platform</h1>
          <p>Govt. of Sri Lanka</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        <NavSection label="Overview">
          <NavItem to={dashPath} icon={LayoutDashboard} label="Dashboard" />
        </NavSection>

        {/* Zoom Requester — Restricted view */}
        {isZoom && (
          <NavSection label="Zoom Support">
            <NavItem to="/zoom/new" icon={Video} label="New Zoom Request" />
            <NavItem to="/zoom" icon={ListTodo} label="My Requests" badge={myPendingZoomRequests > 0 ? myPendingZoomRequests : null} />
          </NavSection>
        )}

        {/* IT Officer Navigation */}
        {isITOfficer && (
          <>
            <NavSection label="Task Operations">
              <NavItem to="/dashboard/tasks" icon={Star} label="Task Dashboard" />
              <NavItem to="/tasks/board" icon={Kanban} label="Kanban Board" />
              <NavItem to="/tasks/list" icon={ListTodo} label="Task List" />
              <NavItem to="/tasks/calendar" icon={Calendar} label="Calendar" />
              <NavItem to="/tasks/mine" icon={UserCheck} label="My Tasks" />
            </NavSection>

            <NavSection label="Service Desk">
              <NavItem to="/helpdesk" icon={Ticket} label="Helpdesk Tickets" badge={helpdeskBadge} />
              <NavItem to="/helpdesk/new" icon={Ticket} label="New Ticket" />
            </NavSection>

            <NavSection label="Inventory">
              <NavItem to="/stock" icon={Package} label="IT Stock & Cables" />
            </NavSection>

            <NavSection label="Zoom Support">
              <NavItem to="/zoom" icon={ListTodo} label="Meeting Requests" badge={pendingZoomRequests > 0 ? pendingZoomRequests : null} />
            </NavSection>

            {pendingReassignments > 0 && (
              <NavSection label="Pending Requests">
                <NavItem to="/helpdesk" icon={Bell} label="Reassignment Requests" badge={pendingReassignments} />
              </NavSection>
            )}
          </>
        )}

        {/* IT Staff (Super Admin + IT Admin + Trainee) */}
        {!isZoom && !isITOfficer && (
          <>
            <NavSection label="Asset Management">
              <NavItem to="/assets" icon={Monitor} label="PC / Laptop / Printers" />
              <NavItem to="/stock" icon={Package} label="IT Stock & Cables" />
            </NavSection>

            <NavSection label="Service Desk">
              <NavItem to="/helpdesk" icon={Ticket} label="Helpdesk Tickets" badge={helpdeskBadge} />
              <NavItem to="/repairs" icon={Wrench} label="External Repairs" />
            </NavSection>

            <NavSection label="Specialized Services">
              <NavItem to="/zoom" icon={Video} label="Zoom Support" badge={pendingZoomRequests > 0 ? pendingZoomRequests : null} />
              {(isSuperAdmin || isITAdmin) && (
                <NavItem to="/zoom/new" icon={Video} label="New Zoom Request" />
              )}
              {(isSuperAdmin || isITAdmin) && (
                <NavItem to="/publications" icon={Globe} label="Web Publications" />
              )}
            </NavSection>

            <NavSection label="Task Management">
              <NavItem to="/dashboard/tasks" icon={Star} label="Task Dashboard" />
              <NavItem to="/tasks/board" icon={Kanban} label="Kanban Board" />
              <NavItem to="/tasks/list" icon={ListTodo} label="Task List" />
              <NavItem to="/tasks/calendar" icon={Calendar} label="Calendar" />
              <NavItem to="/tasks/mine" icon={UserCheck} label="My Tasks" />
            </NavSection>

            {(isSuperAdmin || isITAdmin) && (
              <NavSection label="Reports">
                <NavItem to="/audit" icon={ClipboardList} label="Audit Trail" />
              </NavSection>
            )}

            {(isSuperAdmin || isITAdmin) && (
              <NavSection label="Administration">
                <NavItem to="/users" icon={Users} label="User Management" />
              </NavSection>
            )}

            {(isSuperAdmin || isITAdmin) && pendingReassignments > 0 && (
              <NavSection label="Pending Requests">
                <NavItem to="/helpdesk" icon={Bell} label="Reassignment Requests" badge={pendingReassignments} />
              </NavSection>
            )}
          </>
        )}
      </div>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
          <div className="sidebar-avatar" style={{ background: getAvatarColor(currentUser.id) }}>
            {currentUser.avatar?.slice(0, 2) || currentUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{currentUser.name}</div>
            <div className="sidebar-user-role">
              {role === ROLES.SUPER_ADMIN ? 'Super Administrator' : role === ROLES.IT_ADMIN ? 'IT Administrator' : role === ROLES.IT_OFFICER ? 'IT Officer' : role === ROLES.TRAINEE ? 'IT Trainee / Intern' : 'Zoom Requester'}
            </div>
          </div>
          <LogOut size={15} color="rgba(255,255,255,0.35)" />
        </div>
      </div>
    </nav>
  );
}
