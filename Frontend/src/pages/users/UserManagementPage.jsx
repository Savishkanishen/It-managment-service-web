import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge, RoleBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { ROLES, DIVISIONS } from '../../data/mockData';
import { Users, Shield, ToggleLeft, ToggleRight, Edit3, Search, UserPlus, Lock, Mail, Building, User, Key } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: ROLES.SUPER_ADMIN, label: 'Super Administrator' },
  { value: ROLES.IT_ADMIN, label: 'IT Administrator' },
  { value: ROLES.TRAINEE, label: 'Trainee / Intern' },
  { value: ROLES.ZOOM_REQUESTER, label: 'Zoom Requester (External)' },
];

const AVATAR_COLORS = ['#36312E', '#C2A78A', '#7A6B5C', '#546355', '#91533B', '#485C69'];
const getAvatarColor = (id = '') => {
  const str = String(id);
  const code = str.length > 0 ? str.charCodeAt(str.length - 1) : 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
};

export default function UserManagementPage() {
  const { users, divisions, createUser, updateUserRole, toggleUserActive } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();

  // Role modification modal state
  const [roleModal, setRoleModal] = useState(null);
  const [newRole, setNewRole] = useState('');

  // Create user modal state
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    email: '',
    password: 'password123',
    role: ROLES.TRAINEE,
    division: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search filter
  const [search, setSearch] = useState('');

  const divisionList = divisions && divisions.length > 0 ? divisions : DIVISIONS;

  const filtered = users.filter(u =>
    !search || [u.name, u.email, u.division, u.username].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleRoleChange = () => {
    updateUserRole(roleModal.id, newRole, currentUser);
    addToast('success', 'Role Updated', `${roleModal.name}'s role changed to ${ROLE_OPTIONS.find(r=>r.value===newRole)?.label}`);
    setRoleModal(null);
  };

  const handleToggle = (user) => {
    if (user.id === currentUser.id) {
      addToast('error', 'Cannot Modify', 'You cannot deactivate your own account');
      return;
    }
    toggleUserActive(user.id, currentUser);
    addToast('success', 'Status Updated', `${user.name} is now ${user.active ? 'deactivated' : 'activated'}`);
  };

  const openCreateModal = () => {
    setFormError('');
    setCreateForm({
      name: '',
      username: '',
      email: '',
      password: 'password123',
      role: ROLES.TRAINEE,
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

    // Client-side quick checks
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

      addToast('success', 'User Created', `User "${created.name}" (@${created.username}) created successfully.`);
      setCreateModal(false);
    } catch (err) {
      setFormError(err.message || 'Failed to create user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>User Management</h1>
          <p>Dynamic Role-Based Access Control — IT Admin & Super Admin Provisioning</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'rgba(8,145,178,0.08)', borderRadius:'var(--radius-md)', border:'1px solid rgba(8,145,178,0.2)' }}>
            <Shield size={15} color="var(--teal-500)" />
            <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--teal-700)' }}>Administrator Control</span>
          </div>
          <button className="btn btn-primary" onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={16} /> Add New User
          </button>
        </div>
      </div>

      {/* Role Counts */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {ROLE_OPTIONS.map(r => {
          const count = users.filter(u => u.role === r.value).length;
          return (
            <div key={r.value} className="stat-card" style={{ '--stat-accent':'var(--teal-500)' }}>
              <div className="stat-icon" style={{ background:'rgba(6,182,212,0.1)' }}><Users size={20} color="var(--teal-500)" /></div>
              <div className="stat-content"><div className="stat-label">{r.label}</div><div className="stat-value">{count}</div></div>
            </div>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Search size={15} color="var(--gray-400)" />
            <input className="filter-input" placeholder="Search users by name, username, division..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width:320 }} />
          </div>
          <span style={{ fontSize:'0.78rem', color:'var(--gray-400)' }}>{filtered.length} of {users.length} users</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>User</th><th>Username</th><th>Division</th><th>Role</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div className="avatar" style={{ background: getAvatarColor(u.id) }}>{u.avatar || u.name.slice(0,2).toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:'0.875rem' }}>{u.name}</div>
                        <div style={{ fontSize:'0.72rem', color:'var(--gray-400)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.8rem' }}>{u.username}</span></td>
                  <td style={{ fontSize:'0.82rem', color:'var(--gray-600)' }}>{u.division}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td><Badge status={u.active ? 'Active' : 'Inactive'} /></td>
                  <td>
                    <div style={{ display:'flex', gap:8 }}>
                      {u.id !== currentUser.id && (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setRoleModal(u); setNewRole(u.role); }} title="Change Role">
                            <Edit3 size={13} /> Role
                          </button>
                          <button
                            className={`btn btn-sm ${u.active ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => handleToggle(u)}
                            title={u.active ? 'Deactivate' : 'Activate'}
                          >
                            {u.active ? <ToggleLeft size={13} /> : <ToggleRight size={13} />}
                            {u.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
                      )}
                      {u.id === currentUser.id && <span style={{ fontSize:'0.78rem', color:'var(--gray-400)' }}>Current user</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New User Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Create New User Account"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateSubmit} disabled={submitting}>
              {submitting ? 'Creating User...' : 'Create User'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit}>
          {formError && (
            <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--danger-700)', fontSize: '0.85rem', marginBottom: 16 }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Full Name / Display Name <span className="required">*</span></label>
              <input
                className="form-input"
                placeholder="e.g. Jane Doe"
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Username <span className="required">*</span></label>
              <input
                className="form-input"
                placeholder="e.g. janedoe"
                value={createForm.username}
                onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Email Address <span className="required">*</span></label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. jane@mohe.gov.mv"
                value={createForm.email}
                onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Initial password"
                value={createForm.password}
                onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                required
              />
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
              <select
                className="form-select"
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

          {createForm.role === ROLES.SUPER_ADMIN && (
            <div className="alert-card alert-card-error" style={{ borderRadius:'var(--radius-md)', marginTop: 12 }}>
              <div className="alert-title">⚠ Granting Super Admin Access</div>
              <div className="alert-message">This user will have unrestricted administrative access across the entire system, including audit logs and user role management.</div>
            </div>
          )}
        </form>
      </Modal>

      {/* Role Change Modal */}
      <Modal
        isOpen={!!roleModal}
        onClose={() => setRoleModal(null)}
        title="Change User Role"
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setRoleModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleRoleChange} disabled={newRole === roleModal?.role}>Update Role</button>
          </>
        }
      >
        {roleModal && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px', background:'var(--gray-50)', borderRadius:'var(--radius-md)', marginBottom:16 }}>
              <div className="avatar avatar-lg" style={{ background: getAvatarColor(roleModal.id) }}>{roleModal.avatar || roleModal.name.slice(0,2)}</div>
              <div><div style={{ fontWeight:700 }}>{roleModal.name}</div><div style={{ fontSize:'0.78rem', color:'var(--gray-500)' }}>{roleModal.email}</div></div>
            </div>
            <div className="form-group">
              <label className="form-label">New Role <span className="required">*</span></label>
              <select className="form-select" value={newRole} onChange={e=>setNewRole(e.target.value)}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <div className="form-hint">This immediately changes the user's access level across the entire system.</div>
            </div>
            {newRole === ROLES.SUPER_ADMIN && (
              <div className="alert-card alert-card-error" style={{ borderRadius:'var(--radius-md)' }}>
                <div className="alert-title">⚠ Granting Super Admin Access</div>
                <div className="alert-message">This user will have unrestricted access to all modules including audit logs and privilege management.</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
