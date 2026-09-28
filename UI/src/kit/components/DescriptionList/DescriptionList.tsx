import styles from './DescriptionList.module.css'

export type DescriptionListItem = {
  // Stable identity of the entry (React key); never shown.
  key: string
  // What the entry is (the "label" of "label: value").
  term: string
  // Its value, one line each; at least one line.
  details: readonly string[]
}

export type DescriptionListProps = {
  // Accessible name of the list.
  label: string
  items: readonly DescriptionListItem[]
}

// "label: value" entries on a panel (a native description list).
export function DescriptionList({ label, items }: DescriptionListProps) {
  return (
    <dl className={styles.list} aria-label={label}>
      {items.map((item) => (
        <div key={item.key} className={styles.entry}>
          <dt className={styles.term}>{item.term}</dt>
          {item.details.map((line, i) => (
            <dd key={i} className={styles.detail}>
              {line}
            </dd>
          ))}
        </div>
      ))}
    </dl>
  )
}
