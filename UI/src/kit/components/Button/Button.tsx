import styles from './Button.module.css'

export type ButtonProps = {
  // Text of the button; also its accessible name.
  label: string
  // Text while the action it started is still running.
  busyLabel: string
  // The action is running: the button shows busyLabel and cannot be pressed.
  busy: boolean
  disabled: boolean
  // 'primary': the main action of a page (the accent colour; one per page).
  // 'secondary': every other action.
  variant: 'primary' | 'secondary'
  onClick: () => void
}

// A native button. Not pressable while busy or disabled, so an action cannot
// be started twice.
export function Button({ label, busyLabel, busy, disabled, variant, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      className={variant === 'primary' ? styles.primary : styles.secondary}
      disabled={busy || disabled}
      aria-busy={busy}
      onClick={() => onClick()}
    >
      {busy ? busyLabel : label}
    </button>
  )
}
