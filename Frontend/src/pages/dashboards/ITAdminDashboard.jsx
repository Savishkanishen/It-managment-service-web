import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { getTicketStats, getUser, ROLES, DIVISIONS } from '../../data/mockData';
import StatCard from '../../components/ui/StatCard';
import { Badge, CategoryBadge, PriorityBadge, RoleBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ProgressBar from '../../components/ui/ProgressBar';
import {
  Ticket, Package, Wrench, Video, Globe, AlertCircle, Clock, Plus,
  CheckSquare, ArrowRight, UserPlus, Users, Shield, Mail, Lock, User, Building,
  Key, Radio, Sparkles, Copy, Check, Trash2
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: ROLES.SUPER_ADMIN, label: 'Super Administrator' },
  { value: ROLES.IT_ADMIN, label: 'IT Administrator' },
  { value: ROLES.IT_OFFICER, label: 'IT Officer' },
  { value: ROLES.TRAINEE, label: 'Trainee / Staff' },
  { value: ROLES.ZOOM_REQUESTER, label: 'Zoom Requester' },
];

const AVATAR_COLORS = ['#06141B', '#11212D', '#253745', '#4A5C6A', '#385061', '#1B3547'];
const getAvatarColor = (id = '') => {
  const str = String(id);
  const code = str.length > 0 ? str.charCodeAt(str.length - 1) : 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
};

