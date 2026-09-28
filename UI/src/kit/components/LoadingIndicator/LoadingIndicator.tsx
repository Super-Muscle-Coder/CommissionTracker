import styles from './LoadingIndicator.module.css'

export type LoadingIndicatorProps = {
  // What is being loaded, e.g. "Loading…".
  label: string
}

// Tells the user something is loading. Announced politely as a status.
export function LoadingIndicator({ label }: LoadingIndicatorProps) {
  return (
    <p className={styles.loading} role="status" aria-live="polite">
      {label}
    </p>
  )
}
