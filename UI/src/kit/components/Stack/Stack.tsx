import type { ReactNode } from 'react'
import type { Scale } from '../../scale'
import styles from './Stack.module.css'

export type StackProps = {
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

// Stacks its children vertically.
export function Stack({ gap, children }: StackProps) {
  return <div className={`${styles.stack} ${GAP_CLASS[gap]}`}>{children}</div>
}
