import styles from './SuccessNotice.module.css'

export type SuccessNoticeProps = {
  // The confirmation for the user, saying what was done (e.g. "Saved.").
  text: string
}

// Confirms that an action succeeded. Announced politely as a status. Not
// shown by colour alone: the text itself says what succeeded, and the panel
// has a success border.
export function SuccessNotice({ text }: SuccessNoticeProps) {
  return (
    <p className={styles.notice} role="status">
      {text}
    </p>
  )
}
