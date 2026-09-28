import styles from './InlineAlert.module.css'

export type InlineAlertProps = {
  // Short statement of what went wrong.
  title: string
  // The message for the user.
  text: string
}

// An error message inside a page (unlike FatalMessage, the rest of the page
// stays usable). Announced as an alert; not shown by colour alone: it has a title.
export function InlineAlert({ title, text }: InlineAlertProps) {
  return (
    <section className={styles.alert} role="alert">
      <p className={styles.title}>{title}</p>
      <p className={styles.text}>{text}</p>
    </section>
  )
}
