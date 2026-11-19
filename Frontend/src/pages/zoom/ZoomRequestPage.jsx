import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ROLES } from '../../data/mockData';
import { ArrowLeft, Video, Info, Sparkles, Link as LinkIcon, CheckCircle } from 'lucide-react';

const EQUIPMENT_OPTIONS = ['Projector','HDMI Cable','VGA Cable','Laptop','Webcam','Microphone','Screen','Extension Cord','Pointer','Podium'];

export default function ZoomRequestPage() {
  const { createZoomRequest } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const isPrivileged = [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_OFFICER].includes(currentUser?.role);

  const [form, setForm] = useState({
    meetingName: '',
    location: '',
    meetingLevel: 'Medium',
    scheduledDate: '',
    meetingLink: '',
    requiredEquipment: []
  });

  const toggleEquip = (eq) => setForm(f => ({ ...f, requiredEquipment: f.requiredEquipment.includes(eq) ? f.requiredEquipment.filter(e=>e!==eq) : [...f.requiredEquipment, eq] }));

  const generateInstantLink = () => {
    const meetingId = Math.floor(1000000000 + Math.random() * 9000000000);
    const pwd = Math.random().toString(36).slice(2, 10);
    const generatedUrl = `https://zoom.us/j/${meetingId}?pwd=${pwd}`;
    setForm(f => ({ ...f, meetingLink: generatedUrl }));
    addToast('success', 'Zoom Link Generated', 'Official Zoom meeting URL auto-generated.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.meetingName || !form.location || !form.scheduledDate) {
      addToast('error', 'Missing Fields', 'Please fill required fields');
      return;
    }

    const payload = {
      ...form,
      status: form.meetingLink ? 'Confirmed' : 'Pending',
    };

    createZoomRequest(payload, currentUser);
    addToast(
      'success',
      form.meetingLink ? 'Meeting Created & Confirmed' : 'Request Submitted',
      form.meetingLink
        ? `Zoom meeting "${form.meetingName}" created with official link.`
        : `Zoom support request for "${form.meetingName}" submitted. IT Admin will provide the meeting link.`
    );
    navigate('/zoom');
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link to="/zoom" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }}><ArrowLeft size={15} /> Back to Meetings</Link>
      </div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isPrivileged ? 'Schedule Official Zoom Meeting' : 'New Zoom Meeting Support Request'}</h1>
          <p>{isPrivileged ? 'Provision Zoom meeting sessions, links, and technical support directly' : 'Submit meeting details and requirements for IT Administration support'}</p>
        </div>
      </div>
      <div style={{ maxWidth: 680 }}>
        <form onSubmit={handleSubmit}>
          {isPrivileged ? (
            <div className="alert-card alert-card-success" style={{ borderRadius: 'var(--radius-lg)', marginBottom: 20, padding: '14px 18px' }}>
              <CheckCircle size={20} color="var(--success-500)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="alert-title">Administrator & Officer Zoom Provisioning</div>
                <div className="alert-message">
                  As an <strong>{currentUser?.role === ROLES.IT_OFFICER ? 'IT Officer' : 'IT Administrator'}</strong>, you have direct authorization to generate and schedule Zoom meetings instantly.
                </div>
              </div>
            </div>
          ) : (
            <div className="alert-card alert-card-info" style={{ borderRadius: 'var(--radius-lg)', marginBottom: 20, padding: '14px 18px' }}>
              <Info size={20} color="var(--teal-500)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="alert-title">Zoom Meeting Link Provision</div>
                <div className="alert-message">
                  You can submit your meeting requirements below. The <strong>IT Administrator</strong> or <strong>IT Officer</strong> will generate and upload the official Zoom meeting link for you.
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><span className="card-title">Meeting Details</span></div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Meeting Name / Subject <span className="required">*</span></label>
                  <input className="form-input" placeholder="e.g., Budget Review 2027" value={form.meetingName} onChange={e=>setForm(f=>({...f,meetingName:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Meeting Level <span className="required">*</span></label>
                  <select className="form-select" value={form.meetingLevel} onChange={e=>setForm(f=>({...f,meetingLevel:e.target.value}))}>
                    <option value="Medium">Medium Priority</option>
                    <option value="Critical">Critical — Executive / High Priority</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Location / Hall / Venue <span className="required">*</span></label>
                  <input className="form-input" placeholder="e.g., Main Conference Hall — 3rd Floor" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Scheduled Date & Time <span className="required">*</span></label>
                  <input type="datetime-local" className="form-input" value={form.scheduledDate} onChange={e=>setForm(f=>({...f,scheduledDate:e.target.value}))} required />
                </div>
              </div>

              {/* Instant Meeting Link (Available to Privileged Users or optional for Requesters) */}
              <div className="form-group" style={{ marginTop: 8, marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Official Zoom Meeting Link {isPrivileged ? '(Instant Link)' : '(Optional)'}
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={generateInstantLink}
                    style={{ fontSize: '0.74rem', color: 'var(--teal-600)', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Sparkles size={13} /> ⚡ Auto-Generate Zoom URL
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <LinkIcon size={15} color="var(--gray-400)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="url"
                    className="form-input"
                    style={{ paddingLeft: '36px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                    placeholder="https://zoom.us/j/9876543210?pwd=..."
                    value={form.meetingLink}
                    onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))}
                  />
                </div>
                <div className="form-hint" style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 4 }}>
                  {form.meetingLink ? '✓ Meeting link provided. This session will be automatically marked Confirmed.' : 'Leave blank if you want IT Administration to provision the link later.'}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><span className="card-title">Required Equipment & AV Support</span></div>
            <div className="card-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {EQUIPMENT_OPTIONS.map(eq => {
                  const isSelected = form.requiredEquipment.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => toggleEquip(eq)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        background: isSelected ? 'var(--slate-700)' : 'var(--surface-white)',
                        color: isSelected ? '#FFFFFF' : 'var(--slate-950)',
                        border: `1.5px solid ${isSelected ? 'var(--slate-700)' : 'var(--slate-300)'}`,
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {eq}
                    </button>
                  );
                })}
              </div>
              {form.requiredEquipment.length > 0 && (
                <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--slate-700)', fontWeight: 600 }}>Selected: {form.requiredEquipment.join(', ')}</div>
              )}
            </div>
          </div>

          {form.meetingLevel === 'Critical' && (
            <div className="alert-card alert-card-error" style={{ borderRadius:'var(--radius-lg)', marginBottom:20, padding:'14px 18px' }}>
              <div><div className="alert-title">⚠ Critical Meeting Priority</div><div className="alert-message">IT Admin and assigned technical staff will provide on-site standby support and priority connection monitoring.</div></div>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', gap:12 }}>
            <Link to="/zoom" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Video size={15} /> {isPrivileged && form.meetingLink ? 'Schedule & Confirm Zoom Meeting' : 'Submit Zoom Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
