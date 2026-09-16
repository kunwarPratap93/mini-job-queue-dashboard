import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JobStatus } from './enums/job-status.enum';
import { Job } from './entities/job.entity';

/**
 * JobsController
 *
 * Owns HTTP concerns only — status codes, headers, request parsing.
 * All business logic (transition rules, atomic writes) lives in JobsService.
 *
 * Routes
 * ──────
 *   POST   /jobs              Create a job
 *   GET    /jobs              List all jobs (optional ?status= filter)
 *   PATCH  /jobs/:id/status   Transition a job's status
 *   DELETE /jobs/:id          Delete a job
 */
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ── POST /jobs ─────────────────────────────────────────────────────────────

  /**
   * Create a new job.
   * The global ValidationPipe validates CreateJobDto before this runs.
   * Returns 201 Created with the persisted Job entity.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createJobDto: CreateJobDto): Promise<Job> {
    return this.jobsService.create(createJobDto);
  }

  // ── GET /jobs ──────────────────────────────────────────────────────────────

  /**
   * List all jobs, or filter by status via ?status=<value>.
   *
   * The global ValidationPipe transforms the raw query-string value into a
   * JobStatus enum thanks to `transform: true` on the pipe.
   * An invalid ?status= value is caught by @IsEnum in the query DTO.
   *
   * We keep it simple here: accept a raw optional string and validate it
   * manually so the query param stays independent of a separate DTO class.
   */
  @Get()
  async findAll(@Query('status') status?: string): Promise<Job[]> {
    if (status !== undefined) {
      const validValues = Object.values(JobStatus) as string[];
      if (!validValues.includes(status)) {
        throw new BadRequestException(
          `status must be one of: ${validValues.join(', ')}`,
        );
      }
      return this.jobsService.findAll(status as JobStatus);
    }
    return this.jobsService.findAll();
  }

  // ── PATCH /jobs/:id/status ─────────────────────────────────────────────────

  /**
   * Transition a job's status.
   *
   * Validation layers:
   *   1. ParseUUIDPipe  — :id must be a valid UUID v4 (400 otherwise)
   *   2. ValidationPipe — UpdateStatusDto.status must be a valid enum value (400)
   *   3. JobsService    — transition must be legal per the state machine (409)
   *   4. JobsService    — job must exist (404)
   *
   * Returns the updated Job on success (200).
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ): Promise<Job> {
    const result = await this.jobsService.updateStatus(id, updateStatusDto);

    switch (result.outcome) {
      case 'updated':
        return result.job;

      case 'not_found':
        throw new NotFoundException(`Job ${id} not found`);

      case 'invalid_transition':
        throw new ConflictException(
          `Cannot transition job from '${result.from}' to '${result.to}'`,
        );

      case 'conflict':
        throw new ConflictException(
          `Job ${id} was concurrently updated — current status is '${result.currentStatus}'`,
        );
    }
  }

  // ── DELETE /jobs/:id ───────────────────────────────────────────────────────

  /**
   * Delete a job by UUID.
   * Returns 204 No Content on success, 404 if not found.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    const deleted = await this.jobsService.remove(id);
    if (!deleted) {
      throw new NotFoundException(`Job ${id} not found`);
    }
  }

  // ── GET /jobs/:id/history ──────────────────────────────────────────────────

  /**
   * Get the status transition history for a job.
   */
  @Get(':id/history')
  async getHistory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const job = await this.jobsService.findOne(id);
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }
    return this.jobsService.getHistory(id);
  }
}
