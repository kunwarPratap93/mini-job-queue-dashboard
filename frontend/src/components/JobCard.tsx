import { useState } from 'react';
import type { Job } from '../types';
import { JobStatus, ALLOWED_TRANSITIONS, TRANSITION_LABELS } from '../types';
import { StatusBadge } from './StatusBadge';
import { ConfirmDialog } from './ConfirmDialog';
import { useUpdateJobStatus } from '../hooks/useUpdateJobStatus';
import { useDeleteJob } from '../hooks/useDeleteJob';

interface JobCardProps {
  job: Job;
}

/** Formats ISO timestamp into readable relative or concise format */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/** Card for a single job in the vertical stack */
export function JobCard({ job }: JobCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const updateStatus = useUpdateJobStatus();
  const deleteJob = useDeleteJob();

  const nextStatuses = ALLOWED_TRANSITIONS[job.status] || [];

  function getActionButtonClass(targetStatus: JobStatus): string {
    switch (targetStatus) {
      case JobStatus.RUNNING:
        return 'btn-action-start';
      case JobStatus.COMPLETED:
        return 'btn-action-complete';
      case JobStatus.FAILED:
        return 'btn-action-fail';
      default:
        return 'btn-secondary';
    }
  }

  return (
    <>
      <div className="job-card">
        {/* Left column: Title, Type pill, Timestamp, ID */}
        <div className="job-info-left">
          <div className="job-title-row">
            <h3 className="job-title">{job.title}</h3>
            <StatusBadge status={job.status} />
          </div>

          <div className="job-meta-row">
            <span className="job-type-pill">{job.type}</span>
            <span>•</span>
            <span>Created {formatTime(job.createdAt)}</span>
            <span>•</span>
            <span className="job-id-dim" title={`Full UUID: ${job.id}`}>
              id: {job.id.slice(0, 8)}…
            </span>
          </div>
        </div>

        {/* Right column: Action buttons aligned to right */}
        <div className="job-actions-group">
          {nextStatuses.map((nextStatus) => (
            <button
              key={nextStatus}
              onClick={() => updateStatus.mutate({ id: job.id, status: nextStatus })}
              disabled={updateStatus.isPending}
              className={getActionButtonClass(nextStatus)}
              type="button"
            >
              {updateStatus.isPending ? '…' : TRANSITION_LABELS[nextStatus]}
            </button>
          ))}

          <button
            onClick={() => setConfirmDelete(true)}
            disabled={deleteJob.isPending}
            className="btn-action-delete"
            title="Delete job"
            type="button"
          >
            {deleteJob.isPending ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Centered modal overlay confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Job"
        message={`Are you sure you want to permanently delete "${job.title}"? This action cannot be undone.`}
        confirmLabel="Confirm Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteJob.mutate(job.id);
        }}
      />
    </>
  );
}
