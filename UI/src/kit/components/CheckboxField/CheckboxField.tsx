import styles from './CheckboxField.module.css'

export type CheckboxFieldProps = {
  // Unique id of the input (ties the label to it).
  id: string
  // Visible label; also the accessible name.
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
}

// A native checkbox with its label beside it (clicking the label toggles it).
// A choice of yes or no: it has no error of its own, since either answer is valid.
export function CheckboxField({ id, label, checked, onChange, disabled }: CheckboxFieldProps) {
  return (
    <div className={styles.field}>
      <input id={id} type="checkbox" className={styles.input} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
    </div>
  )
}
