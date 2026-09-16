import type { Job } from '../types';
import { JobCard } from './JobCard';

interface JobListProps {
  jobs: Job[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
}

/** Skeleton placeholder matching card shape */
function SkeletonJobCard() {
  return (
    <div className="skeleton-card">
      <div>
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-meta" />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div className="skeleton-block skeleton-badge" />
        <div className="skeleton-block skeleton-btn" />
      </div>
    </div>
  );
}

/** Job list rendered as a vertical stack of distinct cards */
export function JobList({ jobs, isLoading, isError, error, onRetry }: JobListProps) {
  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="job-stack">
        <SkeletonJobCard />
        <SkeletonJobCard />
        <SkeletonJobCard />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="error-banner">
        <div className="error-banner-left">
          <span>⚠️</span>
          <span>{error?.message ?? 'Failed to load jobs from server'}</span>
        </div>
        <button onClick={onRetry} className="error-retry-btn" type="button">
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (!jobs || jobs.length === 0) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">No jobs found</h3>
        <p className="empty-state-desc">Create your first background job using the form above.</p>
      </div>
    );
  }

  // Vertical stack of cards
  return (
    <div className="job-stack">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
