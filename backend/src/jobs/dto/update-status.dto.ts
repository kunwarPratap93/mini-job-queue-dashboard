import { IsEnum } from 'class-validator';
import { JobStatus } from '../enums/job-status.enum';

/**
 * Payload for updating the status of an existing Job.
 *
 * Validation:
 *   - status  must be one of: 'pending' | 'running' | 'completed' | 'failed'
 *
 * @IsEnum gives a clear "status must be a valid enum value" message
 * and automatically rejects anything outside the allowed set.
 */
export class UpdateStatusDto {
  @IsEnum(JobStatus, {
    message: `status must be one of: ${Object.values(JobStatus).join(', ')}`,
  })
  status: JobStatus;
}
