import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Job } from './job.entity';

@Entity('job_status_history')
export class JobStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ name: 'from_status' })
  fromStatus: string;

  @Column({ name: 'to_status' })
  toStatus: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;
}
