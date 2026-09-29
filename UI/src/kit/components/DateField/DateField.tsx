import { useEffect, useRef } from 'react'
import { Button } from '../Button/Button'
import styles from './DateField.module.css'

export type DateFieldProps = {
  // Unique id of the input (ties the label and the error to it).
  id: string
  // Visible label; also the accessible name.
  label: string
  // YYYY-MM-DD, or '' for no date (the value of a native date input).
  value: string
  onChange: (value: string) => void
  // Text of the button that empties the field (native date inputs of
  // Chromium offer no visible way to do it); shown only when there is a date.
  clearLabel: string
  // The error message ready to show, or null when there is none.
  error: string | null
  disabled: boolean
  // Asks for the focus: 0 asks nothing; each new non-zero value moves the
  // focus to this field once, as soon as it is not disabled (as TextField).
  focusRequest: number
}

// A native date input (the system's own date picker) with its label, a button
// to empty it, and, when there is one, its error right under it (tied to the
// input, not only a colour).
export function DateField({ id, label, value, onChange, clearLabel, error, disabled, focusRequest }: DateFieldProps) {
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
      <div className={styles.row}>
        <input
          ref={ref}
          id={id}
          type="date"
          className={error === null ? styles.input : styles.inputError}
          value={value}
          disabled={disabled}
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : errorId}
          onChange={(e) => onChange(e.target.value)}
        />
        {value === '' ? null : <Button label={clearLabel} busyLabel={clearLabel} busy={false} disabled={disabled} variant="secondary" onClick={() => onChange('')} />}
      </div>
      {error === null ? null : (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}
