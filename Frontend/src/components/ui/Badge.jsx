import React from 'react';
import { STATUS_COLORS } from '../../data/mockData';

export function Badge({ status, children, className = '' }) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS[children] || 'badge-gray';
  return (
    <span className={`badge ${colorClass} ${className}`}>
      <span className="badge-dot" />
      {children || status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const map = { Urgent: 'badge-red', High: 'badge-red', Medium: 'badge-amber', Low: 'badge-gray' };
  return <span className={`badge ${map[priority] || 'badge-gray'}`}>{priority}</span>;
}

export function CategoryBadge({ category }) {
  const map = { Hardware: 'badge-blue', Software: 'badge-purple', Network: 'badge-teal', 'PC/Printer': 'badge-orange' };
  return <span className={`badge ${map[category] || 'badge-gray'}`}>{category}</span>;
}

export function RoleBadge({ role }) {
  const map = {
    super_admin: { cls: 'badge-dark', label: 'Super Admin' },
    it_admin: { cls: 'badge-purple', label: 'IT Admin' },
    it_officer: { cls: 'badge-rose', label: 'IT Officer' },
    trainee: { cls: 'badge-green', label: 'Trainee' },
    zoom_requester: { cls: 'badge-teal', label: 'Zoom Requester' },
  };
  const r = map[role] || { cls: 'badge-gray', label: role ? String(role).replace(/_/g, ' ') : '' };
  return <span className={`badge ${r.cls}`}>{r.label}</span>;
}
