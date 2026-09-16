import React from 'react';
import type { HealthResponse } from '../types';

interface HealthBadgeProps {
  data?: HealthResponse;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Renders a coloured badge reflecting the backend health status.
 */
export function HealthBadge({ data, isLoading, isError, error }: HealthBadgeProps) {
  if (isLoading) {
    return (
      <div style={styles.badge('#6B7280')}>
        ⏳ Checking backend…
      </div>
    );
  }

  if (isError) {
    return (
      <div style={styles.badge('#EF4444')}>
        ❌ Backend unreachable — {error?.message}
      </div>
    );
  }

  const isOk = data?.status === 'ok';

  return (
    <div style={styles.badge(isOk ? '#10B981' : '#F59E0B')}>
      {isOk ? '✅' : '⚠️'} Status: <strong>{data?.status}</strong>
    </div>
  );
}

// ── Inline styles (no CSS-in-JS dependency needed for a hello-world) ──────────
const styles = {
  badge: (bg: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '0.6rem 1.4rem',
    borderRadius: '9999px',
    background: bg,
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 500,
    letterSpacing: '0.02em',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    transition: 'background 0.3s ease',
  }),
};
