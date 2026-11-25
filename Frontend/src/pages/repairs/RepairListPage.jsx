import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import DataTable from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import Modal from '../../components/ui/Modal';
import { Wrench, Plus, AlertTriangle, CheckCircle, Clock, ExternalLink, Filter } from 'lucide-react';

export default function RepairListPage() {
  const { repairs, vendors, assets, createRepair, closeRepair } = useData();
  const { currentUser } = useAuth();
  const { addToast } = useNotifications();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'ongoing' | 'closed'
  const [showNewModal, setShowNewModal] = useState(false);
  const [form, setForm] = useState({
    assetId: '',
    vendorId: '',
    dispatchDate: '',
    expectedReturn: '',
    gatePass: '',
    forReason: '',
    initialDiagnosis: ''
  });

  // Quick close modal state directly from list
  const [closingRepair, setClosingRepair] = useState(null);
  const [quickCloseForm, setQuickCloseForm] = useState({ whatReplaced: '', totalCost: '', notes: '' });
  const [closingSubmitting, setClosingSubmitting] = useState(false);
  const [creatingSubmitting, setCreatingSubmitting] = useState(false);

  const overdueCount = repairs.filter(r => r.status === 'Overdue').length;
  const activeCount = repairs.filter(r => r.status === 'Active').length;
  const closedCount = repairs.filter(r => r.status === 'Closed').length;

  const filteredRepairs = repairs.filter(r => {
    if (activeTab === 'ongoing') return r.status === 'Active' || r.status === 'Overdue';
    if (activeTab === 'closed') return r.status === 'Closed';
    return true;
  });

  const handleCreate = async () => {
    if (creatingSubmitting) return;
    if (!form.assetId || !form.vendorId || !form.forReason || !form.dispatchDate) {
      addToast('error', 'Missing Fields', 'Please fill required fields including Asset, Vendor, Dispatch Date, and Repair Purpose');
      return;
    }
    const asset = assets.find(a => a.id === form.assetId);
    const vendor = vendors.find(v => v.id === form.vendorId);
    setCreatingSubmitting(true);
    try {
      await createRepair({
        ...form,
        assetTag: asset?.tag,
        assetDescription: `${asset?.brand || ''} ${asset?.model || ''} — ${asset?.division || 'IT'}`.trim(),
        vendorName: vendor?.name,
        assignedTo: currentUser.id,
        whatReplaced: null,
        totalCost: null,
        invoice: null,
      }, currentUser);
      addToast('success', 'Repair Dispatched', `Asset sent to ${vendor?.name || 'vendor'}`);
      setShowNewModal(false);
      setForm({ assetId: '', vendorId: '', dispatchDate: '', expectedReturn: '', gatePass: '', forReason: '', initialDiagnosis: '' });
    } catch (err) {
      addToast('error', 'Error', 'Failed to dispatch repair');
    } finally {
      setCreatingSubmitting(false);
    }
  };

  const handleQuickClose = async () => {
    if (!quickCloseForm.whatReplaced.trim()) {
      addToast('error', 'Required Field', '"What Was Replaced" is mandatory before closing the repair');
      return;
    }
    if (!closingRepair) return;
    setClosingSubmitting(true);
    try {
      await closeRepair(closingRepair.id, quickCloseForm, currentUser);
      addToast('success', 'Repair Closed', `Repair ${closingRepair.id} closed and saved successfully`);
      setClosingRepair(null);
      setQuickCloseForm({ whatReplaced: '', totalCost: '', notes: '' });
    } catch (err) {
      addToast('error', 'Error', 'Failed to close repair job');
    } finally {
      setClosingSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'Repair ID',
      render: (v, row) => {
        const cleanId = row.referenceNumber || v;
        return (
          <Link
            to={`/repairs/${cleanId}`}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: '#253745',
              fontWeight: 700,
              fontSize: '0.8rem',
              textDecoration: 'underline',
              textUnderlineOffset: 3
            }}
          >
            {cleanId}
          </Link>
        );
      }
    },
    {
      key: 'assetTag',
      label: 'Asset',
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#06141B' }}>{v}</div>
          <div style={{ fontSize: '0.72rem', color: '#4A5C6A' }}>{row.assetDescription?.slice(0, 40)}</div>
        </div>
      )
    },
    {
      key: 'vendorName',
      label: 'Vendor',
      render: v => <span style={{ fontWeight: 500, color: '#11212D' }}>{v}</span>
    },
    {
      key: 'forReason',
      label: 'For (Reason)',
      render: v => <span style={{ fontSize: '0.8rem', color: '#4A5C6A' }}>{v ? `${v.slice(0, 45)}...` : '—'}</span>
    },
    { key: 'dispatchDate', label: 'Dispatched' },
    {
      key: 'expectedReturn',
      label: 'Expected Return',
      render: (v, row) => (
        <span style={{ color: row.status === 'Overdue' ? '#F43F5E' : 'inherit', fontWeight: row.status === 'Overdue' ? 700 : 400 }}>
          {v || '—'}
        </span>
      )
    },
    { key: 'status', label: 'Status', render: v => <Badge status={v} /> },
    {
      key: 'whatReplaced',
      label: 'What Replaced',
      render: (v, row) => (
        row.status === 'Closed' ? (
          <span style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: 600 }}>{v ? (v.length > 30 ? `${v.slice(0, 30)}...` : v) : 'Replaced'}</span>
        ) : (
          <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>Pending</span>
        )
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {row.status !== 'Closed' && (
            <button
              className="btn btn-sm"
              onClick={() => {
                setClosingRepair(row);
                setQuickCloseForm({
                  whatReplaced: row.whatReplaced || '',
                  totalCost: row.totalCost != null ? String(row.totalCost) : '',
                  notes: row.notes || '',
                });
              }}
              style={{
                background: '#10B981',
                color: '#fff',
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                border: 'none',
                cursor: 'pointer'
              }}
              title="Close Repair Job"
            >
              <CheckCircle size={12} /> Close
            </button>
          )}
          <Link
            to={`/repairs/${row.referenceNumber || row.id}`}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          >
            Details
          </Link>
        </div>
      )
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="page-header-left">
          <h1 style={{ color: '#06141B', fontSize: '1.4rem', fontWeight: 800 }}>External Repair Tracker</h1>
          <p style={{ color: '#4A5C6A' }}>Vendor repair dispatch records with fault diagnosis & hardware replacement tracking</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)} style={{ background: '#253745', borderColor: '#253745' }}>
            <Plus size={15} /> Dispatch for Repair
          </button>
        </div>
      </div>

      {overdueCount > 0 && (
        <div
          className="alert-card alert-card-error"
          style={{
            marginBottom: 20,
            borderRadius: 'var(--radius-lg)',
            padding: '14px 20px',
            background: 'rgba(244,63,94,0.08)',
            border: '1px solid rgba(244,63,94,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <AlertTriangle size={20} color="#F43F5E" />
          <div>
            <div className="alert-title" style={{ fontWeight: 700, color: '#BE123C' }}>⚠ {overdueCount} Overdue Repair{overdueCount > 1 ? 's' : ''}</div>
            <div className="alert-message" style={{ color: '#4A5C6A', fontSize: '0.85rem' }}>
              Items have exceeded their expected return date. Please follow up with the assigned vendor.
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <StatCard
          label="Active Repairs"
          value={activeCount}
          icon={Wrench}
          iconBg="rgba(245,158,11,0.1)"
          iconColor="var(--warning-500)"
          accentColor="var(--warning-500)"
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          icon={AlertTriangle}
          iconBg={overdueCount > 0 ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)'}
          iconColor={overdueCount > 0 ? '#F43F5E' : '#10B981'}
          accentColor={overdueCount > 0 ? '#F43F5E' : '#10B981'}
        />
        <StatCard
          label="Completed / Closed"
          value={closedCount}
          icon={CheckCircle}
          iconBg="rgba(16,185,129,0.1)"
          iconColor="#10B981"
          accentColor="#10B981"
        />
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: 8
        }}
      >
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '7px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: activeTab === 'all' ? '#253745' : 'transparent',
            color: activeTab === 'all' ? '#FFFFFF' : '#4A5C6A',
            transition: 'all 0.15s ease'
          }}
        >
          All Repairs ({repairs.length})
        </button>
        <button
          onClick={() => setActiveTab('ongoing')}
          style={{
            padding: '7px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: activeTab === 'ongoing' ? '#253745' : 'transparent',
            color: activeTab === 'ongoing' ? '#FFFFFF' : '#4A5C6A',
            transition: 'all 0.15s ease'
          }}
        >
          Active & Overdue ({activeCount + overdueCount})
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          style={{
            padding: '7px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: activeTab === 'closed' ? '#10B981' : 'transparent',
            color: activeTab === 'closed' ? '#FFFFFF' : '#4A5C6A',
            transition: 'all 0.15s ease'
          }}
        >
          Closed / Completed ({closedCount})
        </button>
      </div>

      {/* Table */}
      <div className="table-container" style={{ background: '#FFFFFF', borderRadius: 'var(--radius-lg)', boxShadow: '0 1px 3px rgba(6,20,27,0.06)' }}>
        <DataTable
          columns={columns}
          data={filteredRepairs}
          emptyMessage="No repair records found for this filter"
          emptyIcon="🔧"
        />
      </div>

      {/* Dispatch Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Dispatch Asset for External Repair"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowNewModal(false)} disabled={creatingSubmitting}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creatingSubmitting} style={{ background: '#253745', borderColor: '#253745' }}>
              <Wrench size={14} /> {creatingSubmitting ? 'Dispatching...' : 'Dispatch for Repair'}
            </button>
          </>
        }
      >
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>Asset <span className="required" style={{ color: '#F43F5E' }}>*</span></label>
            <select
              className="form-select"
              value={form.assetId}
              onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
            >
              <option value="">-- Select Asset --</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.tag} — {a.brand} {a.model}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>Vendor <span className="required" style={{ color: '#F43F5E' }}>*</span></label>
            <select
              className="form-select"
              value={form.vendorId}
              onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>For (Repair Purpose / Fault Reason) <span className="required" style={{ color: '#F43F5E' }}>*</span></label>
          <textarea
            className="form-textarea"
            placeholder="Describe exactly why the item is being sent for repair (e.g., motherboard failure — no POST screen)..."
            value={form.forReason}
            onChange={e => setForm(f => ({ ...f, forReason: e.target.value }))}
            rows={3}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>Initial Diagnosis</label>
          <textarea
            className="form-textarea"
            placeholder="Initial diagnosis before dispatch..."
            value={form.initialDiagnosis}
            onChange={e => setForm(f => ({ ...f, initialDiagnosis: e.target.value }))}
            rows={2}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
          />
        </div>

        <div className="form-row-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>Gate Pass / Ref No.</label>
            <input
              className="form-input"
              placeholder="GP-2026-XXX"
              value={form.gatePass}
              onChange={e => setForm(f => ({ ...f, gatePass: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>Dispatch Date <span className="required" style={{ color: '#F43F5E' }}>*</span></label>
            <input
              type="date"
              className="form-input"
              value={form.dispatchDate}
              onChange={e => setForm(f => ({ ...f, dispatchDate: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>Expected Return</label>
            <input
              type="date"
              className="form-input"
              value={form.expectedReturn}
              onChange={e => setForm(f => ({ ...f, expectedReturn: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
            />
          </div>
        </div>
      </Modal>

      {/* Quick Close Modal */}
      {closingRepair && (
        <Modal
          isOpen={true}
          onClose={() => setClosingRepair(null)}
          title={`Close Repair Job — ${closingRepair.id} (${closingRepair.assetTag})`}
          size="lg"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setClosingRepair(null)} disabled={closingSubmitting}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleQuickClose} disabled={closingSubmitting}>
                <CheckCircle size={14} /> {closingSubmitting ? 'Closing...' : 'Close & Save to Database'}
              </button>
            </>
          }
        >
          <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 600, color: '#06141B' }}>{closingRepair.assetDescription}</div>
            <div style={{ color: '#4A5C6A', marginTop: 2 }}>
              Vendor: <strong>{closingRepair.vendorName}</strong> | Dispatched: {closingRepair.dispatchDate}
            </div>
            <div style={{ color: '#4A5C6A', marginTop: 2 }}>
              Purpose: {closingRepair.forReason}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>
              What Was Replaced <span className="required" style={{ color: '#F43F5E' }}>*</span>
            </label>
            <textarea
              className="form-textarea"
              placeholder="List all hardware components replaced by the vendor (e.g., Motherboard, RAM DDR4 8GB, HDD 500GB...)"
              value={quickCloseForm.whatReplaced}
              onChange={e => setQuickCloseForm(f => ({ ...f, whatReplaced: e.target.value }))}
              rows={3}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
            />
            <div className="form-hint" style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
              Mandatory hardware replacement documentation for official ministry records.
            </div>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>Total Servicing Cost (MVR)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={quickCloseForm.totalCost}
                onChange={e => setQuickCloseForm(f => ({ ...f, totalCost: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>Invoice / Receipt Reference</label>
              <input
                type="text"
                className="form-input"
                placeholder="INV-REP-2026-XXX"
                value={quickCloseForm.invoice || ''}
                onChange={e => setQuickCloseForm(f => ({ ...f, invoice: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#06141B' }}>Closing Notes</label>
            <textarea
              className="form-textarea"
              placeholder="Additional notes about vendor service or operational testing..."
              value={quickCloseForm.notes}
              onChange={e => setQuickCloseForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #CBD5E1' }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
