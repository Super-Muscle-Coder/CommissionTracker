import { useEffect, useRef } from 'react'
import styles from './TimeField.module.css'

export type TimeFieldProps = {
  // Unique id of the input (ties the label and the error to it).
  id: string
  // Visible label; also the accessible name.
  label: string
  // HH:mm, or '' for none (the value of a native time input).
  value: string
  onChange: (value: string) => void
  // The error message ready to show, or null when there is none.
  error: string | null
  disabled: boolean
  // Asks for the focus: 0 asks nothing; each new non-zero value moves the
  // focus to this field once, as soon as it is not disabled (as TextField).
  focusRequest: number
}

// A native time input (the system's own picker) with its label and, when
// there is one, its error right under it (tied to the input, not only a
// colour). Like DateTimeField, for a time of day alone.
export function TimeField({ id, label, value, onChange, error, disabled, focusRequest }: TimeFieldProps) {
  const ref = useRef<HTMLInputElement>(null)
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
      <input
        ref={ref}
        id={id}
        type="time"
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
