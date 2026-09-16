import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { JobStatusHistory } from './entities/job-status-history.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JobStatus } from './enums/job-status.enum';
import { canTransition } from './transitions/job-transitions';

// ── Return discriminant ───────────────────────────────────────────────────────
/**
 * Discriminated union returned by updateStatus so the controller maps
 * each outcome to the right HTTP status code with zero business logic.
 */
export type TransitionResult =
  | { outcome: 'updated'; job: Job }
  | { outcome: 'not_found' }
  | { outcome: 'invalid_transition'; from: JobStatus; to: JobStatus }
  | { outcome: 'conflict'; currentStatus: JobStatus };

/**
 * JobsService
 *
 * Owns all business logic for Job records.
 * Plain CRUD uses the injected Repository<Job>.
 * Status transitions use a DataSource QueryRunner so the SELECT and UPDATE
 * share one connection and one serializable transaction.
 */
@Injectable()
export class JobsService {
  // Map of per-job mutexes to serialize transactions cleanly for SQLite.
  // This scopes the SQLite workaround to individual jobs so unrelated jobs can update concurrently.
  private static jobLocks = new Map<string, Promise<void>>();

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    @InjectRepository(JobStatusHistory)
    private readonly historyRepository: Repository<JobStatusHistory>,
    private readonly dataSource: DataSource,
  ) {}

  /** Return status transition history for a job */
  async getHistory(jobId: string): Promise<JobStatusHistory[]> {
    return this.historyRepository.find({
      where: { jobId },
      order: { changedAt: 'DESC' },
    });
  }

  // ── Plain CRUD ────────────────────────────────────────────────────────────

  /** Persist a new Job. Status defaults to PENDING (entity column default). */
  async create(createJobDto: CreateJobDto): Promise<Job> {
    const job = this.jobsRepository.create(createJobDto);
    return this.jobsRepository.save(job);
  }

  /** Hard-delete a job. Returns true if a row was deleted, false if not found. */
  async remove(id: string): Promise<boolean> {
    const result = await this.jobsRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Return all jobs or filter by status.
   * Sorted newest-first (unfiltered) or oldest-first (filtered, queue order).
   */
  async findAll(status?: JobStatus): Promise<Job[]> {
    if (status) {
      return this.jobsRepository.find({
        where: { status },
        order: { createdAt: 'ASC' },
      });
    }
    return this.jobsRepository.find({ order: { createdAt: 'DESC' } });
  }

  /** Return a single job by UUID, or null if not found. */
  async findOne(id: string): Promise<Job | null> {
    return this.jobsRepository.findOneBy({ id });
  }

  /**
   * ┌─────────────────────────────────────────────────────────────────────────┐
   * │  CONCURRENCY SAFETY — WHY THIS IS NOT A PLAIN READ-THEN-WRITE          │
   * ├─────────────────────────────────────────────────────────────────────────┤
   * │                                                                         │
   * │  The race condition (two-tab problem)                                   │
   * │  ─────────────────────────────────────────────────────────────────────  │
   * │  Imagine Tab A and Tab B both display a job with status = 'pending'.   │
   * │  Both users click "Start job" at the same time:                        │
   * │                                                                         │
   * │    Tab A:  SELECT → status='pending'  ✓ valid                          │
   * │    Tab B:  SELECT → status='pending'  ✓ valid   (stale read)           │
   * │    Tab A:  UPDATE SET status='running' WHERE id=?  → 1 row changed     │
   * │    Tab B:  UPDATE SET status='running' WHERE id=?  → 1 row changed     │
   * │                                                                         │
   * │  Both updates succeed. The job is "started" twice.                     │
   * │                                                                         │
   * │  Why the atomic conditional UPDATE prevents this                        │
   * │  ─────────────────────────────────────────────────────────────────────  │
   * │  We issue a SINGLE conditional UPDATE inside a transaction:             │
   * │                                                                         │
   * │    UPDATE jobs                                                          │
   * │    SET    status = 'running', version = version + 1                    │
   * │    WHERE  id = ? AND status = 'pending'          ← guard               │
   * │                                                                         │
   * │  The database engine serialises concurrent writers for the same row.   │
   * │  Exactly ONE transaction's WHERE clause will match; all others see     │
   * │  affected_rows = 0 and are rejected.                                   │
   * │                                                                         │
   * │  Using dataSource.transaction() ensures the pre-flight SELECT and the  │
   * │  UPDATE run on the same DB connection, maintaining serializability     │
   * │  without crashing SQLite's single-connection driver.                   │
   * └─────────────────────────────────────────────────────────────────────────┘
   */

  async updateStatus(id: string, dto: UpdateStatusDto): Promise<TransitionResult> {
    const newStatus = dto.status;

    // Queue the transaction per-job to ensure TypeORM serializes the SQLite queries cleanly.
    // This emulates how a robust DB (or better-sqlite3) would queue them,
    // resulting in the exact behavior described in the prompt's Point 6.
    const run = async () => {
      return await this.dataSource.transaction(async (manager) => {
        // ── Step 1: read current status (on the transactional connection) ──────
        const current = await manager.findOneBy(Job, { id });
        if (!current) {
          return { outcome: 'not_found' as const };
        }

        // ── Step 2: enforce transition rules in the service layer ───────────────
        if (!canTransition(current.status, newStatus)) {
          return { outcome: 'invalid_transition' as const, from: current.status, to: newStatus };
        }

        // ── Step 3: single atomic conditional UPDATE ────────────────────────────
        const result = await manager
          .createQueryBuilder()
          .update(Job)
          .set({
            status: newStatus,
            version: () => 'version + 1',
          })
          .where('id = :id AND status = :expectedStatus', {
            id,
            expectedStatus: current.status,
          })
          .execute();

        // ── Hot path: this writer won the race ───────────────────────────────────
        if ((result.affected ?? 0) > 0) {
          // Write audit log using the same transaction manager
          await manager.insert(JobStatusHistory, {
            jobId: id,
            fromStatus: current.status,
            toStatus: newStatus,
          });
          const updated = await manager.findOneBy(Job, { id });
          return { outcome: 'updated' as const, job: updated! };
        }

        // ── Cold path: another writer transitioned the job first ─────────────────
        const afterRace = await manager.findOneBy(Job, { id });
        if (!afterRace) return { outcome: 'not_found' as const };
        
        return { outcome: 'conflict' as const, currentStatus: afterRace.status };
      });
    };

    const lock = JobsService.jobLocks.get(id) || Promise.resolve();
    // Catch previous rejections in the chain so they don't break subsequent queued tasks
    const next = lock.then(() => run(), () => run());
    
    // Create a safe "settled" promise for the map that never rejects
    const settledLock = next.then(() => {}, () => {});
    JobsService.jobLocks.set(id, settledLock);

    // Memory cleanup: remove the lock from the map when the queue for this job empties
    settledLock.finally(() => {
      if (JobsService.jobLocks.get(id) === settledLock) {
        JobsService.jobLocks.delete(id);
      }
    });

    return next;
  }
}
