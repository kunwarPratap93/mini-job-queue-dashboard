import apiClient from './client';
import type { Job, CreateJobPayload } from '../types';
import { JobStatus } from '../types';

// ── Fetch jobs ────────────────────────────────────────────────────────────────

/** GET /jobs or GET /jobs?status=X */
export async function fetchJobs(status?: JobStatus): Promise<Job[]> {
  const params = status ? { status } : {};
  const { data } = await apiClient.get<Job[]>('/jobs', { params });
  return data;
}

// ── Create job ────────────────────────────────────────────────────────────────

/** POST /jobs */
export async function createJob(payload: CreateJobPayload): Promise<Job> {
  const { data } = await apiClient.post<Job>('/jobs', payload);
  return data;
}

// ── Update job status ─────────────────────────────────────────────────────────

/** PATCH /jobs/:id/status */
export async function updateJobStatus(id: string, status: JobStatus): Promise<Job> {
  const { data } = await apiClient.patch<Job>(`/jobs/${id}/status`, { status });
  return data;
}

// ── Delete job ────────────────────────────────────────────────────────────────

/** DELETE /jobs/:id */
export async function deleteJob(id: string): Promise<void> {
  await apiClient.delete(`/jobs/${id}`);
}
