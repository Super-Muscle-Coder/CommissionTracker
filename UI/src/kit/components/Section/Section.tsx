import { useId, type ReactNode } from 'react'
import type { Scale } from '../../scale'
import styles from './Section.module.css'

export type SectionProps = {
  // Heading of the section; also its accessible name.
  title: string
  // 'page': the main heading of a page (h2, under the app title h1).
  // 'group': a group inside a page (h3).
  level: 'page' | 'group'
  // Space between the heading and each child, as a name of the space scale.
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

// A titled region: a heading, then its children stacked vertically.
export function Section({ title, level, gap, children }: SectionProps) {
  const headingId = useId()
  const Heading = level === 'page' ? 'h2' : 'h3'
  return (
    <section className={`${styles.section} ${GAP_CLASS[gap]}`} aria-labelledby={headingId}>
      <Heading id={headingId} className={level === 'page' ? styles.pageTitle : styles.groupTitle}>
        {title}
      </Heading>
      {children}
    </section>
  )
}