export default function ITAdminDashboard() {
  const { currentUser } = useAuth();
  const {
    tickets, stock, repairs, zoomRequests, users, divisions,
    createUser, resetUserPassword, toggleUserActive, updateZoomMeetingLink, updateZoomStatus, deleteZoomRequest,
    deleteTicket,
    broadcasts, addBroadcast, toggleBroadcast, removeBroadcast
  } = useData();
  const { addToast } = useNotifications();

  // Create User Modal State
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    email: '',
    password: 'password123',
    role: ROLES.IT_ADMIN,
    division: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick Zoom Link Modal State (Admin Feature)
  const [zoomLinkModal, setZoomLinkModal] = useState(null);
  const [quickMeetingLink, setQuickMeetingLink] = useState('');

  // Password Reset Modal State (Admin Feature)
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [copied, setCopied] = useState(false);

  // System Broadcast Modal State (Admin Feature)
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    priority: 'Warning',
    audience: 'All',
  });

  // Ticket Triage Widget Tab State (Ongoing vs Old/Resolved)
  const [ticketTab, setTicketTab] = useState('ongoing');

  const divisionList = divisions && divisions.length > 0 ? divisions : DIVISIONS;

  const stats = getTicketStats(tickets);
  const ongoingTickets = tickets.filter(t => ['New', 'Assigned', 'In Progress', 'Pending Parts'].includes(t.status));
  const oldTickets = tickets.filter(t => ['Resolved', 'Closed'].includes(t.status));
  const pendingReassign = tickets.filter(t => t.reassignmentRequest?.status === 'Pending');
  const overdueRepairs = repairs.filter(r => r.status === 'Overdue');
  const lowStock = stock.filter(s => ['Low Stock', 'Not Available'].includes(s.status));
  const upcomingZoom = zoomRequests.filter(z => ['Pending', 'Confirmed'].includes(z.status));

  const openCreateModal = () => {
    setFormError('');
    setCreateForm({
      name: '',
      username: '',
      email: '',
      password: 'password123',
      role: ROLES.IT_ADMIN,
      division: divisionList[0] || 'Information Technology',
    });
    setCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    if (e) e.preventDefault();
    setFormError('');

    const nameTrim = createForm.name.trim();
    const usernameTrim = createForm.username.trim();
    const emailTrim = createForm.email.trim();
    const passwordTrim = createForm.password.trim();

    if (!nameTrim) {
      setFormError('Display name is required.');
      return;
    }
    if (!usernameTrim) {
      setFormError('Username is required.');
      return;
    }
    if (!emailTrim || !emailTrim.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }
    if (!passwordTrim || passwordTrim.length < 4) {
      setFormError('Password must be at least 4 characters long.');
      return;
    }

    if (users.some(u => u.username?.toLowerCase() === usernameTrim.toLowerCase())) {
      setFormError(`Username "${usernameTrim}" is already taken.`);
      return;
    }
    if (users.some(u => u.email?.toLowerCase() === emailTrim.toLowerCase())) {
      setFormError(`Email "${emailTrim}" is already in use.`);
      return;
    }

    setSubmitting(true);
    try {
      const selectedDivision = createForm.division || divisionList[0] || 'Information Technology';
      const created = await createUser({
        name: nameTrim,
        username: usernameTrim,
        email: emailTrim,
        password: passwordTrim,
        role: createForm.role,
        division: selectedDivision,
      }, currentUser);

      addToast('success', 'Account Created', `Account for "${created.name}" (@${created.username}) provisioned as ${createForm.role}.`);
      setCreateModal(false);
    } catch (err) {
      setFormError(err.message || 'Failed to create user account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openResetModal = (targetUser) => {
    setResetModalUser(targetUser);
    setNewPassword('GovPass#' + Math.floor(1000 + Math.random() * 9000));
    setResetError('');
    setResetSuccess('');
    setCopied(false);
  };

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = 'Gov#';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(res);
    setCopied(false);
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!resetModalUser) return;
    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long');
      return;
    }
    setResetSubmitting(true);
    setResetError('');
    try {
      await resetUserPassword(resetModalUser.id, newPassword, currentUser);
      setResetSuccess(`Credentials successfully updated for @${resetModalUser.username}`);
      addToast('success', 'Password Reset', `Password updated for ${resetModalUser.name}`);
      setResetSubmitting(false);
    } catch (err) {
      setResetError(err.message || 'Failed to reset password');
      setResetSubmitting(false);
    }
  };

  const handleBroadcastSubmit = (e) => {
    if (e) e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      return;
    }
    addBroadcast(broadcastForm, currentUser);
    addToast('success', 'Announcement Published', `System broadcast "${broadcastForm.title}" is now live.`);
    setBroadcastModal(false);
    setBroadcastForm({ title: '', message: '', priority: 'Warning', audience: 'All' });
  };

  return (
    <div>
      {/* Quick Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          onClick={openCreateModal}
          style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <UserPlus size={15} /> Create Account
        </button>
        <Link
          to="/zoom/new"
          className="btn btn-secondary"
          style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Video size={15} /> Schedule Zoom
        </Link>
        <button
          className="btn btn-secondary"
          onClick={() => setBroadcastModal(true)}
          style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Radio size={15} /> System Broadcast
        </button>
        <Link
          to="/users"
          className="btn btn-secondary"
          style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Users size={15} /> User Directory
        </Link>
        <Link
          to="/helpdesk/new"
          className="btn btn-secondary"
          style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={15} /> New Ticket
        </Link>
      </div>

      {/* Reassignment Alert Banner */}
      {pendingReassign.length > 0 && (
        <div className="alert-card alert-card-warning" style={{ marginBottom: '20px', borderRadius: 'var(--radius-lg)', padding: '14px 20px' }}>
          <AlertCircle size={20} color="var(--warning-700)" style={{ flexShrink: 0 }} />
          <div>
            <div className="alert-title">⚠ {pendingReassign.length} Reassignment Request{pendingReassign.length > 1 ? 's' : ''} Pending</div>
            <div className="alert-message">
              {pendingReassign.map(t => (
                <span key={t.id} style={{ marginRight: 12 }}>
                  <Link to={`/helpdesk/${t.id}`} style={{ color: 'var(--warning-700)', fontWeight: 600 }}>{t.id}</Link>
                  {' — '}{t.reassignmentRequest.reason.slice(0, 50)}...
                </span>
              ))}
            </div>
          </div>
          <Link to="/helpdesk" className="btn btn-warning btn-sm" style={{ marginLeft: 'auto', flexShrink: 0 }}>Review</Link>
        </div>
      )}

      {/* Primary KPI Stats */}
      <div className="stats-grid">
        <StatCard label="Total Accounts" value={users.length} icon={Users} iconBg="var(--sherwood-tan-wash)" iconColor="var(--af-655)" accentColor="var(--sherwood-tan)" sub={`${users.filter(u => ['super_admin', 'it_admin'].includes(u.role)).length} admin accounts`} />
        <StatCard label="Open Tickets" value={stats.open} icon={Ticket} iconBg="var(--sherwood-tan-wash)" iconColor="var(--sherwood-tan-dark)" accentColor="var(--sherwood-tan)" sub={`${stats.total} total`} />
        <StatCard label="Stock Issues" value={lowStock.length} icon={Package} iconBg="var(--danger-100)" iconColor="var(--danger-500)" accentColor="var(--danger-500)" sub={`${stock.filter(s => s.status === 'Not Available').length} out of stock`} />
        <StatCard label="Overdue Repairs" value={overdueRepairs.length} icon={Wrench} iconBg={overdueRepairs.length > 0 ? 'var(--danger-100)' : 'var(--success-100)'} iconColor={overdueRepairs.length > 0 ? 'var(--danger-500)' : 'var(--success-500)'} accentColor={overdueRepairs.length > 0 ? 'var(--danger-500)' : 'var(--success-500)'} sub="External vendor" />
        <StatCard label="Zoom Sessions" value={upcomingZoom.length} icon={Video} iconBg="var(--sherwood-tan-wash)" iconColor="var(--af-655)" accentColor="var(--sherwood-tan)" sub="Upcoming & pending" />
      </div>

      {/* Account Provisioning & Quick User Directory Section */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} color="var(--sherwood-tan-dark)" />
              Account Provisioning & Management
            </span>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>
              Authorized IT Admin portal for provisioning Super Admin, IT Admin, Trainee, and Zoom Requester accounts.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserPlus size={14} /> Add New User / Admin
            </button>
            <Link to="/users" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Full Directory <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Division</th>
                <th>Email</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Security Action</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 6).map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar avatar-sm" style={{ background: getAvatarColor(u.id) }}>
                        {u.avatar || u.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--gray-500)' }}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td><RoleBadge role={u.role} /></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>{u.division}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.active ? 'badge-green' : 'badge-gray'}`}>
                      <span className="badge-dot" />
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          toggleUserActive(u.id);
                          addToast('info', 'Status Toggled', `User @${u.username} is now ${u.active ? 'Inactive' : 'Active'}.`);
                        }}
                        style={{ fontSize: '0.72rem', padding: '4px 8px', color: u.active ? 'var(--slate-500)' : 'var(--success-700)' }}
                        title="Toggle Active/Inactive"
                      >
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openResetModal(u)}
                        style={{ fontSize: '0.74rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        title="Reset User Password"
                      >
                        <Key size={13} color="var(--slate-700)" /> Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational System Broadcast Announcements (Admin Feature) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Radio size={18} color="var(--sherwood-tan-dark)" />
              Operational System Broadcasts & Advisories
            </span>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>
              Publish live maintenance notices, network bulletins, and emergency alerts across all trainee and staff dashboards.
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setBroadcastModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} /> New Broadcast Notice
          </button>
        </div>
        <div className="card-body" style={{ padding: '16px 20px' }}>
          {(!broadcasts || broadcasts.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-400)', fontSize: '0.84rem' }}>
              No system broadcasts published. Click "New Broadcast Notice" to post an advisory.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {broadcasts.map(b => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: b.active ? 'var(--oc-45)' : 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--oc-45-border)',
                    opacity: b.active ? 1 : 0.6,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className={`badge ${b.priority === 'Critical' ? 'badge-red' : b.priority === 'Warning' ? 'badge-amber' : 'badge-blue'}`}>
                        {b.priority}
                      </span>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--af-655)' }}>{b.title}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                        Target: {b.audience} • {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-600)', lineHeight: 1.4 }}>
                      {b.message}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleBroadcast(b.id)}
                      style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                    >
                      {b.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => removeBroadcast(b.id)}
                      style={{ width: 28, height: 28, color: 'var(--danger-500)' }}
                      title="Delete notice"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card-grid">
        {/* Ticket Triage */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="card-title">Helpdesk Tickets</span>
              <div style={{ display: 'inline-flex', background: 'var(--gray-100)', borderRadius: 'var(--radius-md)', padding: 2 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${ticketTab === 'ongoing' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.72rem', padding: '2px 8px', height: 'auto' }}
                  onClick={() => setTicketTab('ongoing')}
                >
                  Ongoing ({ongoingTickets.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${ticketTab === 'old' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.72rem', padding: '2px 8px', height: 'auto' }}
                  onClick={() => setTicketTab('old')}
                >
                  Old / Resolved ({oldTickets.length})
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link to="/helpdesk/new" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', padding: '4px 10px' }}>
                <Plus size={13} /> Log Ticket
              </Link>
              <Link to="/helpdesk" className="btn btn-ghost btn-sm" title="View All Tickets in Helpdesk">
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(ticketTab === 'ongoing' ? ongoingTickets : oldTickets).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-400)', fontSize: '0.8rem' }}>
                      No {ticketTab === 'ongoing' ? 'ongoing' : 'old or resolved'} tickets.
                    </td>
                  </tr>
                ) : (
                  (ticketTab === 'ongoing' ? ongoingTickets : oldTickets).slice(0, 6).map(t => (
                    <tr key={t.id}>
                      <td>
                        <Link to={`/helpdesk/${t.id}`} style={{ color: 'var(--teal-600)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>
                          {t.ticketNumber || t.id}
                        </Link>
                      </td>
                      <td style={{ maxWidth: 170 }}><span className="truncate" style={{ display: 'block' }}>{t.title}</span></td>
                      <td><CategoryBadge category={t.category} /></td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td><Badge status={t.status} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Link to={`/helpdesk/${t.id}`} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                            View
                          </Link>
                          <button
                            className="icon-btn"
                            style={{ width: 26, height: 26, color: 'var(--danger-500)' }}
                            onClick={() => {
                              if (window.confirm(`Delete ticket ${t.ticketNumber || t.id} (${t.title})?`)) {
                                deleteTicket(t.id, currentUser);
                                addToast('warning', 'Ticket Deleted', `Ticket ${t.ticketNumber || t.id} removed.`);
                              }
                            }}
                            title="Delete ticket"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Status Panel */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Consumable Stock Status</span>
            <Link to="/stock" className="btn btn-ghost btn-sm"><ArrowRight size={14} /></Link>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            {stock.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-800)' }}>{s.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>{s.category}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, color: s.quantity === 0 ? 'var(--danger-500)' : 'var(--gray-800)' }}>{s.quantity}</span>
                  <Badge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zoom Schedule & Repair Monitor */}
      <div className="card-grid" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming Zoom Sessions</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link to="/zoom/new" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', padding: '4px 10px' }}>
                <Plus size={13} /> Schedule Meeting
              </Link>
              <Link to="/zoom" className="btn btn-ghost btn-sm" title="View All Zoom Requests"><ArrowRight size={14} /></Link>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {upcomingZoom.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: '0.84rem' }}>
                No pending or upcoming Zoom sessions.
              </div>
            ) : upcomingZoom.map(z => (
              <div key={z.id} className={`zoom-card zoom-card-level-${z.meetingLevel.toLowerCase()}`} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <span className="id-chip" style={{ fontSize: '0.68rem', marginBottom: 2, display: 'inline-block' }}>{z.id}</span>
                    <div className="zoom-meeting-name" style={{ fontSize: '1.05rem' }}>{z.meetingName}</div>
                  </div>
                  <Badge status={z.meetingLevel === 'Critical' ? 'High' : 'Medium'}>{z.meetingLevel}</Badge>
                </div>
                <div className="zoom-detail-row"><Clock size={13} color="var(--slate-500)" />{new Date(z.scheduledDate).toLocaleString()}</div>
                <div className="zoom-detail-row"><Building size={13} color="var(--slate-500)" />{z.location}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
                  <Badge status={z.status} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {z.meetingLink ? (
                      <>
                        <a
                          href={z.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '3px 8px', color: 'var(--slate-700)', fontWeight: 700 }}
                        >
                          Join Link
                        </a>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setZoomLinkModal(z); setQuickMeetingLink(z.meetingLink); }}
                          style={{ fontSize: '0.72rem', padding: '3px 6px' }}
                        >
                          Edit
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setZoomLinkModal(z); setQuickMeetingLink(''); }}
                        style={{ fontSize: '0.72rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <LinkIcon size={12} /> Provision Link
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        updateZoomStatus(z.id, 'Completed', currentUser);
                        addToast('success', 'Meeting Completed', `Meeting "${z.meetingName}" marked as Completed.`);
                      }}
                      style={{ fontSize: '0.72rem', color: 'var(--success-700)', padding: '3px 6px' }}
                      title="Mark meeting complete"
                    >
                      Complete
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => {
                        if (window.confirm(`Delete Zoom meeting "${z.meetingName}"?`)) {
                          deleteZoomRequest(z.id, currentUser);
                          addToast('warning', 'Meeting Deleted', `Meeting "${z.meetingName}" has been removed.`);
                        }
                      }}
                      style={{ width: 24, height: 24, color: 'var(--danger-500)' }}
                      title="Delete meeting"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">External Repair Monitor</span>
            <Link to="/repairs" className="btn btn-ghost btn-sm"><ArrowRight size={14} /></Link>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {repairs.map(r => (
              <div key={r.id} className={`stock-card${r.status === 'Overdue' ? ' out-of-stock' : ''}`} style={{ marginBottom: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.assetTag}</span>
                  <Badge status={r.status} />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-600)', marginBottom: 4 }}>
                  <strong>Vendor:</strong> {r.vendorName}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-600)', marginBottom: 4 }}>
                  <strong>For:</strong> {r.forReason.slice(0, 60)}...
                </div>
                <div style={{ fontSize: '0.75rem', color: r.status === 'Overdue' ? 'var(--danger-500)' : 'var(--gray-500)' }}>
                  Expected: {r.expectedReturn}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Creation Modal (IT Admin Authorized) */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Provision User or Administrator Account"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateModal(false)} disabled={submitting}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateSubmit} disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit}>
          {formError && (
            <div className="alert-card alert-card-error" style={{ marginBottom: 16 }}>
              <div className="alert-title">Cannot Create Account</div>
              <div className="alert-message">{formError}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Full Name <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="e.g. Aishath Nazeer"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Username <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. anazeer"
                value={createForm.username}
                onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Email Address <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="e.g. anazeer@mohe.gov.mv"
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Password <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Initial password"
                  value={createForm.password}
                  onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-hint" style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 4 }}>Default: password123</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Role <span className="required">*</span></label>
              <select
                className="form-select"
                value={createForm.role}
                onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Division <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <Building size={15} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                <select
                  className="form-select"
                  style={{ paddingLeft: '36px' }}
                  value={createForm.division}
                  onChange={e => setCreateForm({ ...createForm, division: e.target.value })}
                >
                  {divisionList.map((d, i) => {
                    const divName = typeof d === 'string' ? d : d.name;
                    return <option key={i} value={divName}>{divName}</option>;
                  })}
                </select>
              </div>
            </div>
          </div>

          {(createForm.role === ROLES.SUPER_ADMIN || createForm.role === ROLES.IT_ADMIN) && (
            <div className="alert-card alert-card-warning" style={{ borderRadius: 'var(--radius-md)', marginTop: 12 }}>
              <div className="alert-title">🛡 Privileged Account Provisioning</div>
              <div className="alert-message">
                This account will be created with administrative privileges and saved to the database. The user will be able to log in immediately with the chosen password.
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Admin Password Reset Modal (Admin Feature) */}
      <Modal
        isOpen={!!resetModalUser}
        onClose={() => { setResetModalUser(null); setResetSuccess(''); setResetError(''); }}
        title={`Reset Credentials — @${resetModalUser?.username}`}
        size="sm"
        footer={
          resetSuccess ? (
            <button className="btn btn-primary" onClick={() => setResetModalUser(null)}>Done</button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setResetModalUser(null)} disabled={resetSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResetPassword} disabled={resetSubmitting}>
                {resetSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </>
          )
        }
      >
        {resetSuccess ? (
          <div>
            <div className="alert-card alert-card-success" style={{ marginBottom: 16 }}>
              <div className="alert-title">Password Successfully Reset</div>
              <div className="alert-message">{resetSuccess}</div>
            </div>
            <div style={{ background: 'var(--oc-45)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--oc-45-border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: 4 }}>Temporary Password:</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1rem', fontWeight: 700, color: 'var(--af-655)' }}>
                  {newPassword}
                </code>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(newPassword);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.74rem' }}
                >
                  {copied ? <Check size={13} color="var(--success-500)" /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword}>
            {resetError && (
              <div className="alert-card alert-card-error" style={{ marginBottom: 14 }}>
                <div className="alert-message">{resetError}</div>
              </div>
            )}
            <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', marginBottom: 14, lineHeight: 1.45 }}>
              Set a new secure password for <strong>{resetModalUser?.name}</strong> ({resetModalUser?.division}). The password will be hashed with modern bcrypt.
            </p>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>New Password <span className="required">*</span></label>
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.72rem', color: 'var(--slate-700)', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Key size={12} /> Generate Password
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '36px', fontFamily: 'JetBrains Mono, monospace' }}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* System Announcement Broadcast Modal (Admin Feature) */}
      <Modal
        isOpen={broadcastModal}
        onClose={() => setBroadcastModal(false)}
        title="Publish System-Wide Advisory Announcement"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setBroadcastModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleBroadcastSubmit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={14} /> Publish Broadcast
            </button>
          </>
        }
      >
        <form onSubmit={handleBroadcastSubmit}>
          <div className="form-group">
            <label className="form-label">Announcement Title <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={broadcastForm.title}
              onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
              placeholder="e.g. Scheduled Core Switch Maintenance Tonight"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Priority / Urgency</label>
              <select
                className="form-select"
                value={broadcastForm.priority}
                onChange={e => setBroadcastForm({ ...broadcastForm, priority: e.target.value })}
              >
                <option value="Info">Info (Standard Advisory)</option>
                <option value="Warning">Warning (Important Maintenance)</option>
                <option value="Critical">Critical (Immediate Outage / Alert)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <select
                className="form-select"
                value={broadcastForm.audience}
                onChange={e => setBroadcastForm({ ...broadcastForm, audience: e.target.value })}
              >
                <option value="All">All Personnel & Trainees</option>
                <option value="Trainees">IT Trainees & Staff</option>
                <option value="Zoom Requesters">Zoom Requesters</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Announcement Message <span className="required">*</span></label>
            <textarea
              className="form-input"
              rows={3}
              value={broadcastForm.message}
              onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
              placeholder="Provide clear operational notice details, expected downtime, and workarounds..."
              required
            />
          </div>
        </form>
      </Modal>

      {/* Quick Provision Zoom Link Modal */}
      <Modal
        isOpen={!!zoomLinkModal}
        onClose={() => { setZoomLinkModal(null); setQuickMeetingLink(''); }}
        title="Provision Official Zoom Meeting Link"
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setZoomLinkModal(null); setQuickMeetingLink(''); }}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={!quickMeetingLink.trim()}
              onClick={() => {
                if (!quickMeetingLink.trim()) return;
                updateZoomMeetingLink(zoomLinkModal.id, quickMeetingLink.trim(), currentUser);
                addToast('success', 'Zoom Link Uploaded', `Official Zoom link sent for "${zoomLinkModal.meetingName}".`);
                setZoomLinkModal(null);
                setQuickMeetingLink('');
              }}
            >
              Upload Link
            </button>
          </>
        }
      >
        {zoomLinkModal && (
          <div>
            <div style={{ padding: '12px 14px', background: 'var(--oc-45)', borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-950)' }}>{zoomLinkModal.meetingName}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 2 }}>
                {new Date(zoomLinkModal.scheduledDate).toLocaleString()} • {zoomLinkModal.location}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Zoom Meeting Link / URL <span className="required">*</span></label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const meetingId = Math.floor(1000000000 + Math.random() * 9000000000);
                    const pwd = Math.random().toString(36).slice(2, 10);
                    setQuickMeetingLink(`https://zoom.us/j/${meetingId}?pwd=${pwd}`);
                    addToast('info', 'Link Generated', 'Official Zoom meeting URL generated.');
                  }}
                  style={{ fontSize: '0.72rem', color: 'var(--slate-700)', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <LinkIcon size={12} /> Generate Link
                </button>
              </div>
              <input
                className="form-input"
                placeholder="https://zoom.us/j/1234567890?pwd=..."
                value={quickMeetingLink}
                onChange={e => setQuickMeetingLink(e.target.value)}
                autoFocus
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
              />
              <div className="form-hint" style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 4 }}>
                The link will be immediately delivered to the requester and published to the Zoom Portal.
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
