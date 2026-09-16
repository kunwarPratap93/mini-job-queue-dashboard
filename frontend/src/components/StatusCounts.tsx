import { JobStatus, STATUS_CONFIG } from '../types';
import type { Job } from '../types';

interface StatusCountsProps {
  jobs: Job[];
}

/** Summary bar showing 4 distinct cards in a horizontal row */
export function StatusCounts({ jobs }: StatusCountsProps) {
  const counts = Object.values(JobStatus).reduce(
    (acc, status) => {
      acc[status] = jobs.filter((j) => j.status === status).length;
      return acc;
    },
    {} as Record<JobStatus, number>,
  );

  return (
    <div className="status-counts-row">
      {Object.values(JobStatus).map((status) => {
        const config = STATUS_CONFIG[status];
        return (
          <div key={status} className={`count-card ${status}`}>
            <div className="count-number">{counts[status]}</div>
            <div className="count-label">{config.label}</div>
          </div>
        );
      })}
    </div>
  );
}
