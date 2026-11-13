import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

const TYPE_CONFIG = {
  error: { className: 'alert-card alert-card-error', icon: AlertCircle, color: 'var(--danger-500)' },
  success: { className: 'alert-card alert-card-success', icon: CheckCircle2, color: 'var(--success-500)' },
  warning: { className: 'alert-card alert-card-warning', icon: AlertTriangle, color: 'var(--warning-500)' },
  info: { className: 'alert-card alert-card-info', icon: Info, color: '#3b82f6' },
};

export default function AlertBanner({ type = 'info', message, title, style }) {
  if (!message && !title) return null;
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const IconComponent = config.icon;

  return (
    <div className={config.className} style={{ marginBottom: '16px', borderRadius: 'var(--radius-md)', ...style }}>
      <IconComponent size={18} color={config.color} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div>
        {title && <div className="alert-title">{title}</div>}
        {message && <div className="alert-message">{message}</div>}
      </div>
    </div>
  );
}

