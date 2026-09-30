import { Button } from '../Button/Button'
import { EmptyState } from '../EmptyState/EmptyState'
import styles from './ItemList.module.css'

// A secondary action of one item, drawn as a secondary button beside it.
export type ItemListAction = {
  // Text of the button; also its accessible name.
  label: string
  // The action cannot be pressed now (e.g. another one is running).
  disabled: boolean
}

export type ItemListItem = {
  // Stable identity of the item (React key; handed back by onSelect and onAction); never shown.
  key: string
  // Text shown for the item (its main line).
  text: string
  // A secondary line under the main one, in a quieter colour; null for none.
  detail: string | null
  // A button beside the item that acts on it; null for none.
  action: ItemListAction | null
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
  // Handed the key of the item whose action button is pressed; null when no
  // item has an action.
  onAction: ((key: string) => void) | null
}

// A list of text items, read-only or selectable, each with an optional action
// button. With no item, shows EmptyState instead.
export function ItemList({ label, items, emptyText, onSelect, onAction }: ItemListProps) {
  if (items.length === 0) return <EmptyState text={emptyText} action={null} />
  return (
    <ul className={styles.list} aria-label={label}>
      {items.map((item) => {
        // The space keeps the two lines apart in the accessible name ("title detail").
        const detail = item.detail === null ? null : <> <span className={styles.detail}>{item.detail}</span></>
        const action = item.action
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
            {action === null || onAction === null ? null : (
              <div className={styles.action}>
                <Button label={action.label} busyLabel={action.label} busy={false} disabled={action.disabled} variant="secondary" onClick={() => onAction(item.key)} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
