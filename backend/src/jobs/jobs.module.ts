import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';

import { JobStatusHistory } from './entities/job-status-history.entity';

/**
 * JobsModule
 *
 * Wiring:
 *   TypeOrmModule.forFeature([Job, JobStatusHistory])  → registers Repositories in DI
 *   JobsService                      → consumes that repository
 *   JobsController                   → exposes HTTP routes for the jobs resource
 *
 * JobsService is exported so other modules (e.g. a future WorkersModule)
 * can inject it without re-importing the entity.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobStatusHistory]),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}

