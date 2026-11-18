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
  CheckSquare, ArrowRight, UserPlus, Users, Shield, Mail, Lock, User, Building
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: ROLES.SUPER_ADMIN, label: 'Super Administrator' },
  { value: ROLES.IT_ADMIN, label: 'IT Administrator' },
  { value: ROLES.TRAINEE, label: 'Trainee / Staff' },
  { value: ROLES.ZOOM_REQUESTER, label: 'Zoom Requester' },
];

const AVATAR_COLORS = ['#0891b2','#7c3aed','#059669','#dc2626','#d97706','#0284c7'];
const getAvatarColor = (id = '') => {
  const str = String(id);
  const code = str.length > 0 ? str.charCodeAt(str.length - 1) : 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
};

export default function ITAdminDashboard() {
  const { currentUser } = useAuth();
  const { tickets, stock, repairs, zoomRequests, users, divisions, createUser } = useData();
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

  const divisionList = divisions && divisions.length > 0 ? divisions : DIVISIONS;

  const stats = getTicketStats(tickets);
  const pendingReassign = tickets.filter(t => t.reassignmentRequest?.status === 'Pending');
  const overdueRepairs = repairs.filter(r => r.status === 'Overdue');
  const lowStock = stock.filter(s => ['Low Stock', 'Not Available'].includes(s.status));
  const upcomingZoom = zoomRequests.filter(z => ['Pending', 'Confirmed'].includes(z.status));

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening';

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

  return (
    <div>
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-left">
          <h2>{greeting}, {currentUser?.name ? currentUser.name.split(' ')[0] : 'Admin'} 👋</h2>
          <p>IT Admin Control Center — Account Provisioning & System Operations</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={openCreateModal}
            style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <UserPlus size={15} /> Create Account
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
        <StatCard label="Total Accounts" value={users.length} icon={Users} iconBg="rgba(8,145,178,0.1)" iconColor="var(--teal-500)" accentColor="var(--teal-500)" sub={`${users.filter(u=>['super_admin','it_admin'].includes(u.role)).length} admin accounts`} />
        <StatCard label="Open Tickets" value={stats.open} icon={Ticket} iconBg="rgba(6,182,212,0.1)" iconColor="var(--teal-500)" accentColor="var(--teal-500)" sub={`${stats.total} total`} />
        <StatCard label="Stock Issues" value={lowStock.length} icon={Package} iconBg="rgba(244,63,94,0.1)" iconColor="var(--danger-500)" accentColor="var(--danger-500)" sub={`${stock.filter(s=>s.status==='Not Available').length} out of stock`} />
        <StatCard label="Overdue Repairs" value={overdueRepairs.length} icon={Wrench} iconBg={overdueRepairs.length > 0 ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)'} iconColor={overdueRepairs.length > 0 ? 'var(--danger-500)' : 'var(--success-500)'} accentColor={overdueRepairs.length > 0 ? 'var(--danger-500)' : 'var(--success-500)'} sub="External vendor" />
        <StatCard label="Zoom Sessions" value={upcomingZoom.length} icon={Video} iconBg="rgba(139,92,246,0.1)" iconColor="var(--purple-500)" accentColor="var(--purple-500)" sub="Upcoming & pending" />
      </div>

      {/* Account Provisioning & Quick User Directory Section */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} color="var(--teal-600)" />
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-grid">
        {/* Ticket Triage */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Helpdesk Ticket Triage</span>
            <Link to="/helpdesk" className="btn btn-ghost btn-sm"><ArrowRight size={14} /></Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>ID</th><th>Title</th><th>Category</th><th>Priority</th><th>Status</th></tr>
              </thead>
              <tbody>
                {tickets.filter(t => ['New','Assigned','In Progress','Pending Parts'].includes(t.status)).slice(0,5).map(t => (
                  <tr key={t.id}>
                    <td><Link to={`/helpdesk/${t.id}`} style={{ color: 'var(--teal-600)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>{t.id}</Link></td>
                    <td style={{ maxWidth: 180 }}><span className="truncate" style={{ display: 'block' }}>{t.title}</span></td>
                    <td><CategoryBadge category={t.category} /></td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td><Badge status={t.status} /></td>
                  </tr>
                ))}
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
            <Link to="/zoom" className="btn btn-ghost btn-sm"><ArrowRight size={14} /></Link>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {upcomingZoom.map(z => (
              <div key={z.id} className={`zoom-card zoom-card-level-${z.meetingLevel.toLowerCase()}`} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div className="zoom-meeting-name">{z.meetingName}</div>
                  <Badge status={z.meetingLevel === 'Critical' ? 'High' : 'Medium'}>{z.meetingLevel}</Badge>
                </div>
                <div className="zoom-detail-row"><Clock size={13} />{new Date(z.scheduledDate).toLocaleString()}</div>
                <div className="zoom-detail-row">{z.location}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Badge status={z.status} />
                  {z.meetingLink ? (
                    <span style={{ fontSize: '0.72rem', color: 'var(--teal-600)', fontWeight: 600 }}>✓ Link Uploaded</span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--warning-700)', fontWeight: 600 }}>⚠ Link Pending</span>
                  )}
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
    </div>
  );
}
