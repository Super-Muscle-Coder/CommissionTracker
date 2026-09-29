import { useEffect, useId, useRef } from 'react'
import styles from './ConfirmPanel.module.css'

export type ConfirmPanelProps = {
  // Short statement of what is asked, e.g. "Xác nhận".
  title: string
  // What happens if the user confirms (the consequence, §7.2 principle 5).
  text: string
  // Text of the button that goes ahead.
  confirmLabel: string
  // Text of the confirm button while the action it started is running.
  confirmBusyLabel: string
  // Text of the button that closes the panel and does nothing.
  cancelLabel: string
  // The action is running: both buttons cannot be pressed, and the confirm
  // button shows confirmBusyLabel.
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

// A question inside the page before an action that cannot be undone — never
// a dialog of the system or of the browser. When it appears, the focus moves
// to the confirm button, so the question is where the user is. Not shown by
// colour alone: it has a title and a text. Its buttons are native buttons,
// drawn like Button (primary, then secondary).
export function ConfirmPanel({ title, text, confirmLabel, confirmBusyLabel, cancelLabel, busy, onConfirm, onCancel }: ConfirmPanelProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const textId = useId()
  // Once, when the panel appears.
  useEffect(() => {
    confirmRef.current?.focus()
  }, [])
  return (
    <section className={styles.panel} role="group" aria-labelledby={titleId} aria-describedby={textId}>
      <p id={titleId} className={styles.title}>
        {title}
      </p>
      <p id={textId} className={styles.text}>
        {text}
      </p>
      <div className={styles.actions}>
        <button ref={confirmRef} type="button" className={styles.confirm} disabled={busy} aria-busy={busy} onClick={() => onConfirm()}>
          {busy ? confirmBusyLabel : confirmLabel}
        </button>
        <button type="button" className={styles.cancel} disabled={busy} onClick={() => onCancel()}>
          {cancelLabel}
        </button>
      </div>
    </section>
  )
}
