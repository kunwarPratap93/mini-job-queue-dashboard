import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createJob } from '../api/jobs';
import type { CreateJobPayload } from '../types';
import toast from 'react-hot-toast';

/**
 * Mutation for creating a new job.
 * On success: invalidates the jobs cache so the list refreshes.
 * On error: shows a toast. Field-level errors are returned via the mutation
 * state so the form can display them inline.
 */
export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateJobPayload) => createJob(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job created successfully');
    },
    onError: (error: any) => {
      // Don't toast 400 validation errors — they'll be shown inline in the form
      const status = error?.response?.status;
      if (status !== 400) {
        const message = error?.response?.data?.message ?? error.message ?? 'Failed to create job';
        toast.error(Array.isArray(message) ? message.join(', ') : message);
      }
    },
  });
}
