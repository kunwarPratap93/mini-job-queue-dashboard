import axios from 'axios';

/**
 * Shared Axios instance.
 * In development the Vite proxy rewrites /api/* → http://localhost:3000/*
 * so we never hardcode the backend URL in frontend code.
 */
const baseURL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const apiClient = axios.create({
  baseURL,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor (e.g. attach auth tokens later) ──────────────────────
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// ── Response interceptor (normalise errors) ───────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Preserve the original Axios error with its response data intact
    // so mutation onError callbacks can inspect status codes and field errors.
    return Promise.reject(error);
  },
);

export default apiClient;
