import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useHealth } from './hooks/useHealth';
import { useJobs, useAllJobs } from './hooks/useJobs';
import { StatusCounts } from './components/StatusCounts';
import { StatusFilter } from './components/StatusFilter';
import { CreateJobForm } from './components/CreateJobForm';
import { JobList } from './components/JobList';
import { ErrorBanner } from './components/ErrorBanner';
import type { JobStatus } from './types';

function App() {
  const [statusFilter, setStatusFilter] = useState<JobStatus | undefined>(undefined);

  const health = useHealth();
  const allJobs = useAllJobs();
  const filteredJobs = useJobs(statusFilter);

  // Use the filtered query when a filter is active, otherwise the "all" query
  const activeQuery = statusFilter ? filteredJobs : allJobs;

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#151e2e',
            color: '#f8fafc',
            border: '1px solid #243044',
            fontSize: '0.875rem',
            borderRadius: '8px',
          },
        }}
      />

      <div className="dashboard-container">
        {/* ── Header Bar ─────────────────────────────────────────── */}
        <header className="dashboard-header">
          <div className="dashboard-title-group">
            <h1>🚀 Job Dashboard</h1>
            <p className="dashboard-subtitle">Manage, dispatch, and track asynchronous background jobs</p>
          </div>

          {/* Health status pill */}
          <div className="health-pill" title="Backend connectivity status">
            <span
              className={`health-dot ${
                health.isLoading ? 'connecting' : health.isError ? 'error' : 'ok'
              }`}
            />
            <span>
              {health.isLoading
                ? 'Connecting…'
                : health.isError
                ? 'Backend offline'
                : 'Backend connected'}
            </span>
          </div>
        </header>

        {/* ── 4 Status Summary Cards ─────────────────────────────── */}
        <section>
          <StatusCounts jobs={allJobs.data ?? []} />
        </section>

        {/* ── Create New Job Panel ───────────────────────────────── */}
        <section>
          <CreateJobForm />
        </section>

        {/* ── Horizontal Status Filter Tabs ───────────────────────── */}
        <section>
          <StatusFilter
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
          />
        </section>

        {/* ── Error Banner (if query failed) ─────────────────────── */}
        {activeQuery.isError && (
          <ErrorBanner
            message={activeQuery.error?.message ?? 'Failed to load jobs from server'}
            onRetry={() => activeQuery.refetch()}
          />
        )}

        {/* ── Vertical Stack of Job Cards ────────────────────────── */}
        <section>
          <JobList
            jobs={activeQuery.data}
            isLoading={activeQuery.isLoading}
            isError={activeQuery.isError}
            error={activeQuery.error}
            onRetry={() => activeQuery.refetch()}
          />
        </section>
      </div>
    </>
  );
}

export default App;
