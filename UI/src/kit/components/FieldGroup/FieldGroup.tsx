import type { ReactNode } from 'react'
import type { Scale } from '../../scale'
import styles from './FieldGroup.module.css'

export type FieldGroupProps = {
  // Name of the group of fields (a fieldset legend).
  legend: string
  // Space between each child, as a name of the space scale.
  gap: Scale
  children: ReactNode
}

const GAP_CLASS: Record<Scale, string | undefined> = {
  xs: styles.gapXs,
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
  xl: styles.gapXl,
}

// Several related fields under one name (a native fieldset), stacked.
export function FieldGroup({ legend, gap, children }: FieldGroupProps) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={`${styles.body} ${GAP_CLASS[gap]}`}>{children}</div>
    </fieldset>
  )
}
