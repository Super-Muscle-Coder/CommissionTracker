import type { ReactNode } from 'react'
import { AppFrame, NavMenu, Stack } from '../../../kit'
import { NAVIGATION, type Navigate, type PageKey } from '../../navigation'

export type MainLayoutProps = {
  // The top-level page the shown page belongs to (its item is marked).
  current: PageKey
  navigate: Navigate
  // The current page.
  children: ReactNode
}

// Top-level items of the navigation region, generated from the navigation
// table in its order: the entries that have a menu. Their places never
// change between pages (ui_decomposition.md §7.2, principle 7).
const MENU = (Object.keys(NAVIGATION) as PageKey[]).flatMap((key) => {
  const menu = NAVIGATION[key].menu
  return menu === null ? [] : [{ key, ...menu }]
})

// main_layout (.design/ui_decomposition.md §5): the application title, the
// fixed navigation region, and one content region. Built with kit
// components only, no style (R10).
export function MainLayout({ current, navigate, children }: MainLayoutProps) {
  const items = MENU.map((m) => ({ key: m.key, text: m.label, current: m.key === current }))
  const open = (key: string) => {
    const item = MENU.find((m) => m.key === key)
    if (item !== undefined) navigate(item.route, null)
  }
  return (
    <AppFrame title="Commission Tracker" nav={<NavMenu label="Điều hướng chính" items={items} onSelect={open} />}>
      <Stack gap="lg">{children}</Stack>
    </AppFrame>
  )
}
