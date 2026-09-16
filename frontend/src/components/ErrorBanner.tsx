interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/** Error banner for network and server failures with red tint and action button */
export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="error-banner" role="alert">
      <div className="error-banner-left">
        <span aria-hidden="true">⚠️</span>
        <span>{message}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {onRetry && (
          <button onClick={onRetry} className="error-retry-btn" type="button">
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fca5a5',
              cursor: 'pointer',
              padding: '4px',
            }}
            type="button"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
