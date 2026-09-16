import { useQuery } from '@tanstack/react-query';
import { fetchJobs } from '../api/jobs';
import type { JobStatus } from '../types';

export { useCreateJob } from './useCreateJob';
export { useUpdateJobStatus } from './useUpdateJobStatus';
export { useDeleteJob } from './useDeleteJob';

/**
 * Fetch jobs with an optional status filter.
 * Query key includes the filter so TanStack Query caches them separately.
 */
export function useJobs(statusFilter?: JobStatus) {
  return useQuery({
    queryKey: ['jobs', statusFilter ?? 'all'],
    queryFn: () => fetchJobs(statusFilter),
    staleTime: 5_000,
  });
}

/**
 * Always fetches the full unfiltered job list.
 * Used to compute status counts client-side regardless of the active filter.
 */
export function useAllJobs() {
  return useQuery({
    queryKey: ['jobs', 'all'],
    queryFn: () => fetchJobs(),
    staleTime: 5_000,
  });
}
