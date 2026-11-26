import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import StatCard from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { DIVISIONS, generateZoomMeetingId } from '../../data/mockData';
import { Video, Clock, MapPin, Link as LinkIcon, Plus, CheckCircle, Monitor, Info, CheckCircle2, Trash2 } from 'lucide-react';

const EQUIPMENT_OPTIONS = ['Projector','HDMI Cable','VGA Cable','Laptop','Webcam','Microphone','Screen','Extension Cord','Pointer'];

export default function ZoomRequesterDashboard() {
  const { currentUser } = useAuth();
  const { zoomRequests, createZoomRequest, updateZoomStatus, deleteZoomRequest } = useData();
  const { addToast } = useNotifications();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    meetingName: '',
    branch: currentUser?.division || 'Academic Affairs Division',
    location: '',
    meetingLevel: 'Medium',
    scheduledDate: '',
    requiredEquipment: [],
  });

  const liveMeetingId = generateZoomMeetingId(form.scheduledDate, form.branch, zoomRequests);

  const myRequests = zoomRequests.filter(z => z.requestedBy === currentUser?.id || z.requestedBy === currentUser?.username);

  const handleStatusChange = (z, newStatus) => {
    updateZoomStatus(z.id, newStatus, currentUser);
    addToast('success', 'Status Updated', `Meeting "${z.meetingName}" marked as ${newStatus}`);
  };

  const handleDelete = (z) => {
    if (window.confirm(`Are you sure you want to cancel and delete meeting "${z.meetingName}"?`)) {
      deleteZoomRequest(z.id, currentUser);
      addToast('warning', 'Meeting Deleted', `Meeting "${z.meetingName}" has been removed.`);
    }
  };

  const toggleEquip = (eq) => {
    setForm(f => ({
      ...f,
      requiredEquipment: f.requiredEquipment.includes(eq)
        ? f.requiredEquipment.filter(e => e !== eq)
        : [...f.requiredEquipment, eq]
    }));
  };

  const handleSubmit = async () => {
    if (!form.meetingName || !form.location || !form.scheduledDate) {
      addToast('error', 'Missing Fields', 'Please fill in all required fields');
      return;
    }
    const created = await createZoomRequest(form, currentUser);
    addToast('success', 'Request Submitted', `Zoom support request for "${form.meetingName}" scheduled with ID: ${created?.id || liveMeetingId}.`);
    setShowForm(false);
    setForm({ meetingName: '', branch: currentUser?.division || 'Academic Affairs Division', location: '', meetingLevel: 'Medium', scheduledDate: '', requiredEquipment: [] });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> New Zoom Request
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard label="My Total Requests" value={myRequests.length} icon={Video} iconBg="rgba(6,182,212,0.1)" iconColor="var(--teal-500)" accentColor="var(--teal-500)" />
        <StatCard label="Confirmed" value={myRequests.filter(z=>z.status==='Confirmed').length} icon={CheckCircle} iconBg="rgba(16,185,129,0.1)" iconColor="var(--success-500)" accentColor="var(--success-500)" />
        <StatCard label="Pending" value={myRequests.filter(z=>z.status==='Pending').length} icon={Clock} iconBg="rgba(245,158,11,0.1)" iconColor="var(--warning-500)" accentColor="var(--warning-500)" />
      </div>

      {/* My Requests */}
      <div className="card">
        <div className="card-header"><span className="card-title">My Zoom Support Requests</span></div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Meeting Name</th>
                <th>Date & Time</th>
                <th>Location</th>
                <th>Level</th>
                <th>Zoom Meeting Link</th>
                <th>Equipment</th>
                <th>Status</th>
                <th>Assigned Tech</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myRequests.map(z => (
                <tr key={z.id}>
                  <td><span className="id-chip">{z.referenceNumber || z.id}</span></td>
                  <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{z.meetingName}</td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(z.scheduledDate).toLocaleString()}</td>
                  <td style={{ fontSize: '0.8rem' }}>{z.location}</td>
                  <td><Badge status={z.meetingLevel === 'Critical' ? 'High' : 'Medium'}>{z.meetingLevel}</Badge></td>
                  <td>
                    {z.meetingLink ? (
                      <a
                        href={z.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <LinkIcon size={12} /> Join Meeting
                      </a>
                    ) : (
                      <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                        <Clock size={11} /> Link Pending from IT
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {z.requiredEquipment.slice(0,2).map(e => <span key={e} className="zoom-equipment-tag">{e}</span>)}
                      {z.requiredEquipment.length > 2 && <span className="zoom-equipment-tag">+{z.requiredEquipment.length-2}</span>}
                    </div>
                  </td>
                  <td><Badge status={z.status} /></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{z.assignedTo ? 'Assigned' : 'Unassigned'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      {z.status !== 'Completed' ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleStatusChange(z, 'Completed')}
                          style={{ color: 'var(--success-700)', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16, 185, 129, 0.08)' }}
                          title="Mark completed"
                        >
                          <CheckCircle2 size={13} />
                          <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Complete</span>
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleStatusChange(z, 'Confirmed')}
                          style={{ fontSize: '0.72rem', color: 'var(--slate-500)', padding: '4px 8px' }}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zoom Request Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="New Zoom Meeting Support Request"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              <Video size={14} /> Submit Request
            </button>
          </>
        }
      >
        <div className="alert-card alert-card-info" style={{ borderRadius: 'var(--radius-md)', marginBottom: 16, padding: '12px 16px' }}>
          <Info size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="alert-title">Zoom Link Information</div>
            <div className="alert-message">
              Fill in your meeting details below. The <strong>IT Administrator</strong> will generate and upload the official Zoom meeting link for this session.
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Meeting Name / Subject <span className="required">*</span></label>
            <input className="form-input" placeholder="e.g., Higher Education Budget Review" value={form.meetingName} onChange={e => setForm(f => ({ ...f, meetingName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Meeting Level <span className="required">*</span></label>
            <select className="form-select" value={form.meetingLevel} onChange={e => setForm(f => ({ ...f, meetingLevel: e.target.value }))}>
              <option value="Medium">Medium</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Branch / Division <span className="required">*</span></label>
            <select
              className="form-select"
              value={form.branch}
              onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
            >
              {DIVISIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Scheduled Date & Time <span className="required">*</span></label>
            <input className="form-input" type="datetime-local" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
          </div>
        </div>

        {/* Live Meeting ID Preview */}
        <div style={{
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid var(--teal-300)',
          borderRadius: 'var(--radius-md)',
          padding: '9px 12px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--gray-600)', fontWeight: 600 }}>Scheduled Meeting ID:</span>
            <span className="id-chip" style={{ fontSize: '0.8rem', fontWeight: 700, padding: '2px 8px', background: 'var(--teal-600)', color: 'white' }}>
              {liveMeetingId}
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--teal-800)' }}>Format: Year-Month-Date-Branch</span>
        </div>

        <div className="form-group">
          <label className="form-label">Location / Hall / Venue <span className="required">*</span></label>
          <input className="form-input" placeholder="e.g., Main Conference Hall — 3rd Floor" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Required Equipment</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EQUIPMENT_OPTIONS.map(eq => (
              <button
                key={eq}
                type="button"
                onClick={() => toggleEquip(eq)}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
                  background: form.requiredEquipment.includes(eq) ? 'var(--teal-500)' : 'var(--gray-100)',
                  color: form.requiredEquipment.includes(eq) ? 'white' : 'var(--gray-700)',
                  border: `1.5px solid ${form.requiredEquipment.includes(eq) ? 'var(--teal-500)' : 'var(--gray-200)'}`,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {eq}
              </button>
            ))}
          </div>
        </div>
        {form.meetingLevel === 'Critical' && (
          <div className="alert-card alert-card-error" style={{ borderRadius: 'var(--radius-md)' }}>
            <div className="alert-title">⚠ Critical Meeting</div>
            <div className="alert-message">This meeting is marked Critical. IT Admin will be notified immediately for priority assignment and link generation.</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
