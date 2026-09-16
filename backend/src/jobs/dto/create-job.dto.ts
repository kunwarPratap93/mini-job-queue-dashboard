import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Payload for creating a new Job.
 *
 * Validation (enforced by the global ValidationPipe):
 *   - title  required string, max 200 characters
 *   - type   required string, max 100 characters
 *
 * Unknown properties are stripped (whitelist: true) and cause a 400
 * if sent (forbidNonWhitelisted: true).
 */
export class CreateJobDto {
  @IsString()
  @IsNotEmpty({ message: 'title must not be empty' })
  @MaxLength(200, { message: 'title must be 200 characters or fewer' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'type must not be empty' })
  @MaxLength(100, { message: 'type must be 100 characters or fewer' })
  type: string;
}
