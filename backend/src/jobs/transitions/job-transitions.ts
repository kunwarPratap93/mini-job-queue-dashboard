import { JobStatus } from '../enums/job-status.enum';

/**
 * State-machine for Job status transitions.
 *
 * Shape: Record<fromStatus, toStatus[]>
 * Read as: "from X, you may go to Y or Z".
 *
 * Legal moves:
 *   pending  → running
 *   running  → completed
 *   running  → failed
 *
 * Everything else (e.g. completed → running, pending → completed,
 * failed → anything) is illegal and must return 409 Conflict.
 *
 * This is a pure data structure — no framework dependency — so it can be
 * imported in tests without spinning up the NestJS DI container.
 */
export const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.PENDING]:   [JobStatus.RUNNING],
  [JobStatus.RUNNING]:   [JobStatus.COMPLETED, JobStatus.FAILED],
  [JobStatus.COMPLETED]: [],
  [JobStatus.FAILED]:    [],
};

/**
 * Pure transition-validity predicate.
 *
 * @param from  The job's current status (read from the DB).
 * @param to    The desired new status (from the request body).
 * @returns     true if the transition is allowed by the state machine.
 *
 * @example
 *   canTransition('pending', 'running')   // true
 *   canTransition('running', 'pending')   // false
 *   canTransition('completed', 'running') // false
 */
export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
