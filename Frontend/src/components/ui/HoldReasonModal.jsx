import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { PauseCircle } from 'lucide-react';

export default function HoldReasonModal({ isOpen, onClose, onSubmit, taskTitle = '' }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!reason.trim()) return;
    onSubmit(reason.trim());
    setReason('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Task On Hold"
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-warning"
            onClick={handleSubmit}
            disabled={!reason.trim()}
          >
            <PauseCircle size={14} /> Place On Hold
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="alert-card alert-card-warning" style={{ marginBottom: 16, borderRadius: 'var(--radius-md)' }}>
          <div>
            <div className="alert-title">{taskTitle ? `Task: ${taskTitle}` : 'Put Task On Hold'}</div>
            <div className="alert-message">Please provide a reason why this task is being placed on hold.</div>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">
            Hold Reason <span className="required">*</span>
          </label>
          <textarea
            className="form-textarea"
            placeholder="Describe reason for hold (e.g. Waiting for vendor hardware delivery, pending approval...)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            autoFocus
          />
        </div>
      </form>
    </Modal>
  );
}
