# Job Management Dashboard

A full-stack monorepo application for managing background job states with robust optimistic concurrency control.


[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://mini-job-queue-dashboard-frontend-dun.vercel.app/)

## Overview & Tech Stack

This project implements a robust job state machine and management dashboard. It ensures that concurrent modifications to job statuses are handled safely without data corruption or invalid state transitions.

**Backend**:
- [NestJS](https://nestjs.com/) (Node.js framework)
- [TypeORM](https://typeorm.io/) with dual database support: **SQLite** (local development) and **PostgreSQL** (production deployment)
- TypeScript, Class-Validator, Jest (testing), Docker

**Frontend**:
- [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- [TanStack Query v5](https://tanstack.com/query/latest) (Server state management)
- [Tailwind CSS v4](https://tailwindcss.com/) (Styling)
- Axios, React Hot Toast, Lucide React

---

## Local Development Setup

### 1. Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment variables:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   # or
   npm run start:dev
   ```
   *(The backend runs on http://localhost:3000. SQLite will automatically create `database.sqlite` on startup.)*

### 2. Frontend

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment variables:
   ```bash
   cp .env.example .env
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *(The frontend runs on http://localhost:5173 and proxies `/api` requests to the backend.)*

---

## API Documentation

The backend exposes a REST API at `/jobs`.

### `POST /jobs`
Creates a new job.
- **Request Body:**
  ```json
  {
    "title": "Process batch 1",
    "type": "payment"
  }
  ```
- **Responses:**
  - `201 Created`: Returns the created job entity (defaults to `pending` status, `version: 0`).
  - `400 Bad Request`: Validation failed (e.g., title missing or >200 chars, type missing or >100 chars).

### `GET /jobs`
Lists all jobs, optionally filtered by status.
- **Query Params:** `?status=pending|running|completed|failed` (optional)
- **Responses:**
  - `200 OK`: Returns an array of job entities, ordered by newest first (or oldest first if filtered by status).

### `PATCH /jobs/:id/status`
Transitions a job to a new status. Enforces state machine rules and concurrency.
- **Request Body:**
  ```json
  {
    "status": "running"
  }
  ```
- **Responses:**
  - `200 OK`: Transition successful, returns updated job with incremented version.
  - `400 Bad Request`: Invalid status string.
  - `404 Not Found`: Job does not exist.
  - `409 Conflict`: Invalid state transition (e.g., `completed` → `running`), or the job was concurrently updated by another client (race condition).

### `DELETE /jobs/:id`
Deletes a job.
- **Responses:**
  - `204 No Content`: Successfully deleted.
  - `404 Not Found`: Job does not exist.

### `GET /jobs/:id/history` (Audit Log)
Returns the state transition history of a job.
- **Responses:**
  - `200 OK`: Array of transition records (`id`, `jobId`, `fromStatus`, `toStatus`, `changedAt`).
  - `404 Not Found`: Job does not exist.

---

## Concurrency Design & State Management

### The "Two-Tab" Race Condition
Consider a scenario where two users open the dashboard simultaneously. Both see a job as `pending`. User A clicks "Start", and at nearly the same millisecond, User B clicks "Start". Without concurrency control, both requests might read `status = 'pending'` from the database, both consider the transition legal, and both overwrite the record to `running`. This leads to duplicate job dispatching and corrupted metrics.

### Server-Side Enforcement (Zero Trust Client)
The frontend UI assists the user by only rendering buttons for legal *next* transitions (`pending` &rarr; `Start`, `running` &rarr; `Complete` / `Fail`). However, **the client is never trusted as a source of truth**. Direct API calls from cURL, Postman, or rogue scripts that bypass the UI receive the exact same validation rules:
- Attempting `pending` &rarr; `completed` returns `409 Conflict`: `"Cannot transition job from 'pending' to 'completed'"`.
- Attempting invalid payloads returns `400 Bad Request` with field-level constraint errors.

### Atomic Conditional Updates
To prevent double transitions, the service uses an **Optimistic Concurrency Control (OCC)** strategy utilizing atomic database-level constraints:
1. Reads the current record within a database transaction: `current = manager.findOneBy(...)`.
2. Validates the transition using the pure state machine function `canTransition(current.status, newStatus)`.
3. Executes a single atomic SQL `UPDATE`:
   ```sql
   UPDATE jobs
   SET status = :newStatus, version = version + 1
   WHERE id = :id AND status = :expectedStatus
   ```
4. If `affected rows === 1`: The current request won the race. It appends a row to `job_status_history` and commits.
5. If `affected rows === 0`: Another transaction modified the status between the read and the update. The service immediately detects the conflict and returns `409 Conflict`.

### PostgreSQL vs. SQLite Concurrency & In-Process Mutex
- **SQLite (Development)**: SQLite has a database-wide file lock with a single writer. Concurrent transactions within a single process can trigger `SQLITE_BUSY` or `SQLITE_ERROR: cannot start a transaction within a transaction`. To handle this cleanly in local dev/tests, `JobsService` maintains a per-job memory lock (`Map<string, Promise<void>>`). The lock wraps the entire `dataSource.transaction()` sequence, ensuring sequential processing per job while allowing different jobs to update concurrently.
- **PostgreSQL (Production)**: PostgreSQL has multi-version concurrency control (MVCC) and true concurrent row-level locking. The atomic `UPDATE ... WHERE id = :id AND status = :expectedStatus` is natively thread-safe and cluster-safe across multiple instances.
- **Mutex Portability Decision**: We retain the per-job mutex in the code across both drivers. Under PostgreSQL, the mutex adds negligible microsecond in-memory queuing per job ID while ensuring 100% code portability and zero runtime discrepancies between local development (SQLite) and production (PostgreSQL).

---

## Production Deployment Guide

Free-tier serverless and container hosts (Render, Railway, Fly.io) use ephemeral containers without persistent disks. SQLite files are wiped on redeployment or restart. Therefore, **production must use PostgreSQL via the `DATABASE_URL` environment variable**.

### Step 1: Deploy PostgreSQL & Backend to Render

#### A. Create a PostgreSQL Database on Render
1. Log into your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** &rarr; **PostgreSQL**.
3. Fill in the database settings:
   - **Name**: `jobs-db`
   - **Database**: `jobs_db`
   - **User**: `postgres`
   - **Region**: Select the region closest to you (e.g., Oregon, Frankfurt).
   - **Plan**: Select **Free**.
4. Click **Create Database**.
5. Once provisioned, scroll down to **Connections** and copy the **Internal Database URL** (if deploying backend on Render) or **External Database URL** (works everywhere).

#### B. Deploy Backend Web Service
1. In Render Dashboard, click **New +** &rarr; **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `arith-backend`
   - **Root Directory**: `backend` *(important!)*
   - **Environment**: `Node` (or `Docker` using the included Dockerfile)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Select **Free**.
4. Click **Advanced** &rarr; **Add Environment Variable** and configure:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production mode |
   | `PORT` | `3000` | Port to bind to (Render sets this automatically) |
   | `DATABASE_URL` | `<Your Render Postgres Database URL>` | Paste the URL from Step A |
   | `DATABASE_SSL` | `true` | Enables SSL required by cloud Postgres |
   | `CORS_ORIGIN` | `https://your-frontend-app.vercel.app` | Your Vercel frontend URL (or `*` temporarily) |
5. Click **Create Web Service**.
6. Wait for the build and deployment to finish. Render will display your backend URL (e.g. `https://arith-backend.onrender.com`). Verify by visiting `https://arith-backend.onrender.com/health` in your browser &rarr; should return `{"status":"ok"}`.

---

### Step 2: Deploy Frontend to Vercel

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** &rarr; **Project**.
3. Import your Git repository.
4. Configure the project:
   - **Framework Preset**: `Vite` (auto-detected)
   - **Root Directory**: Click **Edit** and select `frontend` *(important!)*
   - **Build Command**: `npm run build` (or leave default)
   - **Output Directory**: `dist` (or leave default)
5. Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://arith-backend.onrender.com` | Point to your deployed Render backend URL (no trailing slash) |
6. Click **Deploy**.
7. Once deployed, copy your assigned Vercel domain (e.g. `https://your-frontend-app.vercel.app`).

---

### Step 3: Connect Frontend URL to Backend CORS

1. Go back to your [Render Dashboard](https://dashboard.render.com/) &rarr; select `arith-backend`.
2. Navigate to **Environment**.
3. Update `CORS_ORIGIN`:
   - Set value to `https://your-frontend-app.vercel.app`.
4. Click **Save Changes**. Render will automatically redeploy the backend with the new CORS configuration.
5. Open your Vercel URL in your browser — your full Job Management Dashboard is live, backed by cloud PostgreSQL with real-time health checks, job creation, status updates, and audit logging!

---

## Assumptions & Trade-offs

1. **Database:** SQLite is used locally for simplicity; PostgreSQL is supported via `DATABASE_URL` for production durability.
2. **Schema Management:** `synchronize: true` is used for demonstration and quick review. In an enterprise production lifecycle, migration scripts (`typeorm migration:run`) should replace synchronization.
3. **Authentication/Authorization:** Out of scope for this challenge. In production, JWT bearer tokens and RBAC would guard mutations.
4. **Pagination:** Endpoints currently return the full active set. Cursor-based pagination is recommended for datasets with >10,000 jobs.

---

## Future Improvements

1. **PostgreSQL Row-level Locking (`SELECT ... FOR UPDATE`)**: Alternative to OCC for long-running transactions.
2. **WebSockets / Server-Sent Events (SSE)**: Push instant state updates to all active browser tabs without polling.
3. **Cursor Pagination**: Efficient pagination on `GET /jobs` for high job volume.
4. **Distributed Job Queue**: Integrate BullMQ or RabbitMQ to actually execute the jobs asynchronously.
