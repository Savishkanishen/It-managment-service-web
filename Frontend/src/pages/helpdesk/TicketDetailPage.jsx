import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge, CategoryBadge, PriorityBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { getUser, USERS, ROLES, getAsset, isTicketAssignedToUser } from '../../data/mockData';
import {
  ArrowLeft, User, Calendar, Tag, RefreshCw, CheckCircle, ChevronRight,
  XCircle, Lock, Trash2, Clock, Building, Monitor, FileText, Check, Edit3, Save
} from 'lucide-react';

const STATUS_FLOW = ['New', 'Assigned', 'In Progress', 'Pending Parts', 'Resolved', 'Closed'];

export default function TicketDetailPage() {
  const { id } = useParams();
  const {
    tickets, users, updateTicketStatus, assignTicket,
    submitReassignmentRequest, rejectReassignmentRequest, deleteTicket
  } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const [remoteTicket, setRemoteTicket] = useState(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [reassignModal, setReassignModal] = useState(false);
  const [reassignReason, setReassignReason] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [assignModal, setAssignModal] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // 1. Look up ticket from context or fetch from backend API if direct refresh
  const localTicket = tickets.find(t => t.id === id || t.ticketNumber === id);

  useEffect(() => {
    if (!localTicket && id) {
      setLoadingRemote(true);
      fetch(`http://localhost:5000/api/tickets/${id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setRemoteTicket(data);
          setLoadingRemote(false);
        })
        .catch(() => setLoadingRemote(false));
    }
  }, [id, localTicket]);

  const ticket = localTicket || remoteTicket;

  useEffect(() => {
    if (ticket && !isEditingNotes) {
      setNotesInput(ticket.notes || '');
    }
  }, [ticket, isEditingNotes]);

  if (loadingRemote) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray-500)' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
        <div>Loading ticket details...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Tag size={36} color="var(--gray-400)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Ticket Not Found</h2>
        <p style={{ color: 'var(--gray-500)', marginBottom: 20 }}>The requested ticket ID does not exist or has been removed.</p>
        <Link to="/helpdesk" className="btn btn-primary btn-sm">Return to Helpdesk</Link>
      </div>
    );
  }

  const rawRole = (currentUser?.role || '').toString().toLowerCase();
  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN].includes(currentUser?.role)
    || rawRole.includes('admin')
    || currentUser?.username?.toLowerCase() === 'admin';
  const canManage = isAdmin
    || currentUser?.role === ROLES.IT_OFFICER
    || rawRole.includes('officer');

  // Privacy Rule: Non-managers only see tickets assigned to them or reported by them
  if (!canManage && !isTicketAssignedToUser(ticket, currentUser)) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: 'var(--danger-500)', marginBottom: '16px' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Private Work Item</h2>
        <p style={{ color: 'var(--gray-500)', maxWidth: 440, margin: '0 auto 20px', fontSize: '0.875rem' }}>
          This ticket is assigned to another member. You do not have permission to view other members' assigned works.
        </p>
        <Link to="/helpdesk" className="btn btn-secondary">Back to Helpdesk</Link>
      </div>
    );
  }

  const assignedUser = getUser(ticket.assignedTo);
  const reporterUser = getUser(ticket.reportedBy || ticket.requesterId);
  const asset = ticket.assetId ? getAsset(ticket.assetId) : null;
  const isAssignee = ticket.assignedTo === currentUser?.id || ticket.assignedTo === currentUser?.username;
  const currentStatusIdx = STATUS_FLOW.indexOf(ticket.status);
  const nextStatus = currentStatusIdx >= 0 && currentStatusIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentStatusIdx + 1] : null;

  const handleStatusAdvance = () => {
    if (!nextStatus) return;
    updateTicketStatus(ticket.id, nextStatus, currentUser);
    addToast('success', 'Status Updated', `Ticket moved to "${nextStatus}"`);
  };

  const handleStatusSelect = (newStatus) => {
    updateTicketStatus(ticket.id, newStatus, currentUser);
    addToast('success', 'Status Updated', `Ticket status set to "${newStatus}"`);
  };

  const handleAssign = () => {
    if (!selectedAssignee) return;
    assignTicket(ticket.id, selectedAssignee, currentUser);
    addToast('success', 'Ticket Assigned', `Assigned to ${getUser(selectedAssignee)?.name}`);
    setAssignModal(false);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await fetch(`http://localhost:5000/api/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: ticket.status, notes: notesInput })
      });
      ticket.notes = notesInput;
      setIsEditingNotes(false);
      addToast('success', 'Notes Saved', 'Technician notes updated in database.');
    } catch (e) {
      ticket.notes = notesInput;
      setIsEditingNotes(false);
      addToast('info', 'Notes Updated', 'Technician notes saved locally.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDeleteTicket = () => {
    if (window.confirm(`Are you sure you want to permanently delete ticket ${ticket.id} (${ticket.title})? This will delete it from the database.`)) {
      deleteTicket(ticket.id, currentUser);
      addToast('warning', 'Ticket Deleted', `Ticket ${ticket.id} has been permanently deleted.`);
      navigate('/helpdesk');
    }
  };

  const handleReassignSubmit = () => {
    if (!reassignReason.trim()) return;
    submitReassignmentRequest(ticket.id, reassignReason, currentUser);
    addToast('success', 'Reassignment Requested', 'IT Admin has been notified');
    setReassignModal(false);
    setReassignReason('');
  };

  const handleRejectReassignSubmit = () => {
    rejectReassignmentRequest(ticket.id, rejectReason, currentUser);
    addToast('info', 'Reassignment Rejected', 'The reassignment request has been rejected');
    setRejectModal(false);
    setRejectReason('');
  };

  const technicians = (users && users.length > 0 ? users : USERS).filter(u => {
    const r = (u.role || '').toLowerCase();
    return r.includes('admin') || r.includes('officer') || r.includes('trainee');
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link to="/helpdesk" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }}>
          <ArrowLeft size={15} /> Back to Helpdesk
        </Link>
      </div>

      {/* Header Banner */}
      <div className="detail-header" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div className="detail-icon" style={{ background: 'rgba(6,182,212,0.1)' }}>
          <Tag size={28} color="var(--teal-500)" />
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="detail-title" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {ticket.title}
          </div>
          <div className="detail-meta" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <span className="id-chip" style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
              {ticket.ticketNumber || ticket.id}
            </span>
            <CategoryBadge category={ticket.category} />
            <PriorityBadge priority={ticket.priority} />
            <Badge status={ticket.status} />
            <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Building size={13} /> {ticket.division}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="detail-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {canManage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)' }}>Status:</span>
              <select
                className="form-select form-select-sm"
                value={ticket.status}
                onChange={e => handleStatusSelect(e.target.value)}
                style={{ width: 'auto', padding: '5px 10px', fontSize: '0.78rem' }}
              >
                {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {canManage && (
            <button className="btn btn-secondary btn-sm" onClick={() => setAssignModal(true)}>
              <User size={14} /> {ticket.assignedTo ? 'Reassign' : 'Assign'}
            </button>
          )}

          {(isAssignee || canManage) && nextStatus && (
            <button className="btn btn-primary btn-sm" onClick={handleStatusAdvance}>
              Move to {nextStatus} <ChevronRight size={14} />
            </button>
          )}

          {/* Delete Ticket: Authorized for Admins only */}
          {isAdmin && (
            <button
              className="btn btn-danger btn-sm"
              onClick={handleDeleteTicket}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px' }}
              title="Permanently Delete Ticket (Admin Only)"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Reassignment Alert - Pending */}
      {ticket.reassignmentRequest?.status === 'Pending' && (
        <div className="alert-card alert-card-warning" style={{ marginBottom: 20, borderRadius: 'var(--radius-lg)', padding: '14px 20px', display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={18} color="var(--warning-700)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="alert-title">Reassignment Request Pending</div>
            <div className="alert-message">
              <strong>{getUser(ticket.reassignmentRequest.requestedBy)?.name}</strong> requested reassignment:
              "{ticket.reassignmentRequest.reason}"
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4 }}>
              Requested at {new Date(ticket.reassignmentRequest.requestedAt).toLocaleString()}
            </div>
          </div>
          {canManage && (
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
              <button className="btn btn-outline-danger btn-sm" onClick={() => setRejectModal(true)}>
                <XCircle size={14} /> Reject
              </button>
              <button className="btn btn-warning btn-sm" onClick={() => setAssignModal(true)}>
                <RefreshCw size={14} /> Reassign Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reassignment Alert - Rejected */}
      {ticket.reassignmentRequest?.status === 'Rejected' && (
        <div className="alert-card alert-card-error" style={{ marginBottom: 20, borderRadius: 'var(--radius-lg)', padding: '14px 20px', display: 'flex', alignItems: 'flex-start' }}>
          <XCircle size={18} color="var(--danger-700)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="alert-title">Reassignment Request Rejected</div>
            <div className="alert-message">
              Reassignment request from <strong>{getUser(ticket.reassignmentRequest.requestedBy)?.name}</strong> was rejected by <strong>{getUser(ticket.reassignmentRequest.rejectedBy)?.name || 'IT Admin'}</strong>.
              {ticket.reassignmentRequest.rejectionReason && (
                <div style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--gray-700)' }}>
                  "{ticket.reassignmentRequest.rejectionReason}"
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4 }}>
              Rejected at {new Date(ticket.reassignmentRequest.rejectedAt).toLocaleString()}
            </div>
          </div>
          {isAssignee && (
            <button className="btn btn-secondary btn-sm" onClick={() => setReassignModal(true)} style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <RefreshCw size={14} /> Request Again
            </button>
          )}
        </div>
      )}

      {/* Status Progress Stepper */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">Lifecycle Progress</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STATUS_FLOW.map((s, i) => {
              const active = i <= currentStatusIdx;
              const current = i === currentStatusIdx;
              return (
                <React.Fragment key={s}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: current ? 'var(--teal-500)' : active ? 'var(--success-500)' : 'var(--gray-200)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 6
                    }}>
                      {active && !current && <CheckCircle size={16} color="white" />}
                      {current && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'white' }} />}
                    </div>
                    <div style={{
                      fontSize: '0.68rem',
                      fontWeight: current ? 700 : 500,
                      color: current ? 'var(--teal-600)' : active ? 'var(--success-600)' : 'var(--gray-400)',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      {s}
                    </div>
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div style={{
                      height: 2,
                      flex: 1,
                      background: active && i < currentStatusIdx ? 'var(--success-500)' : 'var(--gray-200)',
                      marginBottom: 20
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card-grid">
        {/* Left Column: Full Issue Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Issue Description</span></div>
            <div className="card-body">
              <div style={{
                fontSize: '0.92rem',
                color: 'var(--gray-800)',
                lineHeight: 1.7,
                background: 'var(--gray-50)',
                padding: '16px 18px',
                borderRadius: 'var(--radius-md)',
                whiteSpace: 'pre-wrap',
                border: '1px solid var(--gray-100)'
              }}>
                {ticket.description || 'No detailed description provided.'}
              </div>

              {/* Informational Key-Value Details */}
              <div className="info-grid" style={{ marginTop: 20 }}>
                <div className="info-item">
                  <div className="info-label">Division / Location</div>
                  <div className="info-value" style={{ fontWeight: 600 }}>{ticket.division || 'General IT'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Logged By / Requester</div>
                  <div className="info-value" style={{ fontWeight: 600 }}>
                    {reporterUser ? `${reporterUser.name} (@${reporterUser.username})` : (ticket.reportedBy || 'System Administrator')}
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">Date Created</div>
                  <div className="info-value">
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">Last Updated</div>
                  <div className="info-value">
                    {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Associated Asset Info (if any) */}
          {asset && (
            <div className="card">
              <div className="card-header">
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Monitor size={17} color="var(--teal-600)" />
                  Linked Ministry Asset
                </span>
                <Link to={`/assets/${asset.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.74rem' }}>
                  View Full Asset <ArrowRight size={13} />
                </Link>
              </div>
              <div className="card-body">
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-label">Asset Tag</div>
                    <div className="info-value" style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                      <Link to={`/assets/${asset.id}`} style={{ color: 'var(--teal-600)' }}>{asset.tag}</Link>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Device Type</div>
                    <div className="info-value">{asset.type}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Brand & Model</div>
                    <div className="info-value">{asset.brand} {asset.model}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Serial Number</div>
                    <div className="info-value" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{asset.serial || '—'}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Location</div>
                    <div className="info-value">{asset.location || '—'}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">IP Address</div>
                    <div className="info-value" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{asset.ip || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Technician Notes Card with Edit / Save feature */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={17} color="var(--teal-600)" />
                Technician & Admin Work Notes
              </span>
              {!isEditingNotes && canManage && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsEditingNotes(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem' }}
                >
                  <Edit3 size={13} /> Edit Notes
                </button>
              )}
            </div>
            <div className="card-body">
              {isEditingNotes ? (
                <div>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    value={notesInput}
                    onChange={e => setNotesInput(e.target.value)}
                    placeholder="Enter diagnostic steps, parts used, troubleshooting notes..."
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setIsEditingNotes(false); setNotesInput(ticket.notes || ''); }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Save size={13} /> {savingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  fontSize: '0.86rem',
                  color: ticket.notes ? 'var(--gray-800)' : 'var(--gray-400)',
                  lineHeight: 1.6,
                  background: 'var(--gray-50)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontStyle: ticket.notes ? 'normal' : 'italic'
                }}>
                  {ticket.notes || 'No work notes recorded yet. Click "Edit Notes" to add diagnostic or resolution logs.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Assignment & Technician Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Assigned Technician</span></div>
            <div className="card-body">
              {assignedUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0', borderBottom: '1px solid var(--gray-100)', marginBottom: 16 }}>
                  <div className="avatar avatar-lg" style={{ background: 'var(--slate-800)', color: '#fff', fontSize: '1rem' }}>
                    {assignedUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{assignedUser.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>@{assignedUser.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--teal-600)', marginTop: 2 }}>
                      {assignedUser.role?.replace('_', ' ').toUpperCase()} • {assignedUser.division}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', borderBottom: '1px solid var(--gray-100)', marginBottom: 16, color: 'var(--gray-400)' }}>
                  <User size={30} style={{ margin: '0 auto 6px', opacity: 0.3 }} />
                  <div>No technician assigned</div>
                </div>
              )}

              {canManage && (
                <button
                  className="btn btn-secondary w-full"
                  onClick={() => setAssignModal(true)}
                  style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <User size={14} /> {ticket.assignedTo ? 'Change Assignee' : 'Assign Technician'}
                </button>
              )}

              {isAssignee && !ticket.reassignmentRequest && (
                <button
                  className="btn btn-warning w-full"
                  onClick={() => setReassignModal(true)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <RefreshCw size={14} /> Request Reassignment
                </button>
              )}
            </div>
          </div>

          {/* Quick Info & Danger Zone */}
          <div className="card">
            <div className="card-header"><span className="card-title">Ticket Classification</span></div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>Job Category</span>
                  <CategoryBadge category={ticket.category} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>Priority Level</span>
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>Workflow Stage</span>
                  <Badge status={ticket.status} />
                </div>
              </div>

              {/* Danger Zone: Admin-Only Ticket Deletion */}
              {isAdmin && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--gray-100)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger-600)', marginBottom: 6 }}>
                    ADMIN PRIVILEGES
                  </div>
                  <button
                    className="btn btn-outline-danger w-full"
                    onClick={handleDeleteTicket}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.78rem' }}
                  >
                    <Trash2 size={13} /> Delete This Ticket
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      <Modal
        isOpen={assignModal}
        onClose={() => setAssignModal(false)}
        title="Assign Technician"
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setAssignModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAssign} disabled={!selectedAssignee}>
              Confirm Assignment
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Select Technician</label>
          <select className="form-select" value={selectedAssignee} onChange={e => setSelectedAssignee(e.target.value)}>
            <option value="">-- Choose Technician --</option>
            {technicians.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role?.replace('_', ' ').toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </Modal>

      {/* Reassign Modal */}
      <Modal
        isOpen={reassignModal}
        onClose={() => setReassignModal(false)}
        title="Request Reassignment"
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setReassignModal(false)}>Cancel</button>
            <button className="btn btn-warning" onClick={handleReassignSubmit} disabled={!reassignReason.trim()}>
              Submit Request
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Reason for Reassignment <span className="required">*</span></label>
          <textarea
            className="form-textarea"
            value={reassignReason}
            onChange={e => setReassignReason(e.target.value)}
            placeholder="Explain why this ticket needs reassignment..."
            rows={4}
          />
        </div>
      </Modal>

      {/* Reject Reassignment Modal */}
      <Modal
        isOpen={rejectModal}
        onClose={() => { setRejectModal(false); setRejectReason(''); }}
        title="Reject Reassignment Request"
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setRejectModal(false); setRejectReason(''); }}>Cancel</button>
            <button className="btn btn-danger" onClick={handleRejectReassignSubmit}>
              <XCircle size={14} /> Reject Request
            </button>
          </>
        }
      >
        <div>
          <div className="alert-card alert-card-warning" style={{ borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: '0.82rem' }}>
              <strong>{getUser(ticket.reassignmentRequest?.requestedBy)?.name}</strong> requested reassignment:
              <div style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--gray-700)' }}>
                "{ticket.reassignmentRequest?.reason}"
              </div>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Reason for Rejection (Optional)</label>
            <textarea
              className="form-textarea"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain why the reassignment request is rejected..."
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
