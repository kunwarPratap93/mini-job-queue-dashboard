import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../api/health';
import type { HealthResponse } from '../types';

/**
 * TanStack Query hook that fetches the backend health status.
 *
 * Stale time: 30 s (inherited from QueryClient defaults)
 * Refetch interval: 30 s (keeps the badge live)
 */
export function useHealth() {
  return useQuery<HealthResponse, Error>({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });
}
