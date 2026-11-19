import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge } from '../../components/ui/Badge';
import { USERS, ROLES, getUser } from '../../data/mockData';
import { Video, Plus, MapPin, Clock, Link as LinkIcon, User, Send, Check, Sparkles, CheckCircle2, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';

export default function ZoomListPage() {
  const { zoomRequests, assignZoomRequest, updateZoomMeetingLink, updateZoomStatus, deleteZoomRequest, users } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();
  const [assignModal, setAssignModal] = useState(null);
  const [assignee, setAssignee] = useState('');
  const [linkModal, setLinkModal] = useState(null);
  const [meetingLink, setMeetingLink] = useState('');
  const [filter, setFilter] = useState('All');

  const canManageZoom = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_OFFICER].includes(currentUser.role);
  const userList = users && users.length > 0 ? users : USERS;
  const technicians = userList.filter(u => [ROLES.IT_ADMIN, ROLES.IT_OFFICER, ROLES.TRAINEE].includes(u.role));

  const filtered = filter === 'All' ? zoomRequests : zoomRequests.filter(z => z.status === filter);

  const handleAssign = () => {
    assignZoomRequest(assignModal.id, assignee || currentUser.id, currentUser);
    addToast('success', 'Assigned', `Zoom request assigned to ${getUser(assignee || currentUser.id)?.name || 'Technician'}`);
    setAssignModal(null);
    setAssignee('');
  };

  const generateModalLink = () => {
    const meetingId = Math.floor(1000000000 + Math.random() * 9000000000);
    const pwd = Math.random().toString(36).slice(2, 10);
    const generated = `https://zoom.us/j/${meetingId}?pwd=${pwd}`;
    setMeetingLink(generated);
    addToast('info', 'Link Generated', 'Official Zoom meeting URL generated.');
  };

  const handleSaveLink = () => {
    if (!meetingLink.trim()) {
      addToast('error', 'Missing Link', 'Please enter a valid Zoom meeting URL');
      return;
    }
    updateZoomMeetingLink(linkModal.id, meetingLink.trim(), currentUser);
    addToast('success', 'Zoom Link Uploaded', `Meeting link sent for "${linkModal.meetingName}"`);
    setLinkModal(null);
    setMeetingLink('');
  };

  const handleStatusChange = (z, newStatus) => {
    updateZoomStatus(z.id, newStatus, currentUser);
    addToast('success', 'Status Updated', `Meeting "${z.meetingName}" marked as ${newStatus}`);
  };

  const handleDelete = (z) => {
    if (window.confirm(`Are you sure you want to cancel and delete meeting "${z.meetingName}"?`)) {
      deleteZoomRequest(z.id, currentUser);
      addToast('warning', 'Meeting Cancelled', `Zoom meeting "${z.meetingName}" deleted.`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Zoom Support Scheduler</h1>
          <p>Manage meeting technical support requests, provision Zoom meeting links, and assign staff</p>
        </div>
        <div className="page-header-actions">
          <Link to="/zoom/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> {canManageZoom ? 'Schedule Zoom Meeting' : 'New Zoom Request'}
          </Link>
        </div>
      </div>

      <div className="tab-list">
        {['All', 'Pending', 'Confirmed', 'Completed'].map(s => (
          <div key={s} className={`tab-item ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s}
            <span style={{ fontSize: '0.72rem', background: 'rgba(155, 168, 171, 0.25)', color: 'var(--slate-950)', padding: '1px 6px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
              {s === 'All' ? zoomRequests.length : zoomRequests.filter(z => z.status === s).length}
            </span>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray-500)' }}>
          <Video size={40} style={{ margin: '0 auto 12px', opacity: 0.3, color: 'var(--slate-700)' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--slate-950)' }}>No {filter !== 'All' ? filter : ''} Zoom meetings found</div>
          <div style={{ fontSize: '0.82rem', marginTop: 4 }}>Click "Schedule Zoom Meeting" to create a new session.</div>
          <div style={{ marginTop: 16 }}>
            <Link to="/zoom/new" className="btn btn-primary btn-sm">
              <Plus size={14} /> Schedule Now
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
          {filtered.map(z => {
            const assignedUser = getUser(z.assignedTo);
            const requester = getUser(z.requestedBy);
            return (
              <div key={z.id} className={`zoom-card zoom-card-level-${z.meetingLevel?.toLowerCase() || 'medium'}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <span className="id-chip" style={{ marginBottom: 4, display: 'inline-block' }}>{z.id}</span>
                    <div className="zoom-meeting-name">{z.meetingName}</div>
                  </div>
                  <Badge status={z.meetingLevel === 'Critical' ? 'High' : 'Medium'}>{z.meetingLevel}</Badge>
                </div>

                <div className="zoom-detail-row">
                  <Clock size={13} color="var(--slate-500)" />
                  <span>{new Date(z.scheduledDate).toLocaleString()}</span>
                </div>
                <div className="zoom-detail-row">
                  <MapPin size={13} color="var(--slate-500)" />
                  <span>{z.location}</span>
                </div>
                <div className="zoom-detail-row">
                  <User size={13} color="var(--slate-500)" />
                  <span style={{ fontSize: '0.78rem' }}>
                    Requested by: <strong>{requester ? requester.name : 'Staff'}</strong> {requester?.division ? `(${requester.division})` : ''}
                  </span>
                </div>

                {z.meetingLink ? (
                  <div className="zoom-detail-row" style={{ color: 'var(--slate-700)', marginTop: 6, background: 'rgba(155, 168, 171, 0.15)', padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <LinkIcon size={14} color="var(--slate-700)" />
                    <a
                      href={z.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--slate-700)', fontWeight: 700, textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      Join Official Zoom Link →
                    </a>
                  </div>
                ) : (
                  <div className="zoom-detail-row" style={{ color: 'var(--slate-500)', marginTop: 4, fontSize: '0.78rem' }}>
                    <Clock size={13} />
                    <em>Official Zoom link not yet uploaded</em>
                  </div>
                )}

                <div className="zoom-equipment-list">
                  {(z.requiredEquipment || []).map(e => <span key={e} className="zoom-equipment-tag">{e}</span>)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <Badge status={z.status} />
                    {assignedUser && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: 4, fontWeight: 500 }}>
                        Tech: {assignedUser.name}
                      </div>
                    )}
                  </div>
                  {canManageZoom && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        className={z.meetingLink ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
                        onClick={() => { setLinkModal(z); setMeetingLink(z.meetingLink || ''); }}
                        title="Upload or Edit Link"
                      >
                        <LinkIcon size={13} /> {z.meetingLink ? 'Edit Link' : 'Upload Link'}
                      </button>
                      {z.status !== 'Completed' ? (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => { setAssignModal(z); setAssignee(z.assignedTo || ''); }}
                            title="Assign technician"
                          >
                            <User size={13} /> {z.assignedTo ? 'Reassign' : 'Assign'}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleStatusChange(z, 'Completed')}
                            style={{ color: 'var(--success-700)', padding: '5px 8px' }}
                            title="Mark meeting completed"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleStatusChange(z, 'Confirmed')}
                          style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}
                          title="Reopen meeting"
                        >
                          Reopen
                        </button>
                      )}
                      <button
                        className="icon-btn"
                        onClick={() => handleDelete(z)}
                        style={{ width: 28, height: 28, color: 'var(--danger-500)' }}
                        title="Delete meeting"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Zoom Link Modal */}
      <Modal
        isOpen={!!linkModal}
        onClose={() => { setLinkModal(null); setMeetingLink(''); }}
        title="Upload or Provision Zoom Meeting Link"
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setLinkModal(null); setMeetingLink(''); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveLink} disabled={!meetingLink.trim()}>
              <Send size={14} /> Save Zoom Link
            </button>
          </>
        }
      >
        {linkModal && (
          <div>
            <div style={{ padding: '12px 14px', background: 'var(--oc-45)', borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-950)' }}>{linkModal.meetingName}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-600)', marginTop: 3 }}>
                Requested by: <strong>{getUser(linkModal.requestedBy)?.name || 'Staff'}</strong> ({getUser(linkModal.requestedBy)?.division || 'Ministry'})
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 2 }}>
                Scheduled: {new Date(linkModal.scheduledDate).toLocaleString()} • {linkModal.location}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Zoom Meeting Link / URL <span className="required">*</span></label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={generateModalLink}
                  style={{ fontSize: '0.72rem', color: 'var(--slate-700)', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <LinkIcon size={12} /> Generate Link
                </button>
              </div>
              <input
                className="form-input"
                placeholder="https://zoom.us/j/1234567890?pwd=..."
                value={meetingLink}
                onChange={e => setMeetingLink(e.target.value)}
                autoFocus
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
              />
              <div className="form-hint" style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 4 }}>
                Enter or generate the official meeting URL. It will be sent to the requester immediately.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Zoom Support Technician" size="sm"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAssign}>Assign</button>
        </>}
      >
        {assignModal && (
          <div>
            <div style={{ padding: '12px 14px', background: 'var(--oc-45)', borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, color: 'var(--slate-950)' }}>{assignModal.meetingName}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>{new Date(assignModal.scheduledDate).toLocaleString()}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Assign Technician</label>
              <select className="form-select" value={assignee} onChange={e => setAssignee(e.target.value)}>
                <option value={currentUser.id}>Self — {currentUser.name}</option>
                {technicians.filter(u => u.id !== currentUser.id).map(u => <option key={u.id} value={u.id}>{u.name} ({u.role?.replace(/_/g, ' ')})</option>)}
              </select>
              <div className="form-hint">Assign a technician for equipment setup, camera configuration, and on-site support</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
