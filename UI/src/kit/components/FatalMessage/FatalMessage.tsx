import styles from './FatalMessage.module.css'

export type FatalMessageProps = {
  // Short statement of what failed.
  title: string
  // What exactly is wrong, for the person who has to fix it.
  detail: string
}

// Whole-window message for a failure the app cannot continue from (for
// example the startup error screen). Announced to assistive technology as an alert.
export function FatalMessage({ title, detail }: FatalMessageProps) {
  return (
    <div className={styles.page}>
      <section className={styles.panel} role="alert">
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.detail}>{detail}</p>
      </section>
    </div>
  )
}
