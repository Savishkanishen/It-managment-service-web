import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import DataTable from '../../components/ui/DataTable';
import { Badge, CategoryBadge, PriorityBadge } from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import Modal from '../../components/ui/Modal';
import { getTicketStats, getUser, ROLES, isTicketAssignedToUser } from '../../data/mockData';
import {
  Ticket, Plus, Search, AlertCircle, CheckCircle, Clock, RefreshCw,
  XCircle, Lock, Trash2, ExternalLink, User, Building, Monitor
} from 'lucide-react';

const STATUS_ORDER = ['New', 'Assigned', 'In Progress', 'Pending Parts', 'Resolved', 'Closed'];
const ONGOING_STATUSES = ['New', 'Assigned', 'In Progress', 'Pending Parts'];
const OLD_STATUSES = ['Resolved', 'Closed'];

export default function TicketListPage() {
  const { tickets, deleteTicket } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();

  const [scopeTab, setScopeTab] = useState('All'); // 'All' | 'Ongoing' | 'Old' | 'Reassign'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [quickViewTicket, setQuickViewTicket] = useState(null);

  const rawRole = (currentUser?.role || '').toString().toLowerCase();
  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(currentUser?.role)
    || rawRole.includes('admin')
    || currentUser?.username?.toLowerCase() === 'admin';
  const canManageTickets = isAdmin
    || currentUser?.role === ROLES.IT_OFFICER
    || rawRole.includes('officer');
  const isTrainee = rawRole === ROLES.TRAINEE || rawRole.includes('trainee');

  // Privacy Rule: Trainees only see tickets assigned to them or reported by them.
  // Admins and IT Officers see all tickets across the Ministry.
  const visibleTickets = canManageTickets ? tickets : tickets.filter(t => isTicketAssignedToUser(t, currentUser));

  const ongoingCount = visibleTickets.filter(t => ONGOING_STATUSES.includes(t.status)).length;
  const oldCount = visibleTickets.filter(t => OLD_STATUSES.includes(t.status)).length;
  const pendingReassignCount = visibleTickets.filter(t => t.reassignmentRequest?.status === 'Pending').length;

  const handleDelete = (t) => {
    if (window.confirm(`Are you sure you want to permanently delete ticket ${t.ticketNumber || t.id} (${t.title})? This will delete it from the database.`)) {
      deleteTicket(t.id, currentUser);
      addToast('warning', 'Ticket Deleted', `Ticket ${t.ticketNumber || t.id} has been permanently deleted.`);
      if (quickViewTicket?.id === t.id) setQuickViewTicket(null);
    }
  };

  const filtered = visibleTickets.filter(t => {
    // 1. Scope filter (All vs Ongoing vs Old/Closed vs Reassignments)
    if (scopeTab === 'Ongoing' && !ONGOING_STATUSES.includes(t.status)) return false;
    if (scopeTab === 'Old' && !OLD_STATUSES.includes(t.status)) return false;
    if (scopeTab === 'Reassign' && t.reassignmentRequest?.status !== 'Pending') return false;

    // 2. Specific filters
    const matchCat = categoryFilter === 'All' || t.category === categoryFilter;
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchPri = priorityFilter === 'All' || t.priority === priorityFilter;

    // 3. Search text
    const assignedUser = getUser(t.assignedTo);
    const matchSearch = !search || [
      t.id,
      t.ticketNumber,
      t.title,
      t.division,
      t.category,
      assignedUser?.name
    ].some(v => v?.toLowerCase().includes(search.toLowerCase()));

    return matchCat && matchStatus && matchPri && matchSearch;
  });

  const columns = [
    {
      key: 'id',
      label: 'Ticket ID',
      render: (v, row) => (
        <Link
          to={`/helpdesk/${row.id}`}
          style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--teal-600)', fontWeight: 600, fontSize: '0.8rem' }}
        >
          {row.ticketNumber || v}
        </Link>
      )
    },
    {
      key: 'title',
      label: 'Issue Details',
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{v}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{row.division}</div>
          {row.reassignmentRequest?.status === 'Pending' && (
            <span className="badge badge-amber" style={{ fontSize: '0.65rem', marginTop: 3 }}>
              <RefreshCw size={9} /> Reassignment Pending
            </span>
          )}
          {row.reassignmentRequest?.status === 'Rejected' && (
            <span className="badge badge-red" style={{ fontSize: '0.65rem', marginTop: 3 }}>
              <XCircle size={9} /> Reassign Rejected
            </span>
          )}
        </div>
      )
    },
    { key: 'category', label: 'Category', render: v => <CategoryBadge category={v} /> },
    { key: 'priority', label: 'Priority', render: v => <PriorityBadge priority={v} /> },
    { key: 'status', label: 'Status', render: v => <Badge status={v} /> },
    {
      key: 'assignedTo',
      label: 'Assignee',
      render: v => {
        const u = getUser(v);
        return u ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div className="avatar avatar-sm" style={{ background: 'var(--slate-800)', color: '#fff' }}>
              {u.name.slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{u.name}</span>
          </div>
        ) : <span style={{ color: 'var(--gray-400)' }}>Unassigned</span>;
      }
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: v => (
        <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
          {v ? new Date(v).toLocaleDateString() : '—'}
        </span>
      )
    },
    {
      key: 'action',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', fontSize: '0.74rem' }}
            onClick={() => setQuickViewTicket(row)}
            title="Quick preview ticket info"
          >
            Quick View
          </button>
          <Link
            to={`/helpdesk/${row.id}`}
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px 6px', fontSize: '0.74rem', color: 'var(--teal-600)', display: 'inline-flex', alignItems: 'center', gap: 3 }}
            title="Open full page"
          >
            Open <ExternalLink size={11} />
          </Link>
          {isAdmin && (
            <button
              className="icon-btn"
              style={{ width: 26, height: 26, color: 'var(--danger-500)' }}
              onClick={() => handleDelete(row)}
              title="Delete ticket (Admin Only)"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Helpdesk Tickets</h1>
          <p>Manage, triage, and track ongoing service tickets and historical resolved requests</p>
        </div>
        <div className="page-header-actions">
          {canManageTickets && (
            <Link to="/helpdesk/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> Log New Ticket
            </Link>
          )}
        </div>
      </div>

      {!canManageTickets && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '0.82rem',
          color: 'var(--teal-700)'
        }}>
          <Lock size={15} color="var(--teal-600)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Private Helpdesk:</strong> Showing only tickets assigned directly to you or reported by you.
          </span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard
          label="Total Tickets"
          value={visibleTickets.length}
          icon={Ticket}
          iconBg="rgba(6,182,212,0.1)"
          iconColor="var(--teal-500)"
          accentColor="var(--teal-500)"
        />
        <StatCard
          label="Current Ongoing"
          value={ongoingCount}
          icon={Clock}
          iconBg="rgba(245,158,11,0.1)"
          iconColor="var(--warning-500)"
          accentColor="var(--warning-500)"
          sub="New, Assigned & In Progress"
        />
        <StatCard
          label="Old / Resolved"
          value={oldCount}
          icon={CheckCircle}
          iconBg="rgba(16,185,129,0.1)"
          iconColor="var(--success-500)"
          accentColor="var(--success-500)"
          sub="Resolved & Closed archive"
        />
        <StatCard
          label="Reassign Pending"
          value={pendingReassignCount}
          icon={AlertCircle}
          iconBg={pendingReassignCount > 0 ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)'}
          iconColor={pendingReassignCount > 0 ? 'var(--danger-500)' : 'var(--success-500)'}
          accentColor={pendingReassignCount > 0 ? 'var(--danger-500)' : 'var(--success-500)'}
        />
      </div>

      {/* Primary Scope Tabs: All vs Ongoing vs Old vs Reassign */}
      <div className="tab-list" style={{ marginBottom: 14 }}>
        <div
          className={`tab-item ${scopeTab === 'All' ? 'active' : ''}`}
          onClick={() => setScopeTab('All')}
        >
          All Tickets
          <span style={{ fontSize: '0.72rem', background: 'rgba(155, 168, 171, 0.25)', color: 'var(--slate-950)', padding: '1px 6px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
            {visibleTickets.length}
          </span>
        </div>
        <div
          className={`tab-item ${scopeTab === 'Ongoing' ? 'active' : ''}`}
          onClick={() => setScopeTab('Ongoing')}
        >
          Current Ongoing
          <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning-700)', padding: '1px 6px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
            {ongoingCount}
          </span>
        </div>
        <div
          className={`tab-item ${scopeTab === 'Old' ? 'active' : ''}`}
          onClick={() => setScopeTab('Old')}
        >
          Old / Resolved & Closed
          <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success-700)', padding: '1px 6px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
            {oldCount}
          </span>
        </div>
        {pendingReassignCount > 0 && (
          <div
            className={`tab-item ${scopeTab === 'Reassign' ? 'active' : ''}`}
            onClick={() => setScopeTab('Reassign')}
          >
            Reassign Requests
            <span style={{ fontSize: '0.72rem', background: 'rgba(244, 63, 94, 0.2)', color: 'var(--danger-700)', padding: '1px 6px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
              {pendingReassignCount}
            </span>
          </div>
        )}
      </div>

      {/* Category Pills Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {['All', 'Hardware', 'Software', 'Network', 'PC/Printer'].map(cat => (
          <button
            key={cat}
            className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}
            onClick={() => setCategoryFilter(cat)}
          >
            {cat}
            <span style={{ marginLeft: 5, opacity: 0.8, fontSize: '0.7rem' }}>
              ({cat === 'All' ? visibleTickets.length : visibleTickets.filter(t => t.category === cat).length})
            </span>
          </button>
        ))}
      </div>

      {/* Main Table Container */}
      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={15} color="var(--gray-400)" />
            <input
              className="filter-input"
              placeholder="Search ticket ID, title, division, technician..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 300 }}
            />
          </div>
          <div className="table-filters" style={{ display: 'flex', gap: 8 }}>
            <select
              className="filter-input"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              className="filter-input"
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage={`No ${scopeTab !== 'All' ? scopeTab.toLowerCase() : ''} tickets found matching your criteria.`}
          emptyIcon="🎫"
        />

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--gray-100)', fontSize: '0.78rem', color: 'var(--gray-400)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Showing {filtered.length} of {visibleTickets.length} tickets</span>
          {canManageTickets && (
            <Link to="/helpdesk/new" style={{ color: 'var(--slate-800)', fontWeight: 600, textDecoration: 'none' }}>
              + Log new ticket
            </Link>
          )}
        </div>
      </div>

      {/* Quick View Modal Drawer for Easy Details Reading */}
      {quickViewTicket && (
        <Modal
          isOpen={true}
          onClose={() => setQuickViewTicket(null)}
          title={`Ticket Overview: ${quickViewTicket.ticketNumber || quickViewTicket.id}`}
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              {isAdmin && (
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => handleDelete(quickViewTicket)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Trash2 size={13} /> Delete Ticket
                </button>
              )}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setQuickViewTicket(null)}>
                  Close
                </button>
                <Link
                  to={`/helpdesk/${quickViewTicket.id}`}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  Open Full Detail Page <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          }
        >
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, color: 'var(--slate-900)' }}>
              {quickViewTicket.title}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span className="id-chip">{quickViewTicket.ticketNumber || quickViewTicket.id}</span>
              <CategoryBadge category={quickViewTicket.category} />
              <PriorityBadge priority={quickViewTicket.priority} />
              <Badge status={quickViewTicket.status} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div className="info-label" style={{ marginBottom: 4 }}>Detailed Issue Description</div>
              <div style={{
                background: 'var(--gray-50)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.86rem',
                lineHeight: 1.6,
                color: 'var(--gray-800)',
                border: '1px solid var(--gray-100)',
                whiteSpace: 'pre-wrap'
              }}>
                {quickViewTicket.description || 'No description provided.'}
              </div>
            </div>

            <div className="info-grid" style={{ marginBottom: 14 }}>
              <div className="info-item">
                <div className="info-label">Division / Location</div>
                <div className="info-value" style={{ fontWeight: 600 }}>{quickViewTicket.division}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Assigned Technician</div>
                <div className="info-value">
                  {getUser(quickViewTicket.assignedTo)?.name || 'Not Assigned'}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Reported By</div>
                <div className="info-value">
                  {getUser(quickViewTicket.reportedBy)?.name || quickViewTicket.reportedBy || 'System Administrator'}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Date Created</div>
                <div className="info-value">
                  {quickViewTicket.createdAt ? new Date(quickViewTicket.createdAt).toLocaleString() : '—'}
                </div>
              </div>
            </div>

            {quickViewTicket.notes && (
              <div>
                <div className="info-label" style={{ marginBottom: 4 }}>Technician Notes</div>
                <div style={{
                  background: 'var(--gray-50)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  color: 'var(--gray-700)',
                  fontStyle: 'italic'
                }}>
                  {quickViewTicket.notes}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
