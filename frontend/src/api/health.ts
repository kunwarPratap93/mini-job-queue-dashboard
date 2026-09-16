import apiClient from './client';
import type { HealthResponse } from '../types';

/**
 * Fetches the backend health status.
 * GET /api/health  (proxied → GET /health on the NestJS server)
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>('/health');
  return data;
}
