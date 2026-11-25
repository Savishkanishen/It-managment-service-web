import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Badge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { ArrowLeft, Wrench, CheckCircle, Clock, AlertTriangle, FileText, DollarSign, Calendar, Building, Hash } from 'lucide-react';

export default function RepairDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { repairs, closeRepair } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();

  const [closeModal, setCloseModal] = useState(false);
  const [closeForm, setCloseForm] = useState({ whatReplaced: '', totalCost: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [remoteRepair, setRemoteRepair] = useState(null);
  const [loadingRemote, setLoadingRemote] = useState(false);

  // Look in local state first (matches by Year-Month-Date-Number id, referenceNumber, or DB UUID)
  const repair = repairs.find(r => r.id === id || r.referenceNumber === id || r.dbId === id || r.uuid === id);

  // Fallback direct API fetch if not found in state on direct load
  useEffect(() => {
    if (!repair && id) {
      setLoadingRemote(true);
      fetch(`http://localhost:5000/api/repairs/${id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setRemoteRepair(data);
        })
        .catch(err => console.warn('Could not fetch repair detail:', err))
        .finally(() => setLoadingRemote(false));
    }
  }, [repair, id]);

  const activeRepair = repair || remoteRepair;

  if (loadingRemote) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#4A5C6A' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Loading repair job details...</div>
      </div>
    );
  }

  if (!activeRepair) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#06141B', marginBottom: 8 }}>Repair record not found</div>
        <p style={{ color: '#4A5C6A', marginBottom: 20 }}>No external repair record matched ID "{id}".</p>
        <Link to="/repairs" className="btn btn-primary btn-sm">
          <ArrowLeft size={14} /> Back to Repairs List
        </Link>
      </div>
    );
  }

  const isOverdue = activeRepair.status === 'Overdue';
  const isClosed = activeRepair.status === 'Closed';

  const handleClose = async () => {
    if (!closeForm.whatReplaced.trim()) {
      addToast('error', 'Required Field', '"What Was Replaced" is mandatory before closing the repair');
      return;
    }
    setSubmitting(true);
    try {
      const targetId = activeRepair.id || id;
      await closeRepair(targetId, closeForm, currentUser);
      addToast('success', 'Repair Closed', 'Repair job has been closed and saved in the database');
      setCloseModal(false);
      if (remoteRepair) {
        setRemoteRepair(prev => ({
          ...prev,
          ...closeForm,
          totalCost: closeForm.totalCost ? parseFloat(closeForm.totalCost) : null,
          status: 'Closed',
          actualReturnDate: new Date().toISOString().split('T')[0]
        }));
      }
    } catch (err) {
      addToast('error', 'Error', 'Failed to close repair job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link to="/repairs" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, color: '#4A5C6A' }}>
          <ArrowLeft size={15} /> Back to Repairs
        </Link>
      </div>

      {/* Header Banner */}
      <div
        className="detail-header"
        style={{
          borderLeft: isClosed
            ? '4px solid #10B981'
            : isOverdue
            ? '4px solid #F43F5E'
            : '4px solid #253745',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 1px 3px rgba(6,20,27,0.08)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          className="detail-icon"
          style={{
            background: isClosed
              ? 'rgba(16,185,129,0.12)'
              : isOverdue
              ? 'rgba(244,63,94,0.12)'
              : 'rgba(37,55,69,0.1)',
            padding: 14,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isClosed ? (
            <CheckCircle size={30} color="#10B981" />
          ) : (
            <Wrench size={30} color={isOverdue ? '#F43F5E' : '#253745'} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div className="detail-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#06141B' }}>
            {activeRepair.assetDescription}
          </div>
          <div className="detail-meta" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <span className="id-chip" style={{ fontFamily: 'JetBrains Mono, monospace', background: '#F1F5F9', padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', color: '#11212D', fontWeight: 600 }}>
              {activeRepair.referenceNumber || activeRepair.id}
            </span>
            <span className="id-chip" style={{ fontFamily: 'JetBrains Mono, monospace', background: '#E2E8F0', padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', color: '#253745', fontWeight: 600 }}>
              {activeRepair.assetTag}
            </span>
            <Badge status={activeRepair.status} />
          </div>
        </div>

        {!isClosed && (
          <div className="detail-actions">
            <button
              className="btn btn-success"
              onClick={() => {
                setCloseForm({
                  whatReplaced: activeRepair.whatReplaced || '',
                  totalCost: activeRepair.totalCost != null ? String(activeRepair.totalCost) : '',
                  notes: activeRepair.notes || '',
                });
                setCloseModal(true);
              }}
              style={{ fontWeight: 600 }}
            >
              <CheckCircle size={15} /> Close Repair Job
            </button>
          </div>
        )}
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <div
          className="alert-card alert-card-error"
          style={{
            marginBottom: 20,
            borderRadius: 'var(--radius-lg)',
            padding: '14px 20px',
            background: 'rgba(244,63,94,0.08)',
            border: '1px solid rgba(244,63,94,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <AlertTriangle size={22} color="#F43F5E" />
          <div>
            <div className="alert-title" style={{ fontWeight: 700, color: '#BE123C' }}>⚠ This repair is OVERDUE</div>
            <div className="alert-message" style={{ color: '#4A5C6A', fontSize: '0.85rem' }}>
              Expected return was <strong>{activeRepair.expectedReturn}</strong>. Please contact {activeRepair.vendorName} immediately.
            </div>
          </div>
        </div>
      )}

      {/* Closed Confirmation Card */}
      {isClosed && (
        <div
          style={{
            marginBottom: 20,
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <CheckCircle size={24} color="#10B981" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#065F46', fontSize: '0.95rem' }}>Repair Job Completed & Closed</div>
            <div style={{ color: '#4A5C6A', fontSize: '0.82rem', marginTop: 2 }}>
              Hardware servicing is finished. Asset has been restored to active operational status in the database.
              {activeRepair.actualReturnDate && ` (Returned: ${activeRepair.actualReturnDate})`}
            </div>
          </div>
          <span style={{ background: '#10B981', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
            Closed
          </span>
        </div>
      )}

      {/* Details Grid */}
      <div className="card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Dispatch Info */}
        <div className="card" style={{ background: '#FFFFFF', borderRadius: 'var(--radius-lg)', border: '1px solid #E2E8F0', padding: 20 }}>
          <div className="card-header" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 12, marginBottom: 16 }}>
            <span className="card-title" style={{ fontWeight: 700, color: '#06141B', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building size={16} color="#4A5C6A" /> Dispatch Information
            </span>
          </div>
          <div className="card-body">
            <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="info-item">
                <div className="info-label" style={{ fontSize: '0.75rem', color: '#4A5C6A', fontWeight: 600 }}>Vendor</div>
                <div className="info-value" style={{ fontWeight: 700, color: '#06141B' }}>{activeRepair.vendorName}</div>
              </div>
              <div className="info-item">
                <div className="info-label" style={{ fontSize: '0.75rem', color: '#4A5C6A', fontWeight: 600 }}>Gate Pass / Ref</div>
                <div className="info-value" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#253745', fontWeight: 600 }}>
                  {activeRepair.gatePass || activeRepair.referenceNumber}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label" style={{ fontSize: '0.75rem', color: '#4A5C6A', fontWeight: 600 }}>Dispatch Date</div>
                <div className="info-value" style={{ color: '#06141B' }}>{activeRepair.dispatchDate || '—'}</div>
              </div>
              <div className="info-item">
                <div className="info-label" style={{ fontSize: '0.75rem', color: '#4A5C6A', fontWeight: 600 }}>Expected Return</div>
                <div className="info-value" style={{ color: isOverdue ? '#F43F5E' : '#06141B', fontWeight: isOverdue ? 700 : 500 }}>
                  {activeRepair.expectedReturn || '—'}
                </div>
              </div>
            </div>

            {activeRepair.initialDiagnosis && (
              <div style={{ marginTop: 16, borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
                <div className="info-label" style={{ fontSize: '0.75rem', color: '#4A5C6A', fontWeight: 600 }}>Initial Diagnosis</div>
                <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginTop: 4, color: '#11212D' }}>
                  {activeRepair.initialDiagnosis}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fault & Replacement Details */}
        <div className="card" style={{ background: '#FFFFFF', borderRadius: 'var(--radius-lg)', border: '1px solid #E2E8F0', padding: 20 }}>
          <div className="card-header" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 12, marginBottom: 16 }}>
            <span className="card-title" style={{ fontWeight: 700, color: '#06141B', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} color="#4A5C6A" /> Fault & Replacement Details
            </span>
          </div>
          <div className="card-body">
            <div className="form-group" style={{ marginBottom: 14 }}>
              <div className="info-label" style={{ fontSize: '0.75rem', color: '#4A5C6A', fontWeight: 600 }}>For (Repair Reason)</div>
              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginTop: 4, color: '#06141B', lineHeight: 1.6 }}>
                {activeRepair.forReason || activeRepair.issueDescription}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <div className="info-label" style={{ fontSize: '0.75rem', color: '#4A5C6A', fontWeight: 600 }}>What Replaced</div>
              <div
                style={{
                  background: activeRepair.whatReplaced ? 'rgba(16,185,129,0.08)' : '#F8FAFC',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  marginTop: 4,
                  color: activeRepair.whatReplaced ? '#065F46' : '#94A3B8',
                  fontWeight: activeRepair.whatReplaced ? 600 : 400,
                  lineHeight: 1.6,
                  border: activeRepair.whatReplaced ? '1px solid rgba(16,185,129,0.2)' : 'none',
                }}
              >
                {activeRepair.whatReplaced || 'Not yet recorded — fill in when closing the repair job'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
              <div className="info-item">
                <div className="info-label" style={{ fontSize: '0.75rem', color: '#4A5C6A', fontWeight: 600 }}>Total Cost</div>
                <div className="info-value" style={{ fontWeight: 700, fontSize: '1.05rem', color: '#06141B' }}>
                  {activeRepair.totalCost != null ? `MVR ${Number(activeRepair.totalCost).toFixed(2)}` : 'Not recorded'}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label" style={{ fontSize: '0.75rem', color: '#4A5C6A', fontWeight: 600 }}>Invoice / Ref</div>
                <div className="info-value" style={{ fontSize: '0.85rem', color: '#253745', fontFamily: 'JetBrains Mono, monospace' }}>
                  {activeRepair.invoice || 'None uploaded'}
                </div>
              </div>
            </div>

            {activeRepair.notes && (
              <div style={{ marginTop: 14, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                <div className="info-label" style={{ fontSize: '0.75rem', color: '#4A5C6A', fontWeight: 600 }}>Closing Notes</div>
                <div style={{ fontSize: '0.85rem', color: '#4A5C6A', marginTop: 4, fontStyle: 'italic' }}>
                  {activeRepair.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Close Repair Modal */}
      <Modal
        isOpen={closeModal}
        onClose={() => setCloseModal(false)}
        title="Close Repair Job"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCloseModal(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-success" onClick={handleClose} disabled={submitting}>
              <CheckCircle size={14} /> {submitting ? 'Closing...' : 'Close & Save to Database'}
            </button>
          </>
        }
      >
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>
            What Was Replaced <span className="required" style={{ color: '#F43F5E' }}>*</span>
          </label>
          <textarea
            className="form-textarea"
            placeholder="List all hardware components replaced by the vendor (e.g., Motherboard, RAM DDR4 8GB, HDD 500GB, Power Supply...)"
            value={closeForm.whatReplaced}
            onChange={e => setCloseForm(f => ({ ...f, whatReplaced: e.target.value }))}
            rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
          />
          <div className="form-hint" style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
            Mandatory hardware replacement documentation for official ministry asset maintenance records.
          </div>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>Total Servicing Cost (MVR)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="0.00"
              value={closeForm.totalCost}
              onChange={e => setCloseForm(f => ({ ...f, totalCost: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>Invoice / Receipt Reference</label>
            <input
              type="text"
              className="form-input"
              placeholder="INV-REP-2026-XXX"
              value={closeForm.invoice || ''}
              onChange={e => setCloseForm(f => ({ ...f, invoice: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>Closing & Verification Notes</label>
          <textarea
            className="form-textarea"
            placeholder="Additional notes about vendor service, testing verification, or return condition..."
            value={closeForm.notes}
            onChange={e => setCloseForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
          />
        </div>
      </Modal>
    </div>
  );
}
