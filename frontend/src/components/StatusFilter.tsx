import { JobStatus, STATUS_CONFIG } from '../types';

interface StatusFilterProps {
  activeFilter?: JobStatus;
  onFilterChange: (status?: JobStatus) => void;
}

const FILTERS: Array<{ key?: JobStatus; label: string }> = [
  { key: undefined, label: 'All Jobs' },
  { key: JobStatus.PENDING,   label: 'Pending' },
  { key: JobStatus.RUNNING,   label: 'Running' },
  { key: JobStatus.COMPLETED, label: 'Completed' },
  { key: JobStatus.FAILED,    label: 'Failed' },
];

/** Tab-style filter bar for job status */
export function StatusFilter({ activeFilter, onFilterChange }: StatusFilterProps) {
  return (
    <div className="tab-bar">
      {FILTERS.map(({ key, label }) => {
        const isActive = activeFilter === key;
        const config = key ? STATUS_CONFIG[key] : null;

        return (
          <button
            key={label}
            onClick={() => onFilterChange(key)}
            className={`tab-button ${isActive ? 'active' : ''}`}
            type="button"
          >
            {config && (
              <span
                className="tab-dot"
                style={{
                  backgroundColor: `var(--status-${key})`,
                  opacity: isActive ? 1 : 0.6,
                }}
              />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}
