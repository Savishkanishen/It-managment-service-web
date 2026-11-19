import React from 'react';

export default function StatCard({ label, value, icon: Icon, iconBg, iconColor, accentColor, sub, subIcon: SubIcon, subColor }) {
  return (
    <div className="stat-card" style={{ '--stat-accent': accentColor || 'var(--sherwood-tan)' }}>
      <div className="stat-icon" style={{ background: iconBg || 'var(--sherwood-tan-wash)' }}>
        {Icon && <Icon size={20} color={iconColor || 'var(--af-655)'} />}
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && (
          <div className="stat-sub" style={{ color: subColor || 'var(--af-655-muted)' }}>
            {SubIcon && <SubIcon size={12} />}
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
