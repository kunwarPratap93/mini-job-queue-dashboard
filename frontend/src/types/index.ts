/* ──────────────────────────────────────────────
   Shared TypeScript types used across the app
   ────────────────────────────────────────────── */

/** Response shape from GET /health */
export interface HealthResponse {
  status: 'ok' | 'error';
}

/** Generic API error shape returned by the backend */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

/** Job status enum — mirrors backend JobStatus */
export enum JobStatus {
  PENDING   = 'pending',
  RUNNING   = 'running',
  COMPLETED = 'completed',
  FAILED    = 'failed',
}

/** Job entity — mirrors backend Job entity */
export interface Job {
  id: string;
  title: string;
  type: string;
  status: JobStatus;
  createdAt: string;
  version: number;
}

/** Payload for POST /jobs */
export interface CreateJobPayload {
  title: string;
  type: string;
}

/**
 * Client-side transition map — mirrors backend ALLOWED_TRANSITIONS.
 * Used for UX only (deciding which action buttons to render).
 * The backend is the source of truth for enforcement.
 */
export const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.PENDING]:   [JobStatus.RUNNING],
  [JobStatus.RUNNING]:   [JobStatus.COMPLETED, JobStatus.FAILED],
  [JobStatus.COMPLETED]: [],
  [JobStatus.FAILED]:    [],
};

/** Human-readable labels for transition actions */
export const TRANSITION_LABELS: Record<JobStatus, string> = {
  [JobStatus.PENDING]:   'Pending',
  [JobStatus.RUNNING]:   'Start',
  [JobStatus.COMPLETED]: 'Complete',
  [JobStatus.FAILED]:    'Fail',
};

/** Status display config for badges and counts */
export const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bgColor: string }> = {
  [JobStatus.PENDING]:   { label: 'Pending',   color: 'text-status-pending',   bgColor: 'bg-status-pending-bg' },
  [JobStatus.RUNNING]:   { label: 'Running',   color: 'text-status-running',   bgColor: 'bg-status-running-bg' },
  [JobStatus.COMPLETED]: { label: 'Completed', color: 'text-status-completed', bgColor: 'bg-status-completed-bg' },
  [JobStatus.FAILED]:    { label: 'Failed',    color: 'text-status-failed',    bgColor: 'bg-status-failed-bg' },
};
