import { useEffect, useRef } from 'react'
import styles from './SelectField.module.css'

export type SelectFieldOption = {
  // The value handed back by onChange; never shown.
  value: string
  // Text shown for the option.
  label: string
}

export type SelectFieldProps = {
  // Unique id of the select (ties the label and the error to it).
  id: string
  // Visible label; also the accessible name.
  label: string
  // The chosen value; '' is the placeholder (nothing chosen).
  value: string
  // Options, shown in the order given.
  options: readonly SelectFieldOption[]
  // Text of a first option of value '' meaning "nothing chosen yet"; null for none.
  placeholder: string | null
  onChange: (value: string) => void
  // A fixed line of help under the select, in a quieter colour (tied to the
  // select); null for none.
  hint: string | null
  // The error message ready to show, or null when there is none.
  error: string | null
  disabled: boolean
  // Asks for the focus: 0 asks nothing; each new non-zero value moves the
  // focus to this field once, as soon as it is not disabled (as TextField).
  focusRequest: number
}

// A native select with its label, its line of help when there is one, and,
// when there is one, its error right under it (tied to the select, not only
// a colour).
export function SelectField({ id, label, value, options, placeholder, onChange, hint, error, disabled, focusRequest }: SelectFieldProps) {
  const ref = useRef<HTMLSelectElement>(null)
  const handled = useRef(0)
  useEffect(() => {
    if (focusRequest === 0 || focusRequest === handled.current || disabled) return
    handled.current = focusRequest
    ref.current?.focus()
  }, [focusRequest, disabled])
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [...(hint === null ? [] : [hintId]), ...(error === null ? [] : [errorId])].join(' ')
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        className={error === null ? styles.input : styles.inputError}
        value={value}
        disabled={disabled}
        aria-invalid={error !== null}
        aria-describedby={describedBy === '' ? undefined : describedBy}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder === null ? null : <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint === null ? null : (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error === null ? null : (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}
