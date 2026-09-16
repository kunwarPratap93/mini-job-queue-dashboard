import { useState } from 'react';
import { useCreateJob } from '../hooks/useCreateJob';

const TITLE_MAX = 200;
const TYPE_MAX = 100;

interface FieldErrors {
  title?: string;
  type?: string;
}

/** Create job form panel with client-side validation and clear styling */
export function CreateJobForm() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const createJob = useCreateJob();

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!title.trim()) errors.title = 'Title is required';
    else if (title.length > TITLE_MAX) errors.title = `Title must be at most ${TITLE_MAX} characters`;
    if (!type.trim()) errors.type = 'Type is required';
    else if (type.length > TYPE_MAX) errors.type = `Type must be at most ${TYPE_MAX} characters`;
    return errors;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    createJob.mutate(
      { title: title.trim(), type: type.trim() },
      {
        onSuccess: () => {
          setTitle('');
          setType('');
          setFieldErrors({});
        },
        onError: (error: any) => {
          const status = error?.response?.status;
          const messages: string[] = error?.response?.data?.message ?? [];
          if (status === 400 && Array.isArray(messages)) {
            const errors: FieldErrors = {};
            for (const msg of messages) {
              const lower = msg.toLowerCase();
              if (lower.includes('title')) errors.title = msg;
              else if (lower.includes('type')) errors.type = msg;
            }
            setFieldErrors(errors);
          }
        },
      },
    );
  }

  return (
    <div className="form-card">
      <h2 className="form-title">Create New Job</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Title input field */}
          <div className="form-field">
            <label htmlFor="job-title" className="form-label">
              <span>Job Title</span>
              <span className="char-limit">{title.length}/{TITLE_MAX}</span>
            </label>
            <input
              id="job-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Process payment batch #491"
              maxLength={TITLE_MAX}
              className={`form-input ${fieldErrors.title ? 'has-error' : ''}`}
            />
            {fieldErrors.title && (
              <span className="field-error">{fieldErrors.title}</span>
            )}
          </div>

          {/* Type input field */}
          <div className="form-field">
            <label htmlFor="job-type" className="form-label">
              <span>Job Type</span>
              <span className="char-limit">{type.length}/{TYPE_MAX}</span>
            </label>
            <input
              id="job-type"
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. billing-sync"
              maxLength={TYPE_MAX}
              className={`form-input ${fieldErrors.type ? 'has-error' : ''}`}
            />
            {fieldErrors.type && (
              <span className="field-error">{fieldErrors.type}</span>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={createJob.isPending}
            className="btn-primary"
          >
            {createJob.isPending ? 'Creating…' : '+ Create Job'}
          </button>
        </div>
      </form>
    </div>
  );
}
