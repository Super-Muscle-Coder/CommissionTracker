import styles from './EmptyState.module.css'

export type EmptyStateAction = {
  label: string
  onClick: () => void
}

export type EmptyStateProps = {
  // What the user sees instead of an empty region, e.g. "nothing here yet".
  text: string
  // The next thing the user can do (§7.2, principle 6), or null for none.
  action: EmptyStateAction | null
}

// A neutral message for a region that has nothing to show. Not an error.
export function EmptyState({ text, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.text}>{text}</p>
      {action === null ? null : (
        <button type="button" className={styles.action} onClick={() => action.onClick()}>
          {action.label}
        </button>
      )}
    </div>
  )
}
