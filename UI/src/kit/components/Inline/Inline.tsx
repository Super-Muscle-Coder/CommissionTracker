import type { ReactNode } from 'react'
import type { Scale } from '../../scale'
import styles from './Inline.module.css'

export type InlineProps = {
  // Space between children, as a name of the space scale (--space-<name>).
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

// Lays its children out in a row (for example a group of buttons), wrapping
// when the row is too narrow.
export function Inline({ gap, children }: InlineProps) {
  return <div className={`${styles.inline} ${GAP_CLASS[gap]}`}>{children}</div>
}
