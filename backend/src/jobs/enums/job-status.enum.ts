/**
 * Possible lifecycle states for a Job.
 * Used as a TypeORM column enum AND as the @IsEnum target in DTOs.
 */
export enum JobStatus {
  PENDING   = 'pending',
  RUNNING   = 'running',
  COMPLETED = 'completed',
  FAILED    = 'failed',
}
