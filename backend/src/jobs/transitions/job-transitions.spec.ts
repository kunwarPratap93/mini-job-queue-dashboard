import { canTransition, ALLOWED_TRANSITIONS } from './job-transitions';
import { JobStatus } from '../enums/job-status.enum';

/**
 * Pure unit tests for the transition state machine.
 * No NestJS, no database, no DI — runs in milliseconds.
 */
describe('job-transitions', () => {
  // ── ALLOWED_TRANSITIONS shape ─────────────────────────────────────────────

  describe('ALLOWED_TRANSITIONS', () => {
    it('covers every JobStatus as a key', () => {
      const keys = Object.keys(ALLOWED_TRANSITIONS);
      const statuses = Object.values(JobStatus);
      expect(keys).toEqual(expect.arrayContaining(statuses));
      expect(keys).toHaveLength(statuses.length);
    });

    it('pending can only go to running', () => {
      expect(ALLOWED_TRANSITIONS[JobStatus.PENDING]).toEqual([JobStatus.RUNNING]);
    });

    it('running can go to completed or failed', () => {
      expect(ALLOWED_TRANSITIONS[JobStatus.RUNNING]).toEqual(
        expect.arrayContaining([JobStatus.COMPLETED, JobStatus.FAILED]),
      );
      expect(ALLOWED_TRANSITIONS[JobStatus.RUNNING]).toHaveLength(2);
    });

    it('completed is a terminal state (no exits)', () => {
      expect(ALLOWED_TRANSITIONS[JobStatus.COMPLETED]).toHaveLength(0);
    });

    it('failed is a terminal state (no exits)', () => {
      expect(ALLOWED_TRANSITIONS[JobStatus.FAILED]).toHaveLength(0);
    });
  });

  // ── canTransition — valid moves ───────────────────────────────────────────

  describe('canTransition — valid transitions', () => {
    it('pending → running is allowed', () => {
      expect(canTransition(JobStatus.PENDING, JobStatus.RUNNING)).toBe(true);
    });

    it('running → completed is allowed', () => {
      expect(canTransition(JobStatus.RUNNING, JobStatus.COMPLETED)).toBe(true);
    });

    it('running → failed is allowed', () => {
      expect(canTransition(JobStatus.RUNNING, JobStatus.FAILED)).toBe(true);
    });
  });

  // ── canTransition — invalid moves ─────────────────────────────────────────

  describe('canTransition — invalid transitions', () => {
    const cases: [JobStatus, JobStatus][] = [
      [JobStatus.PENDING,   JobStatus.COMPLETED],
      [JobStatus.PENDING,   JobStatus.FAILED],
      [JobStatus.PENDING,   JobStatus.PENDING],
      [JobStatus.RUNNING,   JobStatus.PENDING],
      [JobStatus.RUNNING,   JobStatus.RUNNING],
      [JobStatus.COMPLETED, JobStatus.RUNNING],
      [JobStatus.COMPLETED, JobStatus.PENDING],
      [JobStatus.COMPLETED, JobStatus.FAILED],
      [JobStatus.COMPLETED, JobStatus.COMPLETED],
      [JobStatus.FAILED,    JobStatus.RUNNING],
      [JobStatus.FAILED,    JobStatus.PENDING],
      [JobStatus.FAILED,    JobStatus.COMPLETED],
      [JobStatus.FAILED,    JobStatus.FAILED],
    ];

    test.each(cases)('%s → %s is rejected', (from, to) => {
      expect(canTransition(from, to)).toBe(false);
    });
  });
});
