import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteJob } from '../api/jobs';
import type { Job } from '../types';
import toast from 'react-hot-toast';

/**
 * Mutation for deleting a job.
 *
 * Error handling:
 * - 404 Not Found → "no longer exists" toast + remove from cache
 * - Other errors → generic error toast
 */
export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job deleted');
    },
    onError: (error: any, id) => {
      const status = error?.response?.status;

      if (status === 404) {
        toast.error('This job no longer exists');
        queryClient.setQueriesData<Job[]>(
          { queryKey: ['jobs'] },
          (old) => old?.filter((j) => j.id !== id),
        );
      } else {
        const message = error?.response?.data?.message ?? error.message ?? 'Failed to delete job';
        toast.error(Array.isArray(message) ? message.join(', ') : message);
      }
    },
  });
}
