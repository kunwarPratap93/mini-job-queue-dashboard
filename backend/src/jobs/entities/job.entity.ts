import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobStatus } from '../enums/job-status.enum';

/**
 * Represents an asynchronous job tracked in the system.
 *
 * Columns
 * ─────────────────────────────────────────────────────────────────────────────
 * id         UUID, auto-generated primary key
 * title      Human-readable job name (max 200 chars, enforced by DTO)
 * type       Job category / type slug (max 100 chars, enforced by DTO)
 * status     Lifecycle state — one of JobStatus enum values
 * createdAt  Timestamp set once on INSERT
 * version    Plain integer counter incremented manually inside atomic
 *            UPDATE … WHERE id = ? AND status = ? queries.
 *            NOT managed by TypeORM's @VersionColumn / save() mechanism —
 *            this column is only written by explicit QueryBuilder updates
 *            so that concurrency control is purely status-conditional, not
 *            version-conditional.
 */
@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({
    type: 'varchar',
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @CreateDateColumn()
  createdAt: Date;

  /**
   * Manual version counter.
   *
   * Incremented via `SET version = version + 1` inside the atomic
   * QueryBuilder UPDATE. TypeORM's save() will NOT touch this column
   * automatically — it is purely application-managed.
   */
  @Column({ type: 'int', default: 0 })
  version: number;
}
