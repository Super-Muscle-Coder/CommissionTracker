import type { ReactNode } from 'react'
import styles from './AppFrame.module.css'

export type AppFrameProps = {
  // Title shown in the header band.
  title: string
  // The fixed navigation region, left of the content (for example a NavMenu).
  nav: ReactNode
  // Content region.
  children: ReactNode
}

// Frame of the whole window: a header band with the title; below it, the
// navigation column and the content region side by side.
export function AppFrame({ title, nav, children }: AppFrameProps) {
  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
      </header>
      <div className={styles.body}>
        <div className={styles.nav}>{nav}</div>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
