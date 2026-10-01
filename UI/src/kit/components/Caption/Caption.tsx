import styles from './Caption.module.css'

export type CaptionProps = {
  // One line of quiet text (a sub-line under a title, a note under a group of
  // numbers). It says something; it is not a message about what happened.
  text: string
}

// A paragraph of secondary text on the page, in the muted text colour and a
// smaller size. Not a heading, not an alert, not a status: it is announced as
// plain text.
export function Caption({ text }: CaptionProps) {
  return <p className={styles.caption}>{text}</p>
}
