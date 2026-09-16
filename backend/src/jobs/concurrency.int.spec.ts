import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { JobStatusHistory } from './entities/job-status-history.entity';
import { JobsModule } from './jobs.module';
import { JobsService } from './jobs.service';
import { JobStatus } from './enums/job-status.enum';

describe('JobsService Concurrency (Integration)', () => {
  let service: JobsService;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: 'test.sqlite', // File-based DB enables connection pooling
          entities: [Job, JobStatusHistory],
          synchronize: true,
          dropSchema: true, // Reset schema on each run
        }),
        JobsModule,
      ],
    }).compile();

    service = moduleFixture.get<JobsService>(JobsService);
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('runs 20 iterations of concurrent updates gracefully without SQLITE_BUSY', async () => {
    for (let i = 0; i < 20; i++) {
      // 1. Setup a fresh job in PENDING state
      const job = await service.create({ title: `Race Condition Test ${i}`, type: 'test' });
      expect(job.status).toBe(JobStatus.PENDING);
      expect(job.version).toBe(0);

      // 2. Fire two near-simultaneous updates attempting to move it to RUNNING
      const promise1 = service.updateStatus(job.id, { status: JobStatus.RUNNING });
      const promise2 = service.updateStatus(job.id, { status: JobStatus.RUNNING });

      const results = await Promise.allSettled([promise1, promise2]);

      const fulfilled = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value.outcome);
        
      const rejected = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason.message);

      // We expect ZERO database locks/errors (SQLITE_BUSY) reaching the caller
      expect(rejected).toHaveLength(0);
      
      // Because dataSource.transaction() on SQLite serializes the callback,
      // the loser often waits for the first to commit BEFORE reading the status.
      // Therefore, its pre-flight findOneBy reads 'running', and it fails the 
      // canTransition() check, returning 'invalid_transition' rather than 'conflict'.
      // With retry loops, it may also manifest this way.
      expect(fulfilled).toHaveLength(2);
      
      const hasWinner = fulfilled.includes('updated');
      const hasLoser = fulfilled.includes('conflict') || fulfilled.includes('invalid_transition');
      
      if (!hasWinner || !hasLoser) {
        throw new Error(`Unexpected fulfilled array: ${JSON.stringify(fulfilled)}`);
      }
      
      // Verify final job state is consistent (running, version 1)
      const finalJob = await service.findOne(job.id);
      expect(finalJob!.status).toBe(JobStatus.RUNNING);
      expect(finalJob!.version).toBe(1);
    }
  });
});
