import { JobStatus, STATUS_CONFIG } from '../types';

interface StatusBadgeProps {
  status: JobStatus;
}

/** Colored pill badge for job status */
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span className={`status-badge ${status}`}>
      {config.label}
    </span>
  );
}
