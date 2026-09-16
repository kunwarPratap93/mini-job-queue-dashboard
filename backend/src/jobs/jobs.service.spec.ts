import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JobsService, TransitionResult } from './jobs.service';
import { Job } from './entities/job.entity';
import { JobStatusHistory } from './entities/job-status-history.entity';
import { JobStatus } from './enums/job-status.enum';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateJobDto } from './dto/create-job.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a minimal Job-like object with sensible defaults. */
function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    title: 'Test Job',
    type: 'test',
    status: JobStatus.PENDING,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    version: 0,
    ...overrides,
  } as Job;
}

/** Build an UpdateStatusDto for the given target status. */
function dto(status: JobStatus): UpdateStatusDto {
  const d = new UpdateStatusDto();
  d.status = status;
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock factories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a self-contained mock QueryRunner whose `manager.findOneBy` and
 * `manager.createQueryBuilder().execute()` can be configured per test.
 *
 * @param executeResult  What the UPDATE's execute() call should resolve with.
 */
function makeMockQueryRunner(executeResult: { affected: number }) {
  const qb = {
    update:  jest.fn().mockReturnThis(),
    set:     jest.fn().mockReturnThis(),
    where:   jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(executeResult),
  };

  const manager = {
    findOneBy:          jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
  };

  const queryRunner = {
    connect:             jest.fn().mockResolvedValue(undefined),
    startTransaction:    jest.fn().mockResolvedValue(undefined),
    commitTransaction:   jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release:             jest.fn().mockResolvedValue(undefined),
    manager,
  };

  return { queryRunner, manager, qb };
}

// Minimal Repository mock (only methods used by plain CRUD).
const mockRepo = {
  create:    jest.fn(),
  save:      jest.fn(),
  find:      jest.fn(),
  findOneBy: jest.fn(),
          insert: jest.fn(),
  delete:    jest.fn(),
};

// DataSource mock
const mockDataSource = {
  transaction: jest.fn(),
};

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getRepositoryToken(Job), useValue: mockRepo },
        { provide: getRepositoryToken(JobStatusHistory), useValue: { find: jest.fn(), insert: jest.fn() } },
          { provide: DataSource,              useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('saves and returns the new job', async () => {
      const createDto: CreateJobDto = { title: 'My Job', type: 'batch' };
      const job = makeJob({ title: 'My Job', type: 'batch' });
      mockRepo.create.mockReturnValue(job);
      mockRepo.save.mockResolvedValue(job);

      const result = await service.create(createDto);

      expect(mockRepo.create).toHaveBeenCalledWith(createDto);
      expect(mockRepo.save).toHaveBeenCalledWith(job);
      expect(result).toBe(job);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all jobs newest-first when no status filter is given', async () => {
      const jobs = [makeJob(), makeJob({ id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb' })];
      mockRepo.find.mockResolvedValue(jobs);

      const result = await service.findAll();

      expect(mockRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
      expect(result).toHaveLength(2);
    });

    it('filters by status oldest-first when status is provided', async () => {
      const pending = [makeJob()];
      mockRepo.find.mockResolvedValue(pending);

      const result = await service.findAll(JobStatus.PENDING);

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { status: JobStatus.PENDING },
        order: { createdAt: 'ASC' },
      });
      expect(result).toBe(pending);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('returns true when a row is deleted', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 });
      await expect(service.remove('some-id')).resolves.toBe(true);
    });

    it('returns false when no row matched', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove('missing-id')).resolves.toBe(false);
    });
  });

  // ── updateStatus ───────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    const JOB_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

    /**
     * Mocks the transaction callback to execute with a tailored mock manager.
     * We pass in the affected rows for the UPDATE execution.
     */
    function setupTransaction(affected: number) {
      const qb = {
        update:  jest.fn().mockReturnThis(),
        set:     jest.fn().mockReturnThis(),
        where:   jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected }),
      };

      const manager = {
        findOneBy: jest.fn(),
          insert: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      };

      // When dataSource.transaction is called, immediately invoke the callback
      mockDataSource.transaction.mockImplementationOnce((cb: any) => cb(manager));
      return { manager, qb };
    }

    // ── not_found ─────────────────────────────────────────────────────────────

    describe('job not found', () => {
      it('returns not_found when the job does not exist', async () => {
        const { manager } = setupTransaction(0);
        manager.findOneBy.mockResolvedValue(null); // pre-flight SELECT → nothing

        const result = await service.updateStatus(JOB_ID, dto(JobStatus.RUNNING));

        expect(result.outcome).toBe('not_found');
      });
    });

    // ── invalid_transition ────────────────────────────────────────────────────

    describe('invalid transitions', () => {
      const illegalMoves: [JobStatus, JobStatus][] = [
        [JobStatus.PENDING,   JobStatus.COMPLETED],
        [JobStatus.PENDING,   JobStatus.FAILED],
        [JobStatus.COMPLETED, JobStatus.RUNNING],
        [JobStatus.FAILED,    JobStatus.RUNNING],
        [JobStatus.FAILED,    JobStatus.COMPLETED],
      ];

      test.each(illegalMoves)(
        '%s → %s returns invalid_transition without touching the DB',
        async (currentStatus, newStatus) => {
          const { manager } = setupTransaction(0);
          manager.findOneBy.mockResolvedValue(makeJob({ status: currentStatus }));

          const result = await service.updateStatus(JOB_ID, dto(newStatus));

          expect(result.outcome).toBe('invalid_transition');
          if (result.outcome === 'invalid_transition') {
            expect(result.from).toBe(currentStatus);
            expect(result.to).toBe(newStatus);
          }
          // No UPDATE should have run
          expect(manager.createQueryBuilder).not.toHaveBeenCalled();
        },
      );
    });

    // ── valid transitions ─────────────────────────────────────────────────────

    describe('valid transitions', () => {
      const legalMoves: [JobStatus, JobStatus][] = [
        [JobStatus.PENDING, JobStatus.RUNNING],
        [JobStatus.RUNNING, JobStatus.COMPLETED],
        [JobStatus.RUNNING, JobStatus.FAILED],
      ];

      test.each(legalMoves)(
        '%s → %s returns updated job',
        async (currentStatus, newStatus) => {
          const before  = makeJob({ status: currentStatus });
          const after   = makeJob({ status: newStatus, version: 1 });

          const { manager } = setupTransaction(1); // UPDATE wins
          manager.findOneBy
            .mockResolvedValueOnce(before)  // step 1: pre-flight read
            .mockResolvedValueOnce(after);  // step 3: re-fetch after update

          const result = await service.updateStatus(JOB_ID, dto(newStatus));

          expect(result.outcome).toBe('updated');
          if (result.outcome === 'updated') {
            expect(result.job.status).toBe(newStatus);
            expect(result.job.version).toBe(1);
          }
        },
      );
    });

    // ── concurrent race ───────────────────────────────────────────────────────

    describe('concurrent race condition', () => {
      it('simulated race: exactly one request succeeds and the other gets 409 conflict', async () => {
        const pendingJob = makeJob({ status: JobStatus.PENDING });
        const runningJob = makeJob({ status: JobStatus.RUNNING, version: 1 });

        // ── Request 1 (winner): UPDATE matches → affected=1 ──────────────────
        const { manager: mgr1 } = setupTransaction(1);
        mgr1.findOneBy
          .mockResolvedValueOnce(pendingJob)  // pre-flight read
          .mockResolvedValueOnce(runningJob); // re-fetch after update

        // ── Request 2 (loser): UPDATE misses → affected=0 ────────────────────
        const { manager: mgr2 } = setupTransaction(0);
        mgr2.findOneBy
          .mockResolvedValueOnce(pendingJob)  // pre-flight read (stale)
          .mockResolvedValueOnce(runningJob); // cold-path read (current state)

        // Fire both "simultaneously".
        const [result1, result2] = await Promise.all([
          service.updateStatus(JOB_ID, dto(JobStatus.RUNNING)),
          service.updateStatus(JOB_ID, dto(JobStatus.RUNNING)),
        ]);

        // Winner
        expect(result1.outcome).toBe('updated');
        if (result1.outcome === 'updated') {
          expect(result1.job.status).toBe(JobStatus.RUNNING);
        }

        // Loser
        expect(result2.outcome).toBe('conflict');
        if (result2.outcome === 'conflict') {
          expect(result2.currentStatus).toBe(JobStatus.RUNNING);
        }

        expect(mockDataSource.transaction).toHaveBeenCalledTimes(2);
      });

      it('returns not_found if the job is deleted between the SELECT and UPDATE', async () => {
        const pendingJob = makeJob({ status: JobStatus.PENDING });

        const { manager } = setupTransaction(0); // UPDATE misses
        manager.findOneBy
          .mockResolvedValueOnce(pendingJob) // pre-flight read → job exists
          .mockResolvedValueOnce(null);      // cold-path read → job deleted

        const result = await service.updateStatus(JOB_ID, dto(JobStatus.RUNNING));

        expect(result.outcome).toBe('not_found');
      });
      
      it('rethrows on unexpected DB errors', async () => {
        const { manager } = setupTransaction(0);
        const dbError = new Error('SQLITE_LOCKED');
        manager.findOneBy.mockRejectedValue(dbError);

        await expect(
          service.updateStatus(JOB_ID, dto(JobStatus.RUNNING)),
        ).rejects.toThrow('SQLITE_LOCKED');
      });
    });
  });
});
