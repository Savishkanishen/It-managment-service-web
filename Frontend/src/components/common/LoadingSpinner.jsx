import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Loading...', size = 24 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', gap: '12px' }}>
      <Loader2 size={size} className="spin" color="var(--teal-500)" style={{ animation: 'spin 1s linear infinite' }} />
      {text && <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{text}</span>}
    </div>
  );
}

