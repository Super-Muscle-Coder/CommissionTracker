import { EmptyState } from '../EmptyState/EmptyState'
import styles from './ItemList.module.css'

export type ItemListItem = {
  // Stable identity of the item (React key; handed back by onSelect); never shown.
  key: string
  // Text shown for the item (its main line).
  text: string
  // A secondary line under the main one, in a quieter colour; null for none.
  detail: string | null
}

export type ItemListProps = {
  // Accessible name of the list.
  label: string
  // Items, shown in the order given.
  items: readonly ItemListItem[]
  // Shown instead of the list when there is no item.
  emptyText: string
  // null: a read-only list. Otherwise each item is a native button that
  // hands its key back when pressed.
  onSelect: ((key: string) => void) | null
}

// A list of text items, read-only or selectable. With no item, shows EmptyState instead.
export function ItemList({ label, items, emptyText, onSelect }: ItemListProps) {
  if (items.length === 0) return <EmptyState text={emptyText} action={null} />
  return (
    <ul className={styles.list} aria-label={label}>
      {items.map((item) => {
        // The space keeps the two lines apart in the accessible name ("title detail").
        const detail = item.detail === null ? null : <> <span className={styles.detail}>{item.detail}</span></>
        return (
          <li key={item.key} className={styles.item}>
            {onSelect === null ? (
              <span className={styles.text}>
                {item.text}
                {detail}
              </span>
            ) : (
              <button type="button" className={styles.select} onClick={() => onSelect(item.key)}>
                {item.text}
                {detail}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
