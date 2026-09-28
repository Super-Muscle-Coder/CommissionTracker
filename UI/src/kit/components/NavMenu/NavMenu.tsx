import styles from './NavMenu.module.css'

export type NavMenuItem = {
  // Stable identity of the item; handed back by onSelect, never shown.
  key: string
  // Text of the item.
  text: string
  // The item the user is in now: marked, and announced as the current page.
  current: boolean
}

export type NavMenuProps = {
  // Accessible name of the navigation region.
  label: string
  // Items, shown in the order given (their places never change).
  items: readonly NavMenuItem[]
  onSelect: (key: string) => void
}

// The fixed navigation region of the main frame: one native button per item.
// The current item is marked by a border and a background, not by colour alone.
export function NavMenu({ label, items, onSelect }: NavMenuProps) {
  return (
    <nav className={styles.nav} aria-label={label}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className={item.current ? styles.current : styles.item}
              aria-current={item.current ? 'page' : undefined}
              onClick={() => onSelect(item.key)}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
