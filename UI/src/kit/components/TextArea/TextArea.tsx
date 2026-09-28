import { useEffect, useRef } from 'react'
import styles from './TextArea.module.css'

export type TextAreaProps = {
  // Unique id of the input (ties the label and the error to it).
  id: string
  // Visible label; also the accessible name.
  label: string
  value: string
  onChange: (value: string) => void
  // The error message ready to show, or null when there is none.
  error: string | null
  disabled: boolean
  // Asks for the text cursor (focus): 0 asks nothing; each new non-zero value
  // moves the focus to this field once, as soon as it is not disabled. The
  // caller chooses which field gets a request (for example the first field
  // with an error); the kit only carries it out.
  focusRequest: number
}

// A multi-line text input with its label and, when there is one, its error
// right under it (tied to the input, not only a colour).
export function TextArea({ id, label, value, onChange, error, disabled, focusRequest }: TextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const handled = useRef(0)
  useEffect(() => {
    if (focusRequest === 0 || focusRequest === handled.current || disabled) return
    handled.current = focusRequest
    ref.current?.focus()
  }, [focusRequest, disabled])
  const errorId = `${id}-error`
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        rows={4}
        className={error === null ? styles.input : styles.inputError}
        value={value}
        disabled={disabled}
        aria-invalid={error !== null}
        aria-describedby={error === null ? undefined : errorId}
        onChange={(e) => onChange(e.target.value)}
      />
      {error === null ? null : (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}
