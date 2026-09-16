import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateJobStatus } from '../api/jobs';
import { JobStatus } from '../types';
import type { Job } from '../types';
import toast from 'react-hot-toast';

/**
 * Mutation for updating a job's status.
 *
 * Error handling:
 * - 409 Conflict → "already updated elsewhere" toast + auto-refetch
 * - 404 Not Found → "no longer exists" toast + remove from cache
 * - Other errors → generic error toast
 */
export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) =>
      updateJobStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error: any, variables) => {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;

      if (status === 409) {
        toast.error(
          `This job was already updated elsewhere — refreshing...`,
          { duration: 4000 },
        );
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      } else if (status === 404) {
        toast.error('This job no longer exists');
        // Remove the job from all cached job lists
        queryClient.setQueriesData<Job[]>(
          { queryKey: ['jobs'] },
          (old) => old?.filter((j) => j.id !== variables.id),
        );
      } else {
        toast.error(serverMessage ?? error.message ?? 'Failed to update job status');
      }
    },
  });
}
